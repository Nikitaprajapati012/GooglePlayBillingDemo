import {
  GoogleAcknowledgementState,
  GoogleConsumptionState,
  GooglePurchaseState,
  GoogleSubscriptionState,
  PurchaseTypeCategory,
  VerifyPurchaseRequest,
  VerifyPurchaseResponse,
} from '../types/billing';
import { APP_PACKAGE_NAME, PRODUCT_CATALOG } from '../config/products';

/**
 * Server-side Idempotency & Entitlement Ledger (Simulating Database)
 */
interface ServerTransactionLedger {
  orderId: string;
  purchaseToken: string;
  productId: string;
  status: 'PENDING' | 'CONSUMED' | 'ACKNOWLEDGED' | 'REVOKED';
  creditedAt: number;
}

const verifiedTransactionsDb = new Map<string, ServerTransactionLedger>();

/**
 * Mock Backend Purchase Verification Service
 * Simulates Google Play Developer API:
 * - https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.products/get
 * - https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.subscriptionsv2/get
 */
export const MockBackendServer = {
  /**
   * Reset database (for automated testing or manual reset)
   */
  resetLedger(): void {
    verifiedTransactionsDb.clear();
  },

  /**
   * Main verification entry point
   */
  async verifyPurchase(req: VerifyPurchaseRequest): Promise<VerifyPurchaseResponse> {
    // 1. Simulate realistic backend network roundtrip delay (500ms)
    await new Promise(resolve => setTimeout(resolve, 500));

    // 2. Validate Package Name
    if (req.packageName && req.packageName !== APP_PACKAGE_NAME) {
      return {
        success: false,
        verified: false,
        productId: req.productId,
        purchaseState: GooglePurchaseState.CANCELED,
        consumptionState: GoogleConsumptionState.NOT_YET_CONSUMED,
        acknowledgementState: GoogleAcknowledgementState.NOT_YET_ACKNOWLEDGED,
        error: 'INVALID_PACKAGE_NAME',
        message: `Package name mismatch. Expected ${APP_PACKAGE_NAME}, got ${req.packageName}`,
      };
    }

    // 3. Validate Token Presence
    if (!req.purchaseToken || req.purchaseToken.trim().length === 0) {
      return {
        success: false,
        verified: false,
        productId: req.productId,
        purchaseState: GooglePurchaseState.CANCELED,
        consumptionState: GoogleConsumptionState.NOT_YET_CONSUMED,
        acknowledgementState: GoogleAcknowledgementState.NOT_YET_ACKNOWLEDGED,
        error: 'MALFORMED_PURCHASE_TOKEN',
        message: 'The provided purchase token is invalid or missing.',
      };
    }

    // 4. Edge Scenario Simulation (if explicitly requested by test controls)
    if (req.simulatedScenario === 'SIMULATE_PENDING') {
      return {
        success: true,
        verified: false,
        orderId: req.orderId,
        productId: req.productId,
        purchaseState: GooglePurchaseState.PENDING,
        consumptionState: GoogleConsumptionState.NOT_YET_CONSUMED,
        acknowledgementState: GoogleAcknowledgementState.NOT_YET_ACKNOWLEDGED,
        message: 'Payment is currently PENDING banking / UPI confirmation. Entitlements withheld.',
      };
    }

    if (req.simulatedScenario === 'SIMULATE_REVOKED') {
      return {
        success: false,
        verified: false,
        orderId: req.orderId,
        productId: req.productId,
        purchaseState: GooglePurchaseState.CANCELED,
        consumptionState: GoogleConsumptionState.NOT_YET_CONSUMED,
        acknowledgementState: GoogleAcknowledgementState.NOT_YET_ACKNOWLEDGED,
        error: 'PURCHASE_REVOKED_OR_REFUNDED',
        message: 'The user requested a refund or the issuer revoked this transaction.',
      };
    }

    // 5. Identify Catalog Item (Exact match, aliases, then subscription prefix match)
    const catalogItem =
      PRODUCT_CATALOG.find(p => p.productId === req.productId) ||
      (req.productId === 'premium_lifetime' ? PRODUCT_CATALOG.find(p => p.productId === 'lifetime_premium') : undefined) ||
      (req.productId === 'lifetime_premium' ? PRODUCT_CATALOG.find(p => p.productId === 'premium_lifetime') : undefined) ||
      PRODUCT_CATALOG.find(
        p => p.category === 'subscription' && req.productId.startsWith(p.productId.split(':')[0])
      );

    if (!catalogItem) {
      return {
        success: false,
        verified: false,
        productId: req.productId,
        purchaseState: GooglePurchaseState.CANCELED,
        consumptionState: GoogleConsumptionState.NOT_YET_CONSUMED,
        acknowledgementState: GoogleAcknowledgementState.NOT_YET_ACKNOWLEDGED,
        error: 'UNKNOWN_PRODUCT_ID',
        message: `Product ID '${req.productId}' is not registered in Play Console catalog.`,
      };
    }

    // 6. Security & Idempotency Check: Prevent Double Crediting & Replay Attacks
    const orderKey = req.orderId || req.purchaseToken;
    const existingTransaction = verifiedTransactionsDb.get(orderKey);

    if (existingTransaction) {
      if (existingTransaction.status === 'CONSUMED' || existingTransaction.status === 'ACKNOWLEDGED') {
        return {
          success: false,
          verified: false,
          orderId: req.orderId,
          productId: req.productId,
          purchaseState: GooglePurchaseState.PURCHASED,
          consumptionState: GoogleConsumptionState.CONSUMED,
          acknowledgementState: GoogleAcknowledgementState.ACKNOWLEDGED,
          error: 'DUPLICATE_TRANSACTION_REPLAY',
          message: 'Security Alert: This transaction/token has already been verified and credited.',
        };
      }
    }

    // 7. Process Entitlements based on Product Category
    let category: PurchaseTypeCategory = catalogItem.category;
    let entitlement: VerifyPurchaseResponse['entitlement'];

    if (category === 'consumable') {
      entitlement = {
        type: 'consumable',
        creditsToAdd: catalogItem.creditsAwarded || 100,
      };

      // Record in Server Ledger as consumed
      verifiedTransactionsDb.set(orderKey, {
        orderId: req.orderId || `GPA.${Date.now()}`,
        purchaseToken: req.purchaseToken,
        productId: req.productId,
        status: 'CONSUMED',
        creditedAt: Date.now(),
      });

      return {
        success: true,
        verified: true,
        orderId: req.orderId || `GPA.${Date.now()}`,
        productId: req.productId,
        purchaseState: GooglePurchaseState.PURCHASED,
        consumptionState: GoogleConsumptionState.CONSUMED,
        acknowledgementState: GoogleAcknowledgementState.ACKNOWLEDGED,
        entitlement,
        message: `Verified: ${entitlement.creditsToAdd} Credits approved for fulfillment.`,
      };
    } else if (category === 'non_consumable') {
      entitlement = {
        type: 'non_consumable',
        premiumUnlocked: true,
      };

      // Record in Server Ledger as acknowledged
      verifiedTransactionsDb.set(orderKey, {
        orderId: req.orderId || `GPA.${Date.now()}`,
        purchaseToken: req.purchaseToken,
        productId: req.productId,
        status: 'ACKNOWLEDGED',
        creditedAt: Date.now(),
      });

      return {
        success: true,
        verified: true,
        orderId: req.orderId || `GPA.${Date.now()}`,
        productId: req.productId,
        purchaseState: GooglePurchaseState.PURCHASED,
        consumptionState: GoogleConsumptionState.NOT_YET_CONSUMED,
        acknowledgementState: GoogleAcknowledgementState.ACKNOWLEDGED,
        entitlement,
        message: 'Verified: Lifetime Premium permanently unlocked.',
      };
    } else {
      // Subscription (Monthly or Yearly)
      const isYearly = req.productId.includes('yearly');
      const now = Date.now();
      // Sandbox: monthly = 5 min (300,000ms), yearly = 30 min or standard 30 days
      const durationMillis = isYearly ? 365 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
      const expiryTimeMillis = now + durationMillis;

      entitlement = {
        type: 'subscription',
        premiumUnlocked: true,
        planId: isYearly ? 'yearly' : 'monthly',
      };

      verifiedTransactionsDb.set(orderKey, {
        orderId: req.orderId || `GPA.${Date.now()}`,
        purchaseToken: req.purchaseToken,
        productId: req.productId,
        status: 'ACKNOWLEDGED',
        creditedAt: Date.now(),
      });

      return {
        success: true,
        verified: true,
        orderId: req.orderId || `GPA.${Date.now()}`,
        productId: req.productId,
        purchaseState: GooglePurchaseState.PURCHASED,
        consumptionState: GoogleConsumptionState.NOT_YET_CONSUMED,
        acknowledgementState: GoogleAcknowledgementState.ACKNOWLEDGED,
        subscriptionState: GoogleSubscriptionState.SUBSCRIPTION_STATE_ACTIVE,
        expiryTimeMillis,
        entitlement,
        message: `Verified: Active ${isYearly ? 'Yearly' : 'Monthly'} Subscription confirmed.`,
      };
    }
  },

  /**
   * Simulates checking a subscription status with Google Play Subscriptions v2 API
   */
  async checkSubscriptionStatus(purchaseToken: string): Promise<{
    state: GoogleSubscriptionState;
    autoRenewing: boolean;
    expiryTimeMillis: number;
  }> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return {
      state: GoogleSubscriptionState.SUBSCRIPTION_STATE_ACTIVE,
      autoRenewing: true,
      expiryTimeMillis: Date.now() + 30 * 24 * 60 * 60 * 1000,
    };
  },
};
