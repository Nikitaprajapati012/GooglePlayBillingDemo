/**
 * Standalone Mock Verification Server (Node.js)
 * Simulates Google Play Developer API Verification Endpoints:
 * - purchases.products.get
 * - purchases.subscriptionsv2.get
 *
 * To run: node server/mockServer.js (or npm run server)
 */

const http = require('http');

const PORT = process.env.PORT || 3000;
const APP_PACKAGE_NAME = 'com.playbillingdemo';

// In-Memory Idempotency & Transaction Ledger
const transactionLedger = new Map();

const CATALOG = {
  credits_100: { type: 'consumable', credits: 100, price: '₹49' },
  credits_500: { type: 'consumable', credits: 500, price: '₹199' },
  credits_1000: { type: 'consumable', credits: 1000, price: '₹349' },
  premium_lifetime: { type: 'non_consumable', price: '₹999' },
  'premium_subscription:monthly-plan': { type: 'subscription', plan: 'monthly', price: '₹199/month' },
  'premium_subscription:yearly-plan': { type: 'subscription', plan: 'yearly', price: '₹1,499/year' },
};

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(data, null, 2));
}

const server = http.createServer((req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  // 1. Health check
  if (req.method === 'GET' && req.url === '/health') {
    sendJson(res, 200, { status: 'OK', service: 'Google Play Verification Mock API' });
    return;
  }

  // 2. View Ledger
  if (req.method === 'GET' && req.url === '/api/v1/billing/ledger') {
    const list = Array.from(transactionLedger.values());
    sendJson(res, 200, { count: list.length, transactions: list });
    return;
  }

  // 3. Reset Ledger
  if (req.method === 'POST' && req.url === '/api/v1/billing/reset') {
    transactionLedger.clear();
    sendJson(res, 200, { success: true, message: 'Ledger reset successfully.' });
    return;
  }

  // 4. Verify Purchase Endpoint (Main)
  if (req.method === 'POST' && req.url === '/api/v1/billing/verify-purchase') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const {
          productId,
          purchaseToken,
          orderId,
          packageName,
          simulatedScenario,
        } = payload;

        console.log(`[Mock Server] Received verification request for product: ${productId}, token: ${purchaseToken}`);

        // Validate Package Name
        if (packageName && packageName !== APP_PACKAGE_NAME) {
          sendJson(res, 400, {
            success: false,
            verified: false,
            error: 'INVALID_PACKAGE_NAME',
            message: `Package mismatch. Expected ${APP_PACKAGE_NAME}, received ${packageName}`,
          });
          return;
        }

        // Validate Token
        if (!purchaseToken) {
          sendJson(res, 400, {
            success: false,
            verified: false,
            error: 'MISSING_PURCHASE_TOKEN',
            message: 'Purchase token cannot be empty.',
          });
          return;
        }

        // Handle simulation flags
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

        // Idempotency: Prevent replay attacks
        const ledgerKey = orderId || purchaseToken;
        if (transactionLedger.has(ledgerKey)) {
          const prev = transactionLedger.get(ledgerKey);
          if (prev.status === 'CONSUMED' || prev.status === 'ACKNOWLEDGED') {
            sendJson(res, 409, {
              success: false,
              verified: false,
              error: 'DUPLICATE_TRANSACTION_REPLAY',
              message: 'This purchase token has already been processed and credited.',
            });
            return;
          }
        }

        // Catalog lookup
        const catalogItem = CATALOG[productId] || CATALOG[productId.split(':')[0]];
        if (!catalogItem) {
          sendJson(res, 404, {
            success: false,
            verified: false,
            error: 'UNKNOWN_PRODUCT',
            message: `Product ${productId} is not in catalog.`,
          });
          return;
        }

        // Entitlements
        if (catalogItem.type === 'consumable') {
          transactionLedger.set(ledgerKey, {
            orderId: orderId || `GPA.${Date.now()}`,
            purchaseToken,
            productId,
            status: 'CONSUMED',
            creditedAt: Date.now(),
          });

          sendJson(res, 200, {
            success: true,
            verified: true,
            orderId: orderId || `GPA.${Date.now()}`,
            productId,
            purchaseState: 0, // PURCHASED
            consumptionState: 1, // CONSUMED
            acknowledgementState: 1,
            entitlement: {
              type: 'consumable',
              creditsToAdd: catalogItem.credits,
            },
            message: `Verified: ${catalogItem.credits} credits approved.`,
          });
        } else if (catalogItem.type === 'non_consumable') {
          transactionLedger.set(ledgerKey, {
            orderId: orderId || `GPA.${Date.now()}`,
            purchaseToken,
            productId,
            status: 'ACKNOWLEDGED',
            creditedAt: Date.now(),
          });

          sendJson(res, 200, {
            success: true,
            verified: true,
            orderId: orderId || `GPA.${Date.now()}`,
            productId,
            purchaseState: 0,
            consumptionState: 0,
            acknowledgementState: 1,
            entitlement: {
              type: 'non_consumable',
              premiumUnlocked: true,
            },
            message: 'Verified: Lifetime Premium access approved.',
          });
        } else {
          // Subscription
          const isYearly = productId.includes('yearly');
          const duration = isYearly ? 365 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
          const expiryTimeMillis = Date.now() + duration;

          transactionLedger.set(ledgerKey, {
            orderId: orderId || `GPA.${Date.now()}`,
            purchaseToken,
            productId,
            status: 'ACKNOWLEDGED',
            creditedAt: Date.now(),
          });

          sendJson(res, 200, {
            success: true,
            verified: true,
            orderId: orderId || `GPA.${Date.now()}`,
            productId,
            purchaseState: 0,
            consumptionState: 0,
            acknowledgementState: 1,
            subscriptionState: 'SUBSCRIPTION_STATE_ACTIVE',
            expiryTimeMillis,
            entitlement: {
              type: 'subscription',
              premiumUnlocked: true,
              planId: isYearly ? 'yearly' : 'monthly',
            },
            message: `Verified: ${isYearly ? 'Yearly' : 'Monthly'} Subscription active.`,
          });
        }
      } catch (err) {
        sendJson(res, 500, {
          success: false,
          verified: false,
          error: 'SERVER_ERROR',
          message: err.message,
        });
      }
    });
    return;
  }

  sendJson(res, 404, { error: 'NOT_FOUND', message: 'Endpoint does not exist' });
});

server.listen(PORT, () => {
  console.log(`[Mock Server] Google Play Verification Server listening on port ${PORT}`);
  console.log(`[Mock Server] Endpoint: POST http://localhost:${PORT}/api/v1/billing/verify-purchase`);
});
