import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { useUser } from '../context/UserContext';
import { useBilling } from '../context/BillingContext';

interface HomeScreenProps {
  onNavigateToStore: () => void;
  onNavigateToHistory: () => void;
  onNavigateToGallery?: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onNavigateToStore,
  onNavigateToHistory,
  onNavigateToGallery,
}) => {
  const {
    credits,
    isLifetimePremium,
    activeSubscription,
    spendCredits,
    resetAccount,
  } = useUser();

  const {
    restorePurchases,
    simulateScenario,
    isSandboxSimulatorActive,
    setSandboxSimulatorActive,
    isLoading,
  } = useBilling();

  const [spending, setSpending] = useState(false);

  const handleSpendCredits = async () => {
    if (credits < 50) {
      Alert.alert(
        'Insufficient Credits',
        'You need at least 50 credits. Go to the Store to purchase a credits pack!'
      );
      return;
    }

    setSpending(true);
    const success = await spendCredits(50);
    setSpending(false);

    if (success) {
      Alert.alert('Credits Spent!', 'Successfully consumed 50 credits in-app.');
    }
  };

  const handleReset = () => {
    Alert.alert(
      'Reset Demo Data',
      'This will clear local credits, premium access, and purchase history for testing fresh installs.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: resetAccount },
      ]
    );
  };

  const hasAnyPremium = isLifetimePremium || activeSubscription?.isActive;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerSubtitle}>Google Play Billing Demo</Text>
        <Text style={styles.headerTitle}>Account Overview</Text>
      </View>

      {/* Credit Balance Card */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>AVAILABLE CREDITS</Text>
        <Text style={styles.balanceValue}>{credits.toLocaleString()}</Text>
        <Text style={styles.balanceSubtext}>
          Consumable balance. Replenished via in-app purchases.
        </Text>

        <View style={styles.cardActionRow}>
          <TouchableOpacity
            style={[styles.smallBtn, credits < 50 && styles.disabledBtn]}
            onPress={handleSpendCredits}
            disabled={spending || credits < 50}>
            {spending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.smallBtnText}>Spend 50 Credits</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.smallBtn, styles.primarySmallBtn]}
            onPress={onNavigateToStore}>
            <Text style={styles.smallBtnText}>+ Buy Credits</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Membership & Subscription Status */}
      <View style={styles.statusSection}>
        <Text style={styles.sectionTitle}>Membership Status</Text>

        {/* Lifetime Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View>
              <Text style={styles.statusCardTitle}>Lifetime Premium</Text>
              <Text style={styles.statusCardDesc}>Non-consumable one-time unlock</Text>
            </View>
            <View
              style={[
                styles.badge,
                isLifetimePremium ? styles.badgeActive : styles.badgeInactive,
              ]}>
              <Text
                style={[
                  styles.badgeText,
                  isLifetimePremium ? styles.badgeTextActive : styles.badgeTextInactive,
                ]}>
                {isLifetimePremium ? 'ACTIVE' : 'LOCKED'}
              </Text>
            </View>
          </View>
        </View>

        {/* Subscription Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View>
              <Text style={styles.statusCardTitle}>Subscription Tier</Text>
              <Text style={styles.statusCardDesc}>
                {activeSubscription?.isActive
                  ? `${activeSubscription.planId === 'yearly' ? 'Yearly' : 'Monthly'} Plan (Renews ${activeSubscription.expiryDate})`
                  : 'No active recurring subscription'}
              </Text>
            </View>
            <View
              style={[
                styles.badge,
                activeSubscription?.isActive ? styles.badgeActive : styles.badgeInactive,
              ]}>
              <Text
                style={[
                  styles.badgeText,
                  activeSubscription?.isActive ? styles.badgeTextActive : styles.badgeTextInactive,
                ]}>
                {activeSubscription?.isActive ? 'ACTIVE' : 'INACTIVE'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Featured: Image Gallery Showcase */}
      <View style={styles.galleryFeatureCard}>
        <View style={styles.galleryCardHeader}>
          <Text style={styles.galleryCardIcon}>🖼️</Text>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.galleryCardTitle}>Premium Image Gallery</Text>
            <Text style={styles.galleryCardSubtitle}>
              {hasAnyPremium
                ? '⭐ PRO Unlocked: Unlimited 4K Ultra-HD Downloads'
                : '🔒 Free Tier: Upgrade to unlock 4K Ultra-HD Downloads'}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.galleryCardBtn}
          onPress={onNavigateToGallery}>
          <Text style={styles.galleryCardBtnText}>Explore Gallery & Wallpapers ➔</Text>
        </TouchableOpacity>
      </View>

      {/* Navigation Shortcuts */}
      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity style={styles.primaryButton} onPress={onNavigateToStore}>
          <Text style={styles.primaryButtonText}>Visit Store</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={onNavigateToHistory}>
          <Text style={styles.secondaryButtonText}>Purchase History</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.outlineButton}
          onPress={restorePurchases}
          disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator color="#0B57D0" size="small" />
          ) : (
            <Text style={styles.outlineButtonText}>Restore Purchases</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Sandbox Evaluation Controls */}
      <View style={styles.evaluatorSection}>
        <View style={styles.evaluatorHeader}>
          <Text style={styles.evaluatorTitle}>Sandbox Testing Controls</Text>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Simulated Mode</Text>
            <Switch
              value={isSandboxSimulatorActive}
              onValueChange={setSandboxSimulatorActive}
              trackColor={{ false: '#ccc', true: '#0B57D0' }}
            />
          </View>
        </View>
        <Text style={styles.evaluatorSubtitle}>
          Test any of the 13 required scenarios instantly:
        </Text>

        <View style={styles.scenarioGrid}>
          <TouchableOpacity
            style={styles.scenarioBtn}
            onPress={() => simulateScenario('PENDING')}>
            <Text style={styles.scenarioBtnText}>Slow Card (Pending)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.scenarioBtn}
            onPress={() => simulateScenario('CANCEL')}>
            <Text style={styles.scenarioBtnText}>User Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.scenarioBtn}
            onPress={() => simulateScenario('FAIL')}>
            <Text style={styles.scenarioBtnText}>Payment Decline</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.scenarioBtn}
            onPress={() => simulateScenario('RENEW')}>
            <Text style={styles.scenarioBtnText}>Auto-Renewal</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.scenarioBtn}
            onPress={() => simulateScenario('EXPIRE')}>
            <Text style={styles.scenarioBtnText}>Sub Expiry</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.scenarioBtn}
            onPress={() => simulateScenario('REVOKE')}>
            <Text style={styles.scenarioBtnText}>Refund / Revoke</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
          <Text style={styles.resetBtnText}>Clear Local App Data & Fresh Install</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  content: {
    padding: 18,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 16,
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0B57D0',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1F1F1F',
    marginTop: 2,
  },
  balanceCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 22,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  balanceLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 1,
  },
  balanceValue: {
    fontSize: 44,
    fontWeight: '800',
    color: '#FFFFFF',
    marginVertical: 4,
  },
  balanceSubtext: {
    fontSize: 13,
    color: '#CBD5E1',
    marginBottom: 16,
  },
  cardActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  smallBtn: {
    backgroundColor: '#334155',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primarySmallBtn: {
    backgroundColor: '#2563EB',
  },
  disabledBtn: {
    opacity: 0.5,
  },
  smallBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  statusSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F1F1F',
    marginBottom: 12,
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  statusCardDesc: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    maxWidth: 220,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeActive: {
    backgroundColor: '#DCFCE7',
  },
  badgeInactive: {
    backgroundColor: '#F1F5F9',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  badgeTextActive: {
    color: '#166534',
  },
  badgeTextInactive: {
    color: '#64748B',
  },
  actionButtonsContainer: {
    gap: 10,
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: '#0B57D0',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  secondaryButtonText: {
    color: '#334155',
    fontSize: 15,
    fontWeight: '600',
  },
  outlineButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  outlineButtonText: {
    color: '#0B57D0',
    fontSize: 14,
    fontWeight: '600',
  },
  evaluatorSection: {
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  evaluatorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  evaluatorTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  switchLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1E40AF',
  },
  evaluatorSubtitle: {
    fontSize: 12,
    color: '#3B82F6',
    marginBottom: 12,
  },
  scenarioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  scenarioBtn: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#93C5FD',
  },
  scenarioBtnText: {
    fontSize: 12,
    color: '#1D4ED8',
    fontWeight: '600',
  },
  resetBtn: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  resetBtnText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '600',
  },
  galleryFeatureCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E0E2E6',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  galleryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  galleryCardIcon: {
    fontSize: 28,
  },
  galleryCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F1F1F',
  },
  galleryCardSubtitle: {
    fontSize: 12,
    color: '#5F6368',
    marginTop: 2,
  },
  galleryCardBtn: {
    backgroundColor: '#0B57D0',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  galleryCardBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
