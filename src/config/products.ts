import { ProductCatalogItem } from '../types/billing';

export const APP_PACKAGE_NAME = 'com.playbillingdemo';

/**
 * Product SKUs for Google Play Console In-App Products
 * Matching manager's specification:
 * Consumables: credits_100, credits_500, credits_1000
 * Non-consumable: lifetime_premium (aliased with premium_lifetime for backwards compatibility)
 */
export const CONSUMABLE_PRODUCT_SKUS = [
  'credits_100',
  'credits_500',
  'credits_1000',
] as const;

export const NON_CONSUMABLE_PRODUCT_SKUS = [
  'lifetime_premium',
  'premium_lifetime',
] as const;

/**
 * Subscription Product ID and Base Plan IDs for Google Play Console Subscriptions
 * Supports both standard base plan IDs: 'monthly' and 'yearly', as well as 'monthly-plan' / 'yearly-plan'
 */
export const SUBSCRIPTION_SKUS = [
  'premium_subscription',
] as const;

export const SUBSCRIPTION_BASE_PLAN_IDS = {
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
  MONTHLY_ALT: 'monthly-plan',
  YEARLY_ALT: 'yearly-plan',
} as const;

/**
 * Catalog Metadata with fallback display values (used when offline or before Play Store fetch)
 */
export const PRODUCT_CATALOG: ProductCatalogItem[] = [
  {
    productId: 'credits_100',
    type: 'inapp',
    category: 'consumable',
    title: '100 Credits',
    description: 'Instant pack of 100 in-app credits. Can be purchased repeatedly.',
    defaultPrice: '₹49',
    creditsAwarded: 100,
  },
  {
    productId: 'credits_500',
    type: 'inapp',
    category: 'consumable',
    title: '500 Credits',
    description: 'Popular pack of 500 in-app credits with bonus value.',
    defaultPrice: '₹199',
    creditsAwarded: 500,
  },
  {
    productId: 'credits_1000',
    type: 'inapp',
    category: 'consumable',
    title: '1000 Credits',
    description: 'Mega value pack of 1000 in-app credits.',
    defaultPrice: '₹349',
    creditsAwarded: 1000,
  },
  {
    productId: 'lifetime_premium',
    type: 'inapp',
    category: 'non_consumable',
    title: 'Lifetime Premium',
    description: 'Unlock all features permanently. One-time purchase, restored anytime.',
    defaultPrice: '₹999',
  },
  {
    productId: 'premium_subscription:monthly',
    type: 'subs',
    category: 'subscription',
    title: 'Monthly Premium',
    description: 'Full premium access billed monthly. Cancel anytime via Google Play.',
    defaultPrice: '₹199/month',
    subscriptionPeriod: 'monthly',
  },
  {
    productId: 'premium_subscription:yearly',
    type: 'subs',
    category: 'subscription',
    title: 'Yearly Premium',
    description: 'Best value! Full premium access billed annually. Save ~37%.',
    defaultPrice: '₹1,499/year',
    subscriptionPeriod: 'yearly',
  },
];
