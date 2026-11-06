import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useBilling } from '../context/BillingContext';
import { useUser } from '../context/UserContext';

export const StoreScreen: React.FC = () => {
  const {
    products,
    purchaseInProgress,
    buyConsumable,
    buyLifetimePremium,
    subscribePlan,
  } = useBilling();

  const { isLifetimePremium, activeSubscription } = useUser();
  const [activeBuyingId, setActiveBuyingId] = useState<string | null>(null);

  const handleBuyConsumable = async (productId: string) => {
    setActiveBuyingId(productId);
    await buyConsumable(productId);
    setActiveBuyingId(null);
  };

  const handleBuyLifetime = async () => {
    if (isLifetimePremium) {
      Alert.alert('Already Owned', 'You already own Lifetime Premium on this Google account.');
      return;
    }
    setActiveBuyingId('premium_lifetime');
    await buyLifetimePremium();
    setActiveBuyingId(null);
  };

  const handleSubscribe = async (planId: 'monthly' | 'yearly') => {
    const isCurrentPlan = activeSubscription?.isActive && activeSubscription.planId === planId;
    if (isCurrentPlan) {
      Alert.alert('Current Plan', `You are already subscribed to the ${planId} plan.`);
      return;
    }

    const isUpgradeDowngrade = Boolean(activeSubscription?.isActive && activeSubscription.planId !== planId);
    setActiveBuyingId(`sub_${planId}`);
    await subscribePlan(planId, isUpgradeDowngrade);
    setActiveBuyingId(null);
  };

  // Filter products
  const consumables = products.filter(p => p.category === 'consumable');
  const lifetime = products.find(p => p.category === 'non_consumable');
  const subs = products.filter(p => p.category === 'subscription');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Digital Store</Text>
        <Text style={styles.headerSubtitle}>
          Google Play Billing sandbox products. All prices fetched from Play Store.
        </Text>
      </View>

      {/* SECTION 1: CONSUMABLE CREDITS */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>1. Consumable Credits</Text>
          <Text style={styles.sectionTag}>Repeatable</Text>
        </View>
        <Text style={styles.sectionDescription}>
          Credits are immediately consumed upon backend verification so you can purchase repeatedly.
        </Text>

        <View style={styles.grid}>
          {consumables.map(item => {
            const isBuying = activeBuyingId === item.productId && purchaseInProgress;
            return (
              <View key={item.productId} style={styles.productCard}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardPrice}>{item.defaultPrice}</Text>
                </View>
                <Text style={styles.cardDescription}>{item.description}</Text>

                <TouchableOpacity
                  style={[styles.buyBtn, isBuying && styles.btnDisabled]}
                  onPress={() => handleBuyConsumable(item.productId)}
                  disabled={purchaseInProgress}>
                  {isBuying ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.buyBtnText}>Purchase</Text>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </View>

      {/* SECTION 2: NON-CONSUMABLE LIFETIME */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>2. Non-Consumable Premium</Text>
          <Text style={styles.sectionTag}>Buy Once</Text>
        </View>
        <Text style={styles.sectionDescription}>
          Permanent unlock. Acknowledged and restored across devices or reinstallation.
        </Text>

        {lifetime && (
          <View style={[styles.productCard, styles.featuredCard]}>
            <View style={styles.cardTop}>
              <View>
                <Text style={styles.featuredTitle}>{lifetime.title}</Text>
                <Text style={styles.featuredSubtitle}>One-time payment</Text>
              </View>
              <Text style={styles.featuredPrice}>{lifetime.defaultPrice}</Text>
            </View>
            <Text style={styles.cardDescription}>{lifetime.description}</Text>
            <View style={styles.perksList}>
              <Text style={styles.perkItem}>✓ Unlimited 4K Ultra-HD Image Downloads</Text>
              <Text style={styles.perkItem}>✓ Permanent Lifetime Access Across All Devices</Text>
              <Text style={styles.perkItem}>✓ Zero Ads & Premium Priority Processing</Text>
            </View>

            <TouchableOpacity
              style={[
                styles.buyBtn,
                styles.featuredBuyBtn,
                isLifetimePremium && styles.ownedBtn,
                activeBuyingId === 'premium_lifetime' && styles.btnDisabled,
              ]}
              onPress={handleBuyLifetime}
              disabled={isLifetimePremium || purchaseInProgress}>
              {activeBuyingId === 'premium_lifetime' && purchaseInProgress ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.buyBtnText}>
                  {isLifetimePremium ? 'Already Owned' : 'Unlock Lifetime'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* SECTION 3: SUBSCRIPTION PLANS */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>3. Subscriptions</Text>
          <Text style={styles.sectionTag}>Auto-Renewing</Text>
        </View>
        <Text style={styles.sectionDescription}>
          Recurring Google Play subscriptions. Supports upgrade, downgrade, proration, and cancellation.
        </Text>

        <View style={styles.subsContainer}>
          {subs.map(sub => {
            const planKey = sub.productId.includes('yearly') ? 'yearly' : 'monthly';
            const isCurrentActive =
              activeSubscription?.isActive && activeSubscription.planId === planKey;
            const isBuying = activeBuyingId === `sub_${planKey}` && purchaseInProgress;

            return (
              <View
                key={sub.productId}
                style={[styles.subCard, isCurrentActive && styles.subCardActive]}>
                <View style={styles.cardTop}>
                  <View>
                    <Text style={styles.cardTitle}>{sub.title}</Text>
                    {isCurrentActive && (
                      <Text style={styles.currentPlanLabel}>CURRENT PLAN</Text>
                    )}
                  </View>
                  <Text style={styles.cardPrice}>{sub.defaultPrice}</Text>
                </View>

                <Text style={styles.cardDescription}>{sub.description}</Text>
                <View style={styles.perksList}>
                  <Text style={styles.perkItem}>
                    {planKey === 'yearly'
                      ? '✓ Unlimited 4K Ultra-HD Image Downloads (Save ~37%)'
                      : '✓ Unlimited 4K Ultra-HD Image Downloads'}
                  </Text>
                  <Text style={styles.perkItem}>✓ Instant Entitlement Verification</Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.buyBtn,
                    isCurrentActive && styles.ownedBtn,
                    isBuying && styles.btnDisabled,
                  ]}
                  onPress={() => handleSubscribe(planKey)}
                  disabled={isCurrentActive || purchaseInProgress}>
                  {isBuying ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.buyBtnText}>
                      {isCurrentActive
                        ? 'Active Plan'
                        : activeSubscription?.isActive
                        ? `Switch to ${planKey === 'yearly' ? 'Yearly' : 'Monthly'}`
                        : 'Subscribe'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
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
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
  },
  section: {
    marginBottom: 26,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E293B',
  },
  sectionTag: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0B57D0',
    backgroundColor: '#E0EAFF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sectionDescription: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 12,
  },
  grid: {
    gap: 12,
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  featuredCard: {
    borderColor: '#FCD34D',
    backgroundColor: '#FFFBEB',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardPrice: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0B57D0',
  },
  featuredTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#92400E',
  },
  featuredSubtitle: {
    fontSize: 12,
    color: '#B45309',
  },
  featuredPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: '#B45309',
  },
  cardDescription: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 14,
    lineHeight: 18,
  },
  buyBtn: {
    backgroundColor: '#0B57D0',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  featuredBuyBtn: {
    backgroundColor: '#D97706',
  },
  ownedBtn: {
    backgroundColor: '#94A3B8',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  buyBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  subsContainer: {
    gap: 12,
  },
  subCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  subCardActive: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  currentPlanLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  perksList: {
    marginBottom: 14,
    gap: 4,
  },
  perkItem: {
    fontSize: 12,
    color: '#0B57D0',
    fontWeight: '600',
  },
});
