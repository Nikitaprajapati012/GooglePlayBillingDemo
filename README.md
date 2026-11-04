# Google Play Billing Demo (React Native)

Production-grade implementation of **Google Play Billing** in **React Native** demonstrating Consumable Purchases, Non-Consumable Purchases, Recurring Subscriptions, Zero-Trust Backend Verification, and comprehensive edge scenario handling.

---

## 📱 Features & Implemented Architecture

### 1. In-App Purchase Types

| Type | Product Name | Sample Price | Delivery Flow |
| :--- | :--- | :--- | :--- |
| **Consumable** | 100 Credits | ₹49 | `requestPurchase` ➔ Backend Token Verification ➔ `consumePurchaseAndroid()` ➔ Increment Credit Balance. Allows repeat buys. |
| **Consumable** | 500 Credits | ₹199 | Repeatable. Consumed immediately to clear Google Play purchase token. |
| **Consumable** | 1000 Credits | ₹349 | Repeatable pack. |
| **Non-Consumable** | Lifetime Premium | ₹999 | `requestPurchase` ➔ Backend Token Verification ➔ `acknowledgePurchaseAndroid()` ➔ Permanent unlock. Restored on re-installs. |
| **Subscription** | Monthly Premium | ₹199/month | `requestSubscription` ➔ Verify with Subscriptions v2 ➔ `acknowledgePurchaseAndroid()` ➔ Auto-renewing, cancellation, proration support. |
| **Subscription** | Yearly Premium | ₹1,499/year | Best value plan. Supports upgrading from monthly with time proration. |

---

## 🔒 Security & Backend Verification Architecture

The application strictly implements a **Zero-Trust Client Model**:
- **Rule:** The client **never** unlocks credits, premium features, or subscriptions solely based on local Google Play client callbacks.
- **Verification Flow:**
  1. The app receives the purchase event from `purchaseUpdatedListener`.
  2. The raw `purchaseToken`, `orderId`, and `productId` are passed to the **Verification Layer** (`VerificationService`).
  3. The verification layer simulates Google Play Developer APIs (`purchases.products.get` and `purchases.subscriptionsv2.get`).
  4. It performs **Package Name validation** (`com.playbillingdemo`), checks token integrity, and evaluates the **Idempotency Ledger**.
  5. Entitlements are only granted if the backend confirms `purchaseState === 0` (`PURCHASED`).

```
[User Taps Buy]
       │
       ▼
[Google Play Billing Flow (launchBillingFlow)]
       │
       ▼
[purchaseUpdatedListener receives Purchase]
       │
       ├── State is PENDING (UPI / Slow Test Card) ──► Show "Payment Pending" banner; Entitlements withheld
       │
       ▼
[State is PURCHASED]
       │
       ▼
[POST /api/v1/billing/verify-purchase]
       │
       ├── Replay Attack Detected (Token already in Ledger) ──► HTTP 409 Rejected
       │
       ▼
[Backend Validates Token & Returns Verified Entitlement JSON]
       │
       ├── If Consumable: RNIap.consumePurchaseAndroid({ purchaseToken }) ➔ balance += credits
       └── If Non-Consumable / Sub: RNIap.acknowledgePurchaseAndroid({ purchaseToken }) ➔ unlock
```

---

## 🛡️ Duplicate Transaction & Replay Attack Prevention

To prevent users or attackers from replaying the same `purchaseToken` to inflate credit balances:
1. **Server-Side Idempotency Ledger:**
   - Every fulfilled transaction is keyed by `orderId` or `purchaseToken`.
   - If a duplicate verification request is received with an already consumed or acknowledged token, the server immediately returns `DUPLICATE_TRANSACTION_REPLAY` and rejects double crediting.
2. **Client-Side Token Registry:**
   - Tokens are locally marked in persistent storage (`StorageService.markTokenProcessed`) as an additional client-side defense.

---

## 🔄 Purchase Restoration & Crash Recovery

1. **Restoring Purchases on Reinstall / Another Device:**
   - User clicks **"Restore Purchases"** on the Home screen.
   - The app calls `RNIap.getAvailablePurchases()`.
   - Any active lifetime unlocks or subscriptions linked to the user's Google Play account are fetched, verified with the backend, and reinstated.
