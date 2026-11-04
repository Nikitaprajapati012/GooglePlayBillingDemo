import { MockBackendServer } from '../src/api/mockBackendServer';
import { APP_PACKAGE_NAME } from '../src/config/products';

describe('Idempotency & Replay Attack Prevention', () => {
  beforeEach(() => {
    MockBackendServer.resetLedger();
  });

  test('Prevents replay attack: Re-verifying same purchaseToken rejects duplicate credits', async () => {
    const request = {
      productId: 'credits_500',
      purchaseToken: 'secure_unique_token_500',
      orderId: 'GPA.5555-4444-3333',
      purchaseTime: Date.now(),
      purchaseType: 'inapp' as const,
      packageName: APP_PACKAGE_NAME,
    };

    // First attempt -> Success
    const firstAttempt = await MockBackendServer.verifyPurchase(request);
    expect(firstAttempt.success).toBe(true);
    expect(firstAttempt.verified).toBe(true);
    expect(firstAttempt.entitlement?.creditsToAdd).toBe(500);

    // Second attempt with exact same token/orderId -> Must be rejected as duplicate!
    const secondAttempt = await MockBackendServer.verifyPurchase(request);
    expect(secondAttempt.success).toBe(false);
    expect(secondAttempt.verified).toBe(false);
    expect(secondAttempt.error).toBe('DUPLICATE_TRANSACTION_REPLAY');
    expect(secondAttempt.entitlement).toBeUndefined();
  });

  test('Allows new purchases of the same product with distinct purchase tokens', async () => {
    // 1st purchase
    const res1 = await MockBackendServer.verifyPurchase({
      productId: 'credits_100',
      purchaseToken: 'token_run_1',
      orderId: 'GPA.100-01',
      purchaseTime: Date.now(),
      purchaseType: 'inapp',
      packageName: APP_PACKAGE_NAME,
    });
    expect(res1.success).toBe(true);

    // 2nd purchase of the same product (allowed because Google generates a new purchaseToken)
    const res2 = await MockBackendServer.verifyPurchase({
      productId: 'credits_100',
      purchaseToken: 'token_run_2',
      orderId: 'GPA.100-02',
      purchaseTime: Date.now(),
      purchaseType: 'inapp',
      packageName: APP_PACKAGE_NAME,
    });
    expect(res2.success).toBe(true);
    expect(res2.entitlement?.creditsToAdd).toBe(100);
  });
});
