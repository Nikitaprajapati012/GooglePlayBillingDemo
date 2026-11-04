# 📋 Google Play Billing Project: Architecture & Execution Report

This document outlines the architectural plan, functional implementation, security design, and execution proof for the **Google Play Billing** integration in **React Native**.

---

## 1. Executive Summary & Core Objective

The primary objective is to implement a robust, production-grade **Android application in React Native** demonstrating all three categories of Google Play In-App Purchases:
1. **Consumable Products (Credits)**: Repeatable purchases where tokens are consumed on Google Play immediately after verification to replenish and maintain in-app credit balances.
2. **Non-Consumable Products (Lifetime Premium)**: One-time purchases that permanently unlock premium capabilities, are maintained across application restarts, and are restored upon reinstallation or logging into another device.
3. **Recurring Subscriptions (Monthly & Yearly)**: Auto-renewing plans supporting real-time status display, renewals, cancellations, expirations, and upgrade/downgrade flows with Google Play proration modes.

### 🛡️ Security Requirement: Zero-Trust Client Model
The application strictly enforces a **Zero-Trust Client Policy**:
- **Never unlock features or add credits solely from client-side Google Play callbacks.**
- All purchase tokens, order IDs, and product identifiers are submitted to a **Verification Backend** that validates:
  1. Package name authenticity (`com.playbillingdemo`).
  2. Purchase token validity and signature against Google Play Developer API standards (`purchases.products.get` and `purchases.subscriptionsv2.get`).
  3. **Idempotency & Anti-Replay Ledger**: Guarantees that duplicate transaction replays are rejected and credits cannot be doubled.

---

## 2. End-to-End Purchase & Verification Lifecycle

```
[User Taps "Purchase" on Store Screen]
                  │
                  ▼
[Google Play Billing Flow: requestPurchase / requestSubscription]
                  │
                  ├── User Cancels ──────► Graceful exit (Code: USER_CANCELED), no error popups
                  ├── Network Fails ─────► Error toast, token stays safe in Google Play cache
                  │
                  ▼
[PurchasesUpdatedListener receives Purchase Object]
                  │
                  ├── State == PENDING (UPI / Slow Test Card) 
                  │     └─► Withhold entitlements, show "Pending Confirmation" banner
                  │
                  ▼ (State == PURCHASED)
[POST /api/v1/billing/verify-purchase] ──► Mock Play Developer API Layer
                  │
                  ├── Replay Attack / Already Credited ──► Rejection (HTTP 409 DUPLICATE_TRANSACTION)
                  │
                  ▼ (Verified: Success)
[Fulfillment & Entitlement Action]
                  ├── If Consumable (Credits):
                  │     1. Call RNIap.consumePurchaseAndroid({ purchaseToken })
                  │     2. Increment local credit balance (persisted in AsyncStorage)
                  │     3. Record in Purchase History as COMPLETED
                  │
                  └── If Non-Consumable or Subscription:
                        1. Call RNIap.acknowledgePurchaseAndroid({ purchaseToken })
                        2. Activate Lifetime / Subscription tier in UserContext
                        3. Record in Purchase History as COMPLETED
```

---

## 3. Product Catalog & Play Console Configuration

| Category | Product ID (SKU) | Sample Price | Lifecycle & Google Play Action |
| :--- | :--- | :--- | :--- |
| **Consumable** | `credits_100` | ₹49 | **Consumed** immediately via `consumePurchaseAndroid()`. Repeat purchases enabled. |
| **Consumable** | `credits_500` | ₹199 | **Consumed** immediately. Replenishes balance. |
| **Consumable** | `credits_1000` | ₹349 | **Consumed** immediately. Mega value credit pack. |
| **Non-Consumable** | `premium_lifetime` | ₹999 | **Acknowledged** via `acknowledgePurchaseAndroid()`. Marked as "Already Owned"; blocks duplicate buys. |
| **Subscription** | `premium_subscription:monthly-plan` | ₹199/month | **Acknowledged**. Auto-renewing, cancels via Play Store, supports upgrading to Yearly. |
| **Subscription** | `premium_subscription:yearly-plan` | ₹1,499/year | **Acknowledged**. Supports downgrade to Monthly with `IMMEDIATE_WITH_TIME_PRORATION`. |

---

## 4. Handling All 13 Evaluation Scenarios

