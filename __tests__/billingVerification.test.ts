import { MockBackendServer } from '../src/api/mockBackendServer';
import { APP_PACKAGE_NAME } from '../src/config/products';
import { GooglePurchaseState } from '../src/types/billing';

describe('Purchase Verification & Security (Mock Google Play Developer API)', () => {
  beforeEach(() => {
    MockBackendServer.resetLedger();
  });

  test('Security: Rejects verification if package name does not match', async () => {
    const response = await MockBackendServer.verifyPurchase({
      productId: 'credits_100',
      purchaseToken: 'valid_token_123',
      orderId: 'GPA.1111-2222',
      purchaseTime: Date.now(),
      purchaseType: 'inapp',
      packageName: 'com.malicious.fakeapp',
    });

    expect(response.success).toBe(false);
    expect(response.verified).toBe(false);
    expect(response.error).toBe('INVALID_PACKAGE_NAME');
  });

  test('Security: Rejects empty or missing purchase token', async () => {
    const response = await MockBackendServer.verifyPurchase({
      productId: 'credits_100',
      purchaseToken: '',
      orderId: 'GPA.1111-2222',
      purchaseTime: Date.now(),
      purchaseType: 'inapp',
      packageName: APP_PACKAGE_NAME,
    });

    expect(response.success).toBe(false);
    expect(response.verified).toBe(false);
    expect(response.error).toBe('MALFORMED_PURCHASE_TOKEN');
  });

  test('Consumable: Successfully verifies 100 Credits and awards 100 credits', async () => {
    const response = await MockBackendServer.verifyPurchase({
      productId: 'credits_100',
      purchaseToken: 'token_100_credits_abc',
      orderId: 'GPA.2024-001',
      purchaseTime: Date.now(),
      purchaseType: 'inapp',
      packageName: APP_PACKAGE_NAME,
    });

    expect(response.success).toBe(true);
    expect(response.verified).toBe(true);
    expect(response.entitlement?.type).toBe('consumable');
    expect(response.entitlement?.creditsToAdd).toBe(100);
    expect(response.purchaseState).toBe(GooglePurchaseState.PURCHASED);
  });

  test('Non-Consumable: Successfully verifies Lifetime Premium unlock', async () => {
    const response = await MockBackendServer.verifyPurchase({
      productId: 'premium_lifetime',
      purchaseToken: 'token_lifetime_xyz',
      orderId: 'GPA.2024-002',
      purchaseTime: Date.now(),
      purchaseType: 'inapp',
      packageName: APP_PACKAGE_NAME,
    });

    expect(response.success).toBe(true);
    expect(response.verified).toBe(true);
    expect(response.entitlement?.type).toBe('non_consumable');
    expect(response.entitlement?.premiumUnlocked).toBe(true);
  });

  test('Subscription: Successfully verifies Yearly Subscription with active expiry date', async () => {
    const response = await MockBackendServer.verifyPurchase({
      productId: 'premium_subscription:yearly-plan',
      purchaseToken: 'token_yearly_sub',
      orderId: 'GPA.2024-003',
      purchaseTime: Date.now(),
      purchaseType: 'subs',
      packageName: APP_PACKAGE_NAME,
    });

    expect(response.success).toBe(true);
    expect(response.verified).toBe(true);
    expect(response.entitlement?.type).toBe('subscription');
    expect(response.entitlement?.planId).toBe('yearly');
    expect(response.expiryTimeMillis).toBeGreaterThan(Date.now());
  });

  test('Pending Payment: Withholds entitlements when payment is in PENDING state', async () => {
    const response = await MockBackendServer.verifyPurchase({
      productId: 'credits_500',
      purchaseToken: 'token_pending_upi',
      orderId: 'GPA.PENDING-001',
      purchaseTime: Date.now(),
      purchaseType: 'inapp',
      packageName: APP_PACKAGE_NAME,
      simulatedScenario: 'SIMULATE_PENDING',
    });

    expect(response.success).toBe(true);
    expect(response.verified).toBe(false);
    expect(response.purchaseState).toBe(GooglePurchaseState.PENDING);
    expect(response.entitlement).toBeUndefined();
  });
});
