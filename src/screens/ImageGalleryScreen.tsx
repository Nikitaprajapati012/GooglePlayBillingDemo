import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { useUser } from '../context/UserContext';
import { useBilling } from '../context/BillingContext';
import { SAMPLE_GALLERY_IMAGES } from '../config/galleryImages';
import { GalleryFilter, GalleryImage } from '../types/gallery';
import { ImageDownloadService } from '../services/imageDownloadService';
import { StorageService } from '../services/storageService';
import { GoogleSubscriptionState } from '../types/billing';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 48) / 2;

interface ImageGalleryScreenProps {
  onNavigateToStore: () => void;
}

export const ImageGalleryScreen: React.FC<ImageGalleryScreenProps> = ({ onNavigateToStore }) => {
  const {
    isLifetimePremium,
    activeSubscription,
    setLifetimePremiumStatus,
    updateSubscription,
  } = useUser();

  const { simulateScenario } = useBilling();

  const [activeFilter, setActiveFilter] = useState<GalleryFilter>('All');
  const [downloadedIds, setDownloadedIds] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [showPaywallModal, setShowPaywallModal] = useState<boolean>(false);
  const [showIapConceptModal, setShowIapConceptModal] = useState<boolean>(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  // Check user entitlement
  const hasPremiumAccess = useMemo(() => {
    return (
      isLifetimePremium ||
      (activeSubscription?.isActive && activeSubscription.expiryTimestamp > Date.now())
    );
  }, [isLifetimePremium, activeSubscription]);

  // Load downloaded images from storage
  useEffect(() => {
    loadDownloadedList();
  }, []);

  const loadDownloadedList = async () => {
    const list = await StorageService.getDownloadedImages();
    setDownloadedIds(list);
  };

  // Filtered images
  const filteredImages = useMemo(() => {
    switch (activeFilter) {
      case 'Free':
        return SAMPLE_GALLERY_IMAGES.filter(img => !img.isPremium);
      case 'Premium':
        return SAMPLE_GALLERY_IMAGES.filter(img => img.isPremium);
      case 'Downloaded':
        return SAMPLE_GALLERY_IMAGES.filter(img => downloadedIds.includes(img.id));
      default:
        return SAMPLE_GALLERY_IMAGES;
    }
  }, [activeFilter, downloadedIds]);

  // Handle Download Request
  const handleDownloadPress = async (image: GalleryImage) => {
    // Check entitlement first (Zero-Trust)
    const entitlement = ImageDownloadService.checkEntitlement(
      image.isPremium,
      isLifetimePremium,
      activeSubscription
    );

    if (!entitlement.allowed) {
      // User is on Free tier and attempting to download a Premium image
      setShowPaywallModal(true);
      return;
    }

    // Entitled: Initiate download
    setDownloadingId(image.id);
    setDownloadProgress(0.1);

    const result = await ImageDownloadService.downloadImage(image, ratio => {
      setDownloadProgress(ratio);
    });

    setDownloadingId(null);
    setDownloadProgress(0);

    if (result.success) {
      await loadDownloadedList();
      Alert.alert(
        'Download Complete! 🎉',
        result.message,
        [
          { text: 'Great!' },
          {
            text: 'View Full Res',
            onPress: () => ImageDownloadService.openInExternalViewer(image.highResUrl),
          },
        ]
      );
    } else {
      Alert.alert('Download Error', result.message);
    }
  };

  const isDownloaded = (id: string) => downloadedIds.includes(id);

  // Quick IAP State Testing Helpers
  const setTierFree = async () => {
    await setLifetimePremiumStatus(false);
    await updateSubscription(null);
    Alert.alert('IAP State Changed', 'Account reverted to Free tier (Downloads locked for PRO images).');
  };

  const setTierMonthly = async () => {
    await setLifetimePremiumStatus(false);
    await updateSubscription({
      isActive: true,
      planId: 'monthly',
      productId: 'premium_subscription:monthly',
      expiryDate: new Date(Date.now() + 30 * 86400000).toLocaleDateString(),
      expiryTimestamp: Date.now() + 30 * 86400000,
      autoRenewing: true,
      status: GoogleSubscriptionState.SUBSCRIPTION_STATE_ACTIVE,
      purchaseToken: `tok_sim_sub_${Date.now()}`,
    });
    Alert.alert('IAP State Changed', 'Monthly Subscription activated! 4K Downloads unlocked.');
  };

  const setTierLifetime = async () => {
    await setLifetimePremiumStatus(true);
    Alert.alert('IAP State Changed', 'Lifetime Premium activated! Permanent 4K Downloads unlocked.');
  };

  const simulateExpiry = async () => {
    await simulateScenario('EXPIRE');
    Alert.alert('Subscription Expired', 'Subscription has ended. Premium downloads are now re-locked.');
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Gallery Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerTitle}>Image Gallery</Text>
            <View
              style={[
                styles.tierPill,
                hasPremiumAccess ? styles.tierPillActive : styles.tierPillFree,
              ]}>
              <Text
                style={[
                  styles.tierPillText,
                  hasPremiumAccess ? styles.tierPillTextActive : styles.tierPillTextFree,
                ]}>
                {hasPremiumAccess ? '⭐ PRO UNLOCKED' : '🔒 FREE TIER'}
              </Text>
            </View>
          </View>
          <Text style={styles.headerSubtitle}>
            Curated high-resolution wallpapers. Free users can preview all photos and download HD
            free items. Premium subscribers unlock 4K Ultra-HD original downloads.
          </Text>

          {/* IAP Concept & Management Ribbon */}
          <View style={styles.conceptRibbon}>
            <TouchableOpacity
              style={styles.conceptInfoBtn}
              onPress={() => setShowIapConceptModal(true)}>
              <Text style={styles.conceptInfoText}>💡 How In-App Purchase Entitlements Work</Text>
            </TouchableOpacity>

            <View style={styles.quickManagerBar}>
              <Text style={styles.quickManagerLabel}>Test Tier:</Text>
              <TouchableOpacity
                style={[styles.quickTierBtn, !hasPremiumAccess && styles.quickTierBtnActive]}
                onPress={setTierFree}>
                <Text
                  style={[
                    styles.quickTierBtnText,
                    !hasPremiumAccess && styles.quickTierBtnTextActive,
                  ]}>
                  Free
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.quickTierBtn,
                  activeSubscription?.isActive && styles.quickTierBtnActive,
                ]}
                onPress={setTierMonthly}>
                <Text
                  style={[
                    styles.quickTierBtnText,
                    activeSubscription?.isActive && styles.quickTierBtnTextActive,
                  ]}>
                  Monthly
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickTierBtn, isLifetimePremium && styles.quickTierBtnActive]}
                onPress={setTierLifetime}>
                <Text
                  style={[
                    styles.quickTierBtnText,
                    isLifetimePremium && styles.quickTierBtnTextActive,
                  ]}>
                  Lifetime
                </Text>
              </TouchableOpacity>

              {activeSubscription?.isActive && (
                <TouchableOpacity style={styles.quickTierBtnExpire} onPress={simulateExpiry}>
                  <Text style={styles.quickTierBtnTextExpire}>Expire</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterBar}>
          {(['All', 'Free', 'Premium', 'Downloaded'] as GalleryFilter[]).map(filter => {
            const isActive = activeFilter === filter;
            const count =
              filter === 'All'
                ? SAMPLE_GALLERY_IMAGES.length
                : filter === 'Free'
                ? SAMPLE_GALLERY_IMAGES.filter(i => !i.isPremium).length
                : filter === 'Premium'
                ? SAMPLE_GALLERY_IMAGES.filter(i => i.isPremium).length
                : downloadedIds.length;

            return (
              <TouchableOpacity
                key={filter}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setActiveFilter(filter)}>
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {filter} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Grid of Images */}
        <View style={styles.grid}>
          {filteredImages.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📷</Text>
              <Text style={styles.emptyText}>No images found in this filter.</Text>
            </View>
          ) : (
            filteredImages.map(image => {
              const downloaded = isDownloaded(image.id);
              const isCurrentlyDownloading = downloadingId === image.id;
              const hasError = imageErrors[image.id];

              return (
                <View key={image.id} style={styles.card}>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => setSelectedImage(image)}>
                    <View style={styles.imageWrapper}>
                      {!hasError ? (
                        <Image
                          source={{ uri: image.thumbnailUrl }}
                          style={styles.thumbnail}
                          resizeMode="cover"
                          onError={() =>
                            setImageErrors(prev => ({ ...prev, [image.id]: true }))
                          }
                        />
                      ) : (
                        <View style={styles.fallbackGraphic}>
                          <Text style={styles.fallbackIcon}>🖼️</Text>
                          <Text style={styles.fallbackTitle}>{image.title}</Text>
                        </View>
                      )}

                      {/* Badge */}
                      <View
                        style={[
                          styles.badge,
                          image.isPremium ? styles.badgePremium : styles.badgeFree,
                        ]}>
                        <Text
                          style={[
                            styles.badgeText,
                            image.isPremium ? styles.badgeTextPremium : styles.badgeTextFree,
                          ]}>
                          {image.isPremium ? '⭐ 4K PRO' : 'FREE HD'}
                        </Text>
                      </View>

                      {downloaded && (
                        <View style={styles.downloadedTag}>
                          <Text style={styles.downloadedTagText}>✓ SAVED</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>

                  {/* Card Content */}
                  <View style={styles.cardInfo}>
                    <Text style={styles.imageTitle} numberOfLines={1}>
                      {image.title}
                    </Text>
                    <Text style={styles.imageMeta}>
                      {image.category} • {image.fileSize}
                    </Text>

                    {/* Quick Download / Unlock Action Button */}
                    <TouchableOpacity
                      style={[
                        styles.downloadBtn,
                        downloaded && styles.downloadBtnDone,
                        image.isPremium && !hasPremiumAccess && styles.downloadBtnLocked,
                      ]}
                      onPress={() => handleDownloadPress(image)}
                      disabled={isCurrentlyDownloading}>
                      {isCurrentlyDownloading ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : downloaded ? (
                        <Text style={styles.downloadBtnTextDone}>✓ Downloaded</Text>
                      ) : image.isPremium && !hasPremiumAccess ? (
                        <Text style={styles.downloadBtnTextLocked}>🔒 Unlock (PRO)</Text>
                      ) : (
                        <Text style={styles.downloadBtnText}>⬇ Download</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* MODAL 1: Full-Screen Image Preview Modal */}
      {selectedImage && (
        <Modal
          visible={Boolean(selectedImage)}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedImage(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Image
                source={{ uri: selectedImage.highResUrl }}
                style={styles.modalImage}
                resizeMode="cover"
              />

              <View style={styles.modalInfoPanel}>
                <View style={styles.modalHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle}>{selectedImage.title}</Text>
                    <Text style={styles.modalAuthor}>By {selectedImage.author}</Text>
                  </View>
                  <View
                    style={[
                      styles.badge,
                      selectedImage.isPremium ? styles.badgePremium : styles.badgeFree,
                    ]}>
                    <Text
                      style={[
                        styles.badgeText,
                        selectedImage.isPremium ? styles.badgeTextPremium : styles.badgeTextFree,
                      ]}>
                      {selectedImage.isPremium ? '⭐ 4K PRO' : 'FREE HD'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.modalDescription}>{selectedImage.description}</Text>

                <View style={styles.specsRow}>
                  <View style={styles.specBox}>
                    <Text style={styles.specLabel}>Resolution</Text>
                    <Text style={styles.specValue}>{selectedImage.resolution}</Text>
                  </View>
                  <View style={styles.specBox}>
                    <Text style={styles.specLabel}>File Size</Text>
                    <Text style={styles.specValue}>{selectedImage.fileSize}</Text>
                  </View>
                  <View style={styles.specBox}>
                    <Text style={styles.specLabel}>Category</Text>
                    <Text style={styles.specValue}>{selectedImage.category}</Text>
                  </View>
                </View>

                {/* Download Progress Bar if active */}
                {downloadingId === selectedImage.id && (
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBarBg}>
                      <View
                        style={[
                          styles.progressBarFill,
                          { width: `${Math.round(downloadProgress * 100)}%` },
                        ]}
                      />
                    </View>
                    <Text style={styles.progressLabel}>
                      Downloading high-resolution file... {Math.round(downloadProgress * 100)}%
                    </Text>
                  </View>
                )}

                {/* Modal Action Buttons */}
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[
                      styles.modalDownloadBtn,
                      selectedImage.isPremium && !hasPremiumAccess && styles.modalDownloadBtnLocked,
                    ]}
                    onPress={() => handleDownloadPress(selectedImage)}
                    disabled={downloadingId === selectedImage.id}>
                    {downloadingId === selectedImage.id ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : isDownloaded(selectedImage.id) ? (
                      <Text style={styles.modalDownloadBtnText}>✓ Downloaded (Save Again)</Text>
                    ) : selectedImage.isPremium && !hasPremiumAccess ? (
                      <Text style={styles.modalDownloadBtnTextLocked}>
                        ⭐ Unlock 4K Download (PRO)
                      </Text>
                    ) : (
                      <Text style={styles.modalDownloadBtnText}>
                        ⬇ Download {selectedImage.isPremium ? '4K Ultra-HD' : 'Free HD'}
                      </Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.modalCloseBtn}
                    onPress={() => setSelectedImage(null)}>
                    <Text style={styles.modalCloseBtnText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* MODAL 2: Premium Paywall Upsell Bottom Sheet Modal */}
      <Modal
        visible={showPaywallModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPaywallModal(false)}>
        <View style={styles.paywallOverlay}>
          <View style={styles.paywallCard}>
            <View style={styles.paywallIconCircle}>
              <Text style={styles.paywallIcon}>⭐</Text>
            </View>

            <Text style={styles.paywallTitle}>Premium Photo Entitlement</Text>
            <Text style={styles.paywallSubtitle}>
              4K Ultra-HD original downloads are exclusive to our Monthly, Yearly, and Lifetime
              Premium subscribers.
            </Text>

            <View style={styles.paywallBenefitList}>
              <View style={styles.benefitRow}>
                <Text style={styles.benefitCheck}>✓</Text>
                <Text style={styles.benefitText}>
                  Unlimited 4K UHD Original Wallpaper Downloads
                </Text>
              </View>
              <View style={styles.benefitRow}>
                <Text style={styles.benefitCheck}>✓</Text>
                <Text style={styles.benefitText}>
                  Commercial-grade photography license & zero watermarks
                </Text>
              </View>
              <View style={styles.benefitRow}>
                <Text style={styles.benefitCheck}>✓</Text>
                <Text style={styles.benefitText}>
                  Permanent access with Lifetime plan or flexible subscriptions
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.paywallUpgradeBtn}
              onPress={() => {
                setShowPaywallModal(false);
                setSelectedImage(null);
                onNavigateToStore();
              }}>
              <Text style={styles.paywallUpgradeBtnText}>View Premium Plans in Store ➔</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.paywallDismissBtn}
              onPress={() => setShowPaywallModal(false)}>
              <Text style={styles.paywallDismissBtnText}>Maybe Later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 3: In-App Purchase Concept & Architecture Guide */}
      <Modal
        visible={showIapConceptModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowIapConceptModal(false)}>
        <View style={styles.paywallOverlay}>
          <View style={[styles.paywallCard, { maxHeight: '85%' }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.iapGuideTitle}>📱 Google Play Billing Concepts</Text>
              <Text style={styles.iapGuideIntro}>
                How In-App Purchases, Entitlements, and Backend Verification operate:
              </Text>

              {/* Concept 1 */}
              <View style={styles.iapConceptCard}>
                <Text style={styles.iapConceptHeading}>1. Consumable Products (Credits)</Text>
                <Text style={styles.iapConceptDesc}>
                  • Repeatable purchases (100, 500, 1000 credits).
                  {'\n'}• Flow: requestPurchase() ➔ Backend Verification ➔ consumePurchaseAndroid()
                  ➔ Balance increments.
                  {'\n'}• Consuming clears the purchase token so users can buy again.
                </Text>
              </View>

              {/* Concept 2 */}
              <View style={styles.iapConceptCard}>
                <Text style={styles.iapConceptHeading}>2. Non-Consumable (Lifetime Premium)</Text>
                <Text style={styles.iapConceptDesc}>
                  • Purchased once. Permanent unlock across devices.
                  {'\n'}• Flow: requestPurchase() ➔ Backend Verification ➔ acknowledgePurchaseAndroid()
                  ➔ Permanent PRO entitlement.
                  {'\n'}• Restored across app re-installs and Google account switches.
                </Text>
              </View>

              {/* Concept 3 */}
              <View style={styles.iapConceptCard}>
                <Text style={styles.iapConceptHeading}>3. Subscriptions (Monthly & Yearly)</Text>
                <Text style={styles.iapConceptDesc}>
                  • Auto-renewing plans (Subscriptions v2 API).
                  {'\n'}• Flow: requestSubscription() ➔ Backend Verification ➔ acknowledgePurchaseAndroid()
                  ➔ Subscriptions v2 state ACTIVE.
                  {'\n'}• Access active until expiry. Supports proration, cancellation, and grace periods.
                </Text>
              </View>

              {/* Concept 4 */}
              <View style={styles.iapConceptCard}>
                <Text style={styles.iapConceptHeading}>4. Feature Entitlements (Zero-Trust)</Text>
                <Text style={styles.iapConceptDesc}>
                  • Image downloads are an entitlement, not a separate SKU.
                  {'\n'}• Free users preview all photos and download free HD items.
                  {'\n'}• 4K downloads require active subscription or lifetime unlock.
                  {'\n'}• Access revokes automatically if a subscription expires or is refunded.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.paywallUpgradeBtn}
                onPress={() => setShowIapConceptModal(false)}>
                <Text style={styles.paywallUpgradeBtnText}>Got it, Close Guide</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1F1F1F',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#5F6368',
    lineHeight: 18,
  },
  tierPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tierPillActive: {
    backgroundColor: '#FEF7E0',
    borderWidth: 1,
    borderColor: '#F9AB00',
  },
  tierPillFree: {
    backgroundColor: '#E8EAED',
  },
  tierPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  tierPillTextActive: {
    color: '#B06000',
  },
  tierPillTextFree: {
    color: '#5F6368',
  },
  conceptRibbon: {
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  conceptInfoBtn: {
    paddingVertical: 4,
    marginBottom: 8,
  },
  conceptInfoText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0B57D0',
  },
  quickManagerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  quickManagerLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  quickTierBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  quickTierBtnActive: {
    backgroundColor: '#0B57D0',
    borderColor: '#0B57D0',
  },
  quickTierBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  quickTierBtnTextActive: {
    color: '#FFFFFF',
  },
  quickTierBtnExpire: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  quickTierBtnTextExpire: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  filterBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DADCE0',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#0B57D0',
    borderColor: '#0B57D0',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#444746',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    marginTop: 6,
  },
  card: {
    width: COLUMN_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E0E2E6',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  imageWrapper: {
    width: '100%',
    height: 140,
    position: 'relative',
    backgroundColor: '#1E293B',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  fallbackGraphic: {
    width: '100%',
    height: '100%',
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  fallbackIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  fallbackTitle: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
  },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgePremium: {
    backgroundColor: 'rgba(25, 28, 30, 0.85)',
    borderWidth: 1,
    borderColor: '#F9AB00',
  },
  badgeFree: {
    backgroundColor: 'rgba(25, 28, 30, 0.75)',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  badgeTextPremium: {
    color: '#FFD700',
  },
  badgeTextFree: {
    color: '#FFFFFF',
  },
  downloadedTag: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#1E8E3E',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  downloadedTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cardInfo: {
    padding: 10,
  },
  imageTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F1F1F',
    marginBottom: 2,
  },
  imageMeta: {
    fontSize: 11,
    color: '#747775',
    marginBottom: 8,
  },
  downloadBtn: {
    backgroundColor: '#0B57D0',
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadBtnDone: {
    backgroundColor: '#E6F4EA',
    borderWidth: 1,
    borderColor: '#34A853',
  },
  downloadBtnLocked: {
    backgroundColor: '#FFF0D4',
    borderWidth: 1,
    borderColor: '#F9AB00',
  },
  downloadBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  downloadBtnTextDone: {
    color: '#137333',
    fontSize: 11,
    fontWeight: '700',
  },
  downloadBtnTextLocked: {
    color: '#B06000',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyContainer: {
    width: '100%',
    padding: 40,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    color: '#747775',
  },
  // Modal 1: Preview
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    maxHeight: '90%',
  },
  modalImage: {
    width: '100%',
    height: 250,
  },
  modalInfoPanel: {
    padding: 18,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F1F1F',
  },
  modalAuthor: {
    fontSize: 13,
    color: '#5F6368',
  },
  modalDescription: {
    fontSize: 13,
    color: '#444746',
    lineHeight: 18,
    marginBottom: 14,
  },
  specsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    backgroundColor: '#F1F3F4',
    padding: 10,
    borderRadius: 8,
  },
  specBox: {
    alignItems: 'center',
  },
  specLabel: {
    fontSize: 10,
    color: '#5F6368',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  specValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1F1F1F',
  },
  progressContainer: {
    marginBottom: 14,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#E0E2E6',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#0B57D0',
  },
  progressLabel: {
    fontSize: 11,
    color: '#0B57D0',
    fontWeight: '600',
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modalDownloadBtn: {
    flex: 2,
    backgroundColor: '#0B57D0',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDownloadBtnLocked: {
    backgroundColor: '#FFF0D4',
    borderWidth: 1,
    borderColor: '#F9AB00',
  },
  modalDownloadBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  modalDownloadBtnTextLocked: {
    color: '#B06000',
    fontWeight: '700',
    fontSize: 13,
  },
  modalCloseBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseBtnText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 13,
  },
  // Modal 2: Paywall
  paywallOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  paywallCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  paywallIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FEF7E0',
    borderWidth: 2,
    borderColor: '#F9AB00',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  paywallIcon: {
    fontSize: 28,
  },
  paywallTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1F1F1F',
    marginBottom: 8,
    textAlign: 'center',
  },
  paywallSubtitle: {
    fontSize: 13,
    color: '#5F6368',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  paywallBenefitList: {
    width: '100%',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    gap: 10,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  benefitCheck: {
    color: '#1E8E3E',
    fontWeight: '800',
    marginRight: 8,
    fontSize: 14,
  },
  benefitText: {
    fontSize: 13,
    color: '#1F1F1F',
    fontWeight: '500',
    flex: 1,
  },
  paywallUpgradeBtn: {
    width: '100%',
    backgroundColor: '#0B57D0',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  paywallUpgradeBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  paywallDismissBtn: {
    paddingVertical: 8,
  },
  paywallDismissBtnText: {
    color: '#5F6368',
    fontSize: 13,
    fontWeight: '600',
  },
  // Modal 3: IAP Guide
  iapGuideTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
  },
  iapGuideIntro: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
    textAlign: 'center',
  },
  iapConceptCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  iapConceptHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
  },
  iapConceptDesc: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
});
