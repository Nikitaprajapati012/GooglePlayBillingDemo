import { MockBackendServer } from '../src/api/mockBackendServer';
import { APP_PACKAGE_NAME } from '../src/config/products';

describe('Credit Consumption & Balance Management', () => {
  beforeEach(() => {
    MockBackendServer.resetLedger();
  });

  test('Consumable credits accumulate upon multiple separate purchases', async () => {
    let balance = 0;

    // 1st purchase: 100 credits
    const res1 = await MockBackendServer.verifyPurchase({
      productId: 'credits_100',
      purchaseToken: 'tok_1',
      orderId: 'GPA.1',
      purchaseTime: Date.now(),
      purchaseType: 'inapp',
      packageName: APP_PACKAGE_NAME,
    });
    balance += res1.entitlement?.creditsToAdd || 0;
    expect(balance).toBe(100);

    // 2nd purchase: 500 credits
    const res2 = await MockBackendServer.verifyPurchase({
      productId: 'credits_500',
      purchaseToken: 'tok_2',
      orderId: 'GPA.2',
      purchaseTime: Date.now(),
      purchaseType: 'inapp',
      packageName: APP_PACKAGE_NAME,
    });
    balance += res2.entitlement?.creditsToAdd || 0;
    expect(balance).toBe(600);

    // 3rd purchase: 1000 credits
    const res3 = await MockBackendServer.verifyPurchase({
      productId: 'credits_1000',
      purchaseToken: 'tok_3',
      orderId: 'GPA.3',
      purchaseTime: Date.now(),
      purchaseType: 'inapp',
      packageName: APP_PACKAGE_NAME,
    });
    balance += res3.entitlement?.creditsToAdd || 0;
    expect(balance).toBe(1600);

    // Simulate in-app spending of 50 credits
    const spentAmount = 50;
    expect(balance >= spentAmount).toBe(true);
    balance -= spentAmount;
    expect(balance).toBe(1550);
  });
});
