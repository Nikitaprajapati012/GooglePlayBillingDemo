/**
 * Standalone Mock Verification Server (Node.js)
 * Implements the Manager's Section 5 Mock Backend Verification APIs:
 * - POST /api/purchases/verify      : Verify purchase token
 * - POST /api/purchases/process     : Process verified transaction idempotently
 * - GET  /api/purchases/history     : Get transaction history
 * - GET  /api/user/entitlements     : Get credits and premium access
 * - POST /api/purchases/restore     : Resynchronize purchases
 * - POST /api/subscriptions/sync    : Update subscription status
 * - POST /api/purchases/revoke      : Simulate refund/revocation
 *
 * Backward-compatible endpoint:
 * - POST /api/v1/billing/verify-purchase
 *
 * To run: node server/mockServer.js (or npm run server)
 */

const http = require('http');

const PORT = process.env.PORT || 3000;
const APP_PACKAGE_NAME = 'com.playbillingdemo';

// In-Memory Idempotency & Transaction Ledger
// Schema per Manager's spec:
// { purchaseToken, productId, purchaseType, purchaseState, verificationStatus, processed, creditsAdded }
const transactionLedger = new Map();

// User Entitlements (Device-specific or anonymous ID based)
const userEntitlements = {
  credits: 0,
  lifetimePremium: false,
  subscription: {
    isActive: false,
    planId: null,
    expiryTimeMillis: null,
    status: 'INACTIVE',
  },
};