2. **Crash / Interrupted Flow Recovery (App Killed During Purchase):**
   - On app launch, `recoverInterruptedPurchases()` executes inside `setupBilling()`.
   - It queries `getAvailablePurchases()` for unacknowledged or unconsumed purchases (e.g. if the app crashed after money was deducted but before credits were credited).
   - Unfinished purchases are automatically forwarded through the verification and consumption pipeline.

---

## 🧪 13 Payment Scenarios Matrix

| Scenario | Implementation & Handling |
| :--- | :--- |
| **1. Successful payment** | Handled in `purchaseUpdatedListener`, verified via backend, consumed/acknowledged, UI balance updated. |
| **2. User cancels payment** | Handled in `purchaseErrorListener` (`E_USER_CANCELLED`); gracefully clears loaders with no annoying errors. |
| **3. Payment fails** | Error code caught; user is alerted with clear feedback ("Payment Incomplete"). |
| **4. Pending payment (UPI / Slow Card)** | Detects `purchaseState === 2` (`PENDING`). Withholds credits; marks transaction as `PENDING` in history. |
| **5. Duplicate purchase attempt** | Google Play blocks re-purchasing unconsumed lifetime/subs; backend idempotency blocks replaying consumable tokens. |
| **6. App killed during purchase** | `recoverInterruptedPurchases()` scans unconsumed tokens via `getAvailablePurchases()` on subsequent launch. |
| **7. Internet disconnected during purchase** | Network error caught gracefully; tokens remain queued in Google Play until connectivity returns. |
| **8. App restarted after purchase** | Balances, lifetime status, and active plans are persisted in local storage (`AsyncStorage`). |
| **9. Restored on another device** | "Restore Purchases" button queries active entitlements via `getAvailablePurchases()`. |
| **10. Subscription renewal** | Simulated via RTDN notification engine; extends subscription `expiryDate`. |
| **11. Subscription cancellation** | User cancels via Play Store; access remains active until the end of current billing period. |
| **12. Subscription expiry** | When `expiryTimeMillis < Date.now()`, UI reverts to free tier. |
| **13. Refund or revoked purchase** | Verification service rejects revoked tokens; RTDN revokes entitlement immediately. |

---

## 🛠️ Google Play Console Sandbox Setup Guide

### 1. Configure In-App Products & Subscriptions
In your **Google Play Console**:
1. Select your app (`com.playbillingdemo`).
2. Navigate to **Monetize > Products > In-app products**:
   - `credits_100` — Consumable — Price: ₹49
   - `credits_500` — Consumable — Price: ₹199
   - `credits_1000` — Consumable — Price: ₹349
   - `premium_lifetime` — Non-consumable — Price: ₹999
3. Navigate to **Monetize > Products > Subscriptions**:
   - Product ID: `premium_subscription`
   - Base Plan 1: `monthly-plan` — Auto-renewing, ₹199/month
   - Base Plan 2: `yearly-plan` — Auto-renewing, ₹1,499/year

### 2. Configure License Testers
1. Go to **Setup > License Testing**.
2. Add your tester Google accounts (e.g. `tester@gmail.com`).
3. Set **License test response** to **`RESPOND_NORMALLY`**.
4. Testers can select test payment instruments:
   - "Test card, always approves"
   - "Test card, always declines"
   - "Slow test card, approves after a few minutes" (Tests Pending payments)

---

## 🚀 Running the Project

### Running Unit Tests
```bash
node test-runner.js
```

### Running the Standalone Mock Verification Server
```bash
node server/mockServer.js
# Or
npm run server
```

### Running the React Native Android App
```bash
# 1. Install dependencies
npm install

# 2. Run on Android device or emulator
npm run android
```

---

## 📊 Test Suite Execution Results

Running `node test-runner.js`:
```text
====================================================
🧪 RUNNING GOOGLE PLAY BILLING AUTOMATED TEST SUITE
====================================================

  ✅ PASS: Security - Rejects verification if package name does not match
  ✅ PASS: Security - Rejects empty or missing purchase token
  ✅ PASS: Consumables - Awards 100, 500, and 1000 credits accurately
  ✅ PASS: Non-Consumable - Unlocks Lifetime Premium access
  ✅ PASS: Subscriptions - Verifies monthly and yearly plans
  ✅ PASS: Idempotency - Replay attack with same token is rejected
  ✅ PASS: Pending Payment - Withholds entitlements until status transitions

====================================================
📊 TEST RESULTS: 7 Passed, 0 Failed
====================================================
```
