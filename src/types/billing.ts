/**
 * Google Play Billing & Domain Types
 */

export type ProductType = 'inapp' | 'subs';

export type PurchaseTypeCategory = 'consumable' | 'non_consumable' | 'subscription';

export interface ProductCatalogItem {
  productId: string;
  type: ProductType;
  category: PurchaseTypeCategory;
  title: string;
  description: string;
  defaultPrice: string;
  creditsAwarded?: number;
  subscriptionPeriod?: 'monthly' | 'yearly';
}

/**
 * Google Play Purchase State mapping
 * 0: UNSPECIFIED_STATE / PURCHASED
 * 1: CANCELED
 * 2: PENDING
 */
export enum GooglePurchaseState {
  PURCHASED = 0,
  CANCELED = 1,
  PENDING = 2,
}

/**
 * Google Play Consumption & Acknowledgment State
 */
export enum GoogleConsumptionState {
  NOT_YET_CONSUMED = 0,
  CONSUMED = 1,
}

export enum GoogleAcknowledgementState {
  NOT_YET_ACKNOWLEDGED = 0,
  ACKNOWLEDGED = 1,
}

/**
 * Google Play Subscription States (Subscriptions v2 API)
 */
export enum GoogleSubscriptionState {
  SUBSCRIPTION_STATE_PENDING = 'SUBSCRIPTION_STATE_PENDING',
  SUBSCRIPTION_STATE_ACTIVE = 'SUBSCRIPTION_STATE_ACTIVE',
  SUBSCRIPTION_STATE_PAUSED = 'SUBSCRIPTION_STATE_PAUSED',
  SUBSCRIPTION_STATE_IN_GRACE_PERIOD = 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD',
  SUBSCRIPTION_STATE_ON_HOLD = 'SUBSCRIPTION_STATE_ON_HOLD',
  SUBSCRIPTION_STATE_CANCELED = 'SUBSCRIPTION_STATE_CANCELED',
  SUBSCRIPTION_STATE_EXPIRED = 'SUBSCRIPTION_STATE_EXPIRED',
}

/**
 * Request payload sent to backend verification
 */
export interface VerifyPurchaseRequest {
  productId: string;
  purchaseToken: string;
  orderId?: string;
  purchaseTime: number;
  purchaseType: ProductType;
  packageName: string;
  simulatedScenario?: string;
}

/**
 * Verification response returned by the backend (simulating Google Play Developer API)
 */
export interface VerifyPurchaseResponse {
  success: boolean;
  verified: boolean;
  orderId?: string;
  productId: string;
  purchaseState: GooglePurchaseState;
  consumptionState: GoogleConsumptionState;
  acknowledgementState: GoogleAcknowledgementState;
  subscriptionState?: GoogleSubscriptionState;
  expiryTimeMillis?: number;
  entitlement?: {
    type: PurchaseTypeCategory;
    creditsToAdd?: number;
    premiumUnlocked?: boolean;
    planId?: string;
  };
  error?: string;
  message: string;
}

/**
 * Locally persisted Transaction Record
 */
export interface TransactionRecord {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  category: PurchaseTypeCategory;
  price: string;
  purchaseDate: string;
  timestamp: number;
  status: 'COMPLETED' | 'PENDING' | 'REFUNDED' | 'FAILED' | 'CANCELED';
  purchaseToken: string;
  subscriptionStatus?: string;
}

/**
 * Active Subscription Information
 */
export interface ActiveSubscriptionInfo {
  isActive: boolean;
  planId: 'monthly' | 'yearly' | null;
  productId: string | null;
  expiryDate: string | null;
  expiryTimestamp: number | null;
  autoRenewing: boolean;
  status: GoogleSubscriptionState;
  purchaseToken: string | null;
}