const CATALOG = {
  credits_100: { type: 'CONSUMABLE', credits: 100, price: '₹49' },
  credits_500: { type: 'CONSUMABLE', credits: 500, price: '₹199' },
  credits_1000: { type: 'CONSUMABLE', credits: 1000, price: '₹349' },
  lifetime_premium: { type: 'NON_CONSUMABLE', price: '₹999' },
  premium_lifetime: { type: 'NON_CONSUMABLE', price: '₹999' }, // Alias
  'premium_subscription:monthly': { type: 'SUBSCRIPTION', plan: 'monthly', price: '₹199/month' },
  'premium_subscription:yearly': { type: 'SUBSCRIPTION', plan: 'yearly', price: '₹1,499/year' },
  'premium_subscription:monthly-plan': { type: 'SUBSCRIPTION', plan: 'monthly', price: '₹199/month' },
  'premium_subscription:yearly-plan': { type: 'SUBSCRIPTION', plan: 'yearly', price: '₹1,499/year' },
  premium_subscription: { type: 'SUBSCRIPTION', plan: 'monthly', price: '₹199/month' },
};

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(JSON.stringify(data, null, 2));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    res.end();
    return;
  }

  const [path] = req.url.split('?');

  // 1. Health check
  if (req.method === 'GET' && (path === '/health' || path === '/')) {
    sendJson(res, 200, {
      status: 'OK',
      service: 'Google Play Verification Mock Backend API',
      version: '2.0.0',
      activeTransactions: transactionLedger.size,
    });
    return;
  }

  // 2. GET /api/user/entitlements
  if (req.method === 'GET' && path === '/api/user/entitlements') {
    sendJson(res, 200, {
      success: true,
      entitlements: userEntitlements,
    });
    return;
  }

  // 3. GET /api/purchases/history
  if (req.method === 'GET' && (path === '/api/purchases/history' || path === '/api/v1/billing/ledger')) {
    const list = Array.from(transactionLedger.values());
    sendJson(res, 200, {
      success: true,
      count: list.length,
      history: list,
    });
    return;
  }

  // 4. POST /api/purchases/verify OR legacy /api/v1/billing/verify-purchase
  if (req.method === 'POST' && (path === '/api/purchases/verify' || path === '/api/v1/billing/verify-purchase')) {
    try {
      const payload = await parseBody(req);
      const {
        productId,
        purchaseToken,
        orderId,
        packageName,
        simulatedScenario,
      } = payload;

      console.log(`[Mock Server] Verifying token for product ${productId}...`);

      if (packageName && packageName !== APP_PACKAGE_NAME) {
        sendJson(res, 400, {
          success: false,
          verified: false,
          error: 'INVALID_PACKAGE_NAME',
          message: `Package mismatch. Expected ${APP_PACKAGE_NAME}, got ${packageName}`,
        });
        return;
      }

      if (!purchaseToken) {
        sendJson(res, 400, {
          success: false,
          verified: false,
          error: 'MISSING_PURCHASE_TOKEN',
          message: 'Purchase token cannot be empty.',
        });
        return;
      }

      // Check simulated scenarios
      if (simulatedScenario === 'SIMULATE_PENDING') {
        sendJson(res, 200, {
          success: true,
          verified: false,
          orderId,
          productId,
          purchaseState: 2, // PENDING
          message: 'Payment is pending banking / UPI confirmation.',
        });
        return;
      }

      if (simulatedScenario === 'SIMULATE_REVOKED') {
        sendJson(res, 200, {
          success: false,
          verified: false,
          orderId,
          productId,
          purchaseState: 1, // CANCELED
          error: 'PURCHASE_REVOKED_OR_REFUNDED',
          message: 'Purchase was refunded or revoked by issuer.',
        });
        return;
      }

      // Idempotency: Duplicate detection
      const ledgerKey = purchaseToken;
      if (transactionLedger.has(ledgerKey)) {
        const prev = transactionLedger.get(ledgerKey);
        if (prev.processed) {
          sendJson(res, 409, {
            success: false,
            verified: false,
            error: 'DUPLICATE_TRANSACTION_REPLAY',
            message: 'This purchase token has already been processed and credited.',
            record: prev,
          });
          return;
        }
      }

      // Lookup product details
      const catalogKey = CATALOG[productId] ? productId : productId.split(':')[0];
      const catalogItem = CATALOG[catalogKey] || CATALOG[productId];

      if (!catalogItem) {
        sendJson(res, 404, {
          success: false,
          verified: false,
          error: 'UNKNOWN_PRODUCT',
          message: `Product ${productId} is not in catalog.`,
        });
        return;
      }

      // Process Entitlement
      let record;
      let entitlementResponse;
      const effectiveOrderId = orderId || `GPA.${Date.now()}`;

      if (catalogItem.type === 'CONSUMABLE') {
        record = {
          purchaseToken,
          orderId: effectiveOrderId,
          productId,
          purchaseType: 'CONSUMABLE',
          purchaseState: 'PURCHASED',
          verificationStatus: 'VERIFIED',
          processed: true,
          creditsAdded: catalogItem.credits,
          timestamp: Date.now(),
        };
        userEntitlements.credits += catalogItem.credits;

        entitlementResponse = {
          type: 'consumable',
          creditsToAdd: catalogItem.credits,
        };
      } else if (catalogItem.type === 'NON_CONSUMABLE') {
        record = {
          purchaseToken,
          orderId: effectiveOrderId,
          productId,
          purchaseType: 'NON_CONSUMABLE',
          purchaseState: 'PURCHASED',
          verificationStatus: 'VERIFIED',
          processed: true,
          timestamp: Date.now(),
        };
        userEntitlements.lifetimePremium = true;

        entitlementResponse = {
          type: 'non_consumable',
          premiumUnlocked: true,
        };
      } else {
        // SUBSCRIPTION
        const isYearly = productId.includes('yearly');
        const duration = isYearly ? 365 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
        const expiryTimeMillis = Date.now() + duration;

        record = {
          purchaseToken,
          orderId: effectiveOrderId,
          productId,
          purchaseType: 'SUBSCRIPTION',
          purchaseState: 'PURCHASED',
          verificationStatus: 'VERIFIED',
          processed: true,
          plan: isYearly ? 'yearly' : 'monthly',
          expiryTimeMillis,
          timestamp: Date.now(),
        };

        userEntitlements.subscription = {
          isActive: true,
          planId: isYearly ? 'yearly' : 'monthly',
          expiryTimeMillis,
          status: 'SUBSCRIPTION_STATE_ACTIVE',
        };

        entitlementResponse = {
          type: 'subscription',
          premiumUnlocked: true,
          planId: isYearly ? 'yearly' : 'monthly',
        };
      }

      transactionLedger.set(ledgerKey, record);

      sendJson(res, 200, {
        success: true,
        verified: true,
        orderId: effectiveOrderId,
        productId,
        purchaseState: 0,
        consumptionState: catalogItem.type === 'CONSUMABLE' ? 1 : 0,
        acknowledgementState: 1,
        subscriptionState: catalogItem.type === 'SUBSCRIPTION' ? 'SUBSCRIPTION_STATE_ACTIVE' : undefined,
        expiryTimeMillis: record.expiryTimeMillis,
        entitlement: entitlementResponse,
        record,
        message: 'Purchase verified successfully.',
      });
    } catch (err) {
      sendJson(res, 500, { success: false, verified: false, error: 'SERVER_ERROR', message: err.message });
    }
    return;
  }

  // 5. POST /api/purchases/process (Explicit Idempotent Processing Step)
  if (req.method === 'POST' && path === '/api/purchases/process') {
    try {
      const payload = await parseBody(req);
      const { purchaseToken } = payload;
      if (!purchaseToken) {
        sendJson(res, 400, { success: false, error: 'MISSING_PURCHASE_TOKEN' });
        return;
      }
      const existing = transactionLedger.get(purchaseToken);
      if (!existing) {
        sendJson(res, 404, { success: false, error: 'PURCHASE_NOT_FOUND', message: 'Token not verified yet.' });
        return;
      }
      existing.processed = true;
      sendJson(res, 200, { success: true, processed: true, record: existing });
    } catch (err) {
      sendJson(res, 500, { success: false, error: 'SERVER_ERROR', message: err.message });
    }
    return;
  }

  // 6. POST /api/purchases/restore
  if (req.method === 'POST' && path === '/api/purchases/restore') {
    try {
      const payload = await parseBody(req);
      const { tokens = [] } = payload;
      const restoredEntitlements = {
        lifetimePremium: userEntitlements.lifetimePremium,
        activeSubscription: userEntitlements.subscription.isActive ? userEntitlements.subscription : null,
      };
      sendJson(res, 200, {
        success: true,
        message: 'Purchases restored successfully.',
        entitlements: restoredEntitlements,
      });
    } catch (err) {
      sendJson(res, 500, { success: false, error: 'SERVER_ERROR', message: err.message });
    }
    return;
  }

  // 7. POST /api/subscriptions/sync
  if (req.method === 'POST' && path === '/api/subscriptions/sync') {
    try {
      const payload = await parseBody(req);
      const { planId, status } = payload;
      if (status === 'CANCELLED') {
        userEntitlements.subscription.status = 'SUBSCRIPTION_STATE_CANCELED';
      }
      sendJson(res, 200, {
        success: true,
        subscription: userEntitlements.subscription,
      });
    } catch (err) {
      sendJson(res, 500, { success: false, error: 'SERVER_ERROR', message: err.message });
    }
    return;
  }

  // 8. POST /api/purchases/revoke
  if (req.method === 'POST' && path === '/api/purchases/revoke') {
    try {
      const payload = await parseBody(req);
      const { purchaseToken } = payload;
      if (purchaseToken && transactionLedger.has(purchaseToken)) {
        const item = transactionLedger.get(purchaseToken);
        item.verificationStatus = 'REVOKED';
        item.purchaseState = 'REVOKED';
        if (item.purchaseType === 'CONSUMABLE' && item.creditsAdded) {
          userEntitlements.credits = Math.max(0, userEntitlements.credits - item.creditsAdded);
        } else if (item.purchaseType === 'NON_CONSUMABLE') {
          userEntitlements.lifetimePremium = false;
        } else if (item.purchaseType === 'SUBSCRIPTION') {
          userEntitlements.subscription.isActive = false;
        }
      }
      sendJson(res, 200, { success: true, message: 'Entitlement revoked successfully.' });
    } catch (err) {
      sendJson(res, 500, { success: false, error: 'SERVER_ERROR', message: err.message });
    }
    return;
  }

  // 9. Reset Ledger / Demo testing
  if (req.method === 'POST' && (path === '/api/v1/billing/reset' || path === '/api/reset')) {
    transactionLedger.clear();
    userEntitlements.credits = 0;
    userEntitlements.lifetimePremium = false;
    userEntitlements.subscription = { isActive: false, planId: null, expiryTimeMillis: null, status: 'INACTIVE' };
    sendJson(res, 200, { success: true, message: 'Ledger and entitlements reset successfully.' });
    return;
  }

  sendJson(res, 404, { error: 'NOT_FOUND', message: `Endpoint ${path} does not exist.` });
});

server.listen(PORT, () => {
  console.log(`[Mock Server] Google Play Verification Server listening on port ${PORT}`);
  console.log(`[Mock Server] Section 5 APIs ready: /api/purchases/verify, /api/purchases/process, /api/purchases/history, etc.`);
});