| # | Payment / Lifecycle Scenario | How It Is Implemented & Handled in the App |
| :--- | :--- | :--- |
| **1** | **Successful payment** | Handled in `purchaseUpdatedListener`, verified via backend, acknowledged/consumed, balance updated. |
| **2** | **User cancels payment** | Handled in `purchaseErrorListener` (`E_USER_CANCELLED`); clears loading indicators cleanly with no disruptive error alerts. |
| **3** | **Payment fails** | Error caught and mapped to user-friendly messages ("Payment was declined by bank/issuer"). |
| **4** | **Pending payment (UPI / Slow Card)** | Detects `purchaseState === 2` (`PENDING`). Withholds credits; logs a `PENDING` transaction in history until Google confirms payment. |
| **5** | **Duplicate purchase attempt** | Google Play blocks re-buying unconsumed non-consumables; backend idempotency ledger blocks replaying consumable tokens. |
| **6** | **App killed during purchase** | `recoverInterruptedPurchases()` executes on app launch, scans unconsumed tokens via `getAvailablePurchases()`, and resumes fulfillment. |
| **7** | **Internet disconnected** | Handled gracefully without crash; tokens remain safely queued in Google Play cache until connection resumes. |
| **8** | **App restarted after purchase** | Balances, lifetime status, and active plans are persisted in local storage (`AsyncStorage`) and hydrated on startup. |
| **9** | **Restored on another device** | User taps **"Restore Purchases"**; app queries `getAvailablePurchases()`, re-verifies tokens with backend, and unlocks access. |
| **10**| **Subscription renewal** | Handled via RTDN notification engine; automatically extends the subscription `expiryDate`. |
| **11**| **Subscription cancellation** | User cancels via Google Play Subscriptions center; access remains active until the current billing period ends. |
| **12**| **Subscription expiry** | When `expiryTimeMillis < Date.now()`, the app automatically revokes premium access and reverts to free tier. |
| **13**| **Refund or revoked purchase** | Verification layer checks token status; revoked tokens trigger immediate removal of entitlements. |

---

## 5. UI Architecture (The 3 Required Screens)

### Screen 1 — Home Screen
- **Credit Balance Counter:** Large live display of available credits.
- **"Spend 50 Credits" Action:** Demonstrates in-app credit consumption.
- **Membership Status Badges:** Visual indicators for *Lifetime Premium (ACTIVE/LOCKED)* and *Subscription Tier (Monthly/Yearly/INACTIVE)*.
- **Quick Actions:** Visit Store, Purchase History, and Restore Purchases.
- **Sandbox Evaluation Panel:** Includes a **"Simulated Mode"** toggle and scenario buttons to test any edge case on-demand.

### Screen 2 — Digital Store Screen
- Clean categorization: **Coin Packs (100, 500, 1000)**, **Lifetime Premium Card**, and **Subscription Plans**.
- Dynamic prices fetched directly from Google Play (`ProductDetails` API).
- Smart buttons: Shows loading spinner during purchase flow, changes to "Already Owned" for Lifetime Premium, and supports switching between Monthly and Yearly subscriptions.

### Screen 3 — Purchase History Screen
- Audit trail of all transactions with Order IDs (`GPA.XXXX-XXXX`), date/time, price, purchase type, and status badges (`COMPLETED`, `PENDING`, `REFUNDED`).

---

## 6. Technical Stack & Implementation Details

- **Framework:** React Native `0.76.1` (Android SDK 34, NDK 27 Darwin toolchain).
- **Billing Library:** `react-native-iap` (v12+, Google Play Billing Library 7.1.1).
- **Android Manifest:** Configured with `com.android.vending.BILLING` and `android:usesCleartextTraffic="true"` for Metro bundler connectivity.
- **Gradle Configuration:** Uses modern `com.facebook.react.settings` autolinking and `missingDimensionStrategy "store", "play"` to ensure Google Play variant resolution.
- **Verification Server:** Dual-mode architecture:
  - **Embedded In-App Mock Engine** (`src/api/mockBackendServer.ts`) for zero-config grading on any device.
  - **Standalone Node.js Server** (`server/mockServer.js`) runnable via `npm run server` for HTTP network inspection.

---

## 7. Automated Testing & Verification Proof

All 7 core test suites pass cleanly via `node test-runner.js`:
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

### Live Status
- **Location:** `/Users/nikita/Data/Nikita/Projects/GooglePlayBillingDemo`
- **Live Build:** Compiled, installed, and verified running on Android emulator (`emulator-5554`).
- **Screenshot:** Captured and saved to `screenshot_home.png`.
