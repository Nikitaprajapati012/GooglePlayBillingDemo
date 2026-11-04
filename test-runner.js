/**
 * Zero-Dependency Test Suite Runner for Google Play Billing Demo
 * Run: node test-runner.js
 */

const assert = require('assert');

// In-Memory Idempotency & Transaction Ledger
const ledger = new Map();
const APP_PACKAGE_NAME = 'com.playbillingdemo';

const CATALOG = {
  credits_100: { type: 'consumable', credits: 100 },
  credits_500: { type: 'consumable', credits: 500 },
  credits_1000: { type: 'consumable', credits: 1000 },
  premium_lifetime: { type: 'non_consumable' },
  'premium_subscription:monthly-plan': { type: 'subscription', plan: 'monthly' },
  'premium_subscription:yearly-plan': { type: 'subscription', plan: 'yearly' },
};

function verifyPurchase(req) {
  // 1. Package name check
  if (req.packageName && req.packageName !== APP_PACKAGE_NAME) {
    return { success: false, verified: false, error: 'INVALID_PACKAGE_NAME' };
  }
  // 2. Token presence check
  if (!req.purchaseToken || req.purchaseToken.trim() === '') {
    return { success: false, verified: false, error: 'MALFORMED_PURCHASE_TOKEN' };
  }
  // 3. Simulated Pending
  if (req.simulatedScenario === 'SIMULATE_PENDING') {
    return { success: true, verified: false, purchaseState: 2, error: 'PAYMENT_PENDING' };
  }
  // 4. Idempotency replay check
  const key = req.orderId || req.purchaseToken;
  if (ledger.has(key)) {
    return { success: false, verified: false, error: 'DUPLICATE_TRANSACTION_REPLAY' };
  }

  // 5. Lookup product
  const item = CATALOG[req.productId] || CATALOG[req.productId.split(':')[0]];
  if (!item) {
    return { success: false, verified: false, error: 'UNKNOWN_PRODUCT' };
  }

  // 6. Record in ledger
  ledger.set(key, { orderId: req.orderId, token: req.purchaseToken, status: 'FULFILLED' });

  return {
    success: true,
    verified: true,
    purchaseState: 0,
    entitlement: {
      type: item.type,
      creditsToAdd: item.credits,
      premiumUnlocked: item.type === 'non_consumable' || item.type === 'subscription',
      planId: item.plan,
    },
  };
}

console.log('====================================================');
console.log('🧪 RUNNING GOOGLE PLAY BILLING AUTOMATED TEST SUITE');
console.log('====================================================\n');

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Reason: ${err.message}`);
    failed++;
  }
}

// Suite 1: Security & Verification
runTest('Security - Rejects verification if package name does not match', () => {
  ledger.clear();
  const res = verifyPurchase({
    productId: 'credits_100',
    purchaseToken: 'tok_test',
    orderId: 'GPA.1',
    packageName: 'com.attacker.fakeapp',
  });
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.error, 'INVALID_PACKAGE_NAME');
});

runTest('Security - Rejects empty or missing purchase token', () => {
  ledger.clear();
  const res = verifyPurchase({
    productId: 'credits_100',
    purchaseToken: '',
    orderId: 'GPA.1',
    packageName: APP_PACKAGE_NAME,
  });
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.error, 'MALFORMED_PURCHASE_TOKEN');
});

// Suite 2: Consumable Credits
runTest('Consumables - Awards 100, 500, and 1000 credits accurately', () => {
  ledger.clear();
  let balance = 0;

  const res100 = verifyPurchase({
    productId: 'credits_100',
    purchaseToken: 'tok_100',
    orderId: 'GPA.100',
    packageName: APP_PACKAGE_NAME,
  });
  assert.strictEqual(res100.verified, true);
  balance += res100.entitlement.creditsToAdd;
  assert.strictEqual(balance, 100);

  const res500 = verifyPurchase({
    productId: 'credits_500',
    purchaseToken: 'tok_500',
    orderId: 'GPA.500',
    packageName: APP_PACKAGE_NAME,
  });
  assert.strictEqual(res500.verified, true);
  balance += res500.entitlement.creditsToAdd;
  assert.strictEqual(balance, 600);

  const res1000 = verifyPurchase({
    productId: 'credits_1000',
    purchaseToken: 'tok_1000',
    orderId: 'GPA.1000',
    packageName: APP_PACKAGE_NAME,
  });
  assert.strictEqual(res1000.verified, true);
  balance += res1000.entitlement.creditsToAdd;
  assert.strictEqual(balance, 1600);

  // Spend 50 credits
  balance -= 50;
  assert.strictEqual(balance, 1550);
});

// Suite 3: Non-Consumable Lifetime
runTest('Non-Consumable - Unlocks Lifetime Premium access', () => {
  ledger.clear();
  const res = verifyPurchase({
    productId: 'premium_lifetime',
    purchaseToken: 'tok_life_1',
    orderId: 'GPA.LIFE-01',
    packageName: APP_PACKAGE_NAME,
  });
  assert.strictEqual(res.verified, true);
  assert.strictEqual(res.entitlement.type, 'non_consumable');
  assert.strictEqual(res.entitlement.premiumUnlocked, true);
});

// Suite 4: Subscriptions
runTest('Subscriptions - Verifies monthly and yearly plans', () => {
  ledger.clear();
  const resMonth = verifyPurchase({
    productId: 'premium_subscription:monthly-plan',
    purchaseToken: 'tok_sub_month',
    orderId: 'GPA.SUB-01',
    packageName: APP_PACKAGE_NAME,
  });
  assert.strictEqual(resMonth.verified, true);
  assert.strictEqual(resMonth.entitlement.planId, 'monthly');

  const resYear = verifyPurchase({
    productId: 'premium_subscription:yearly-plan',
    purchaseToken: 'tok_sub_year',
    orderId: 'GPA.SUB-02',
    packageName: APP_PACKAGE_NAME,
  });
  assert.strictEqual(resYear.verified, true);
  assert.strictEqual(resYear.entitlement.planId, 'yearly');
});

// Suite 5: Idempotency & Replay Attack Prevention
runTest('Idempotency - Replay attack with same token is rejected', () => {
  ledger.clear();
  const req = {
    productId: 'credits_500',
    purchaseToken: 'replay_attack_token_500',
    orderId: 'GPA.REPLAY-1',
    packageName: APP_PACKAGE_NAME,
  };

  const attempt1 = verifyPurchase(req);
  assert.strictEqual(attempt1.verified, true);

  const attempt2 = verifyPurchase(req);
  assert.strictEqual(attempt2.verified, false);
  assert.strictEqual(attempt2.error, 'DUPLICATE_TRANSACTION_REPLAY');
});

// Suite 6: Pending Payments (Slow Card / UPI)
runTest('Pending Payment - Withholds entitlements until status transitions', () => {
  ledger.clear();
  const res = verifyPurchase({
    productId: 'credits_500',
    purchaseToken: 'pending_upi_token',
    orderId: 'GPA.PENDING-01',
    packageName: APP_PACKAGE_NAME,
    simulatedScenario: 'SIMULATE_PENDING',
  });
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.verified, false);
  assert.strictEqual(res.purchaseState, 2); // PENDING
  assert.strictEqual(res.entitlement, undefined);
});

console.log('\n====================================================');
console.log(`📊 TEST RESULTS: ${passed} Passed, ${failed} Failed`);
console.log('====================================================\n');

if (failed > 0) {
  process.exit(1);
}
