import { GoogleSubscriptionState } from '../types/billing';

export type RTDNNotificationType =
  | 'SUBSCRIPTION_RENEWED'
  | 'SUBSCRIPTION_CANCELED'
  | 'SUBSCRIPTION_EXPIRED'
  | 'SUBSCRIPTION_IN_GRACE_PERIOD'
  | 'SUBSCRIPTION_ON_HOLD'
  | 'PURCHASE_REVOKED_REFUND';

export interface RTDNPayload {
  version: string;
  packageName: string;
  eventTimeMillis: number;
  subscriptionNotification?: {
    version: string;
    notificationType: number;
    purchaseToken: string;
    subscriptionId: string;
  };
  oneTimeProductNotification?: {
    version: string;
    notificationType: number;
    purchaseToken: string;
    sku: string;
  };
}

/**
 * RTDN Notification Simulator (Google Cloud Pub/Sub)
 */
export const NotificationSimulator = {
  createSubscriptionEvent(
    type: RTDNNotificationType,
    subscriptionId: string,
    purchaseToken: string
  ): { type: RTDNNotificationType; state: GoogleSubscriptionState; message: string } {
    switch (type) {
      case 'SUBSCRIPTION_RENEWED':
        return {
          type,
          state: GoogleSubscriptionState.SUBSCRIPTION_STATE_ACTIVE,
          message: 'Real-Time Notification: Google Play processed automatic recurring renewal.',
        };
      case 'SUBSCRIPTION_CANCELED':
        return {
          type,
          state: GoogleSubscriptionState.SUBSCRIPTION_STATE_CANCELED,
          message: 'Real-Time Notification: User canceled recurring subscription from Play Store. Access remains until cycle end.',
        };
      case 'SUBSCRIPTION_IN_GRACE_PERIOD':
        return {
          type,
          state: GoogleSubscriptionState.SUBSCRIPTION_STATE_IN_GRACE_PERIOD,
          message: 'Real-Time Notification: Renewal payment failed. Subscription placed in 3-day Grace Period.',
        };
      case 'SUBSCRIPTION_ON_HOLD':
        return {
          type,
          state: GoogleSubscriptionState.SUBSCRIPTION_STATE_ON_HOLD,
          message: 'Real-Time Notification: Grace period ended without payment. Subscription is now on Account Hold.',
        };
      case 'SUBSCRIPTION_EXPIRED':
        return {
          type,
          state: GoogleSubscriptionState.SUBSCRIPTION_STATE_EXPIRED,
          message: 'Real-Time Notification: Subscription expired. Entitlements revoked.',
        };
      case 'PURCHASE_REVOKED_REFUND':
        return {
          type,
          state: GoogleSubscriptionState.SUBSCRIPTION_STATE_EXPIRED,
          message: 'Real-Time Notification: User was issued a refund. In-app features revoked.',
        };
      default:
        return {
          type,
          state: GoogleSubscriptionState.SUBSCRIPTION_STATE_ACTIVE,
          message: 'Unknown notification event.',
        };
    }
  },
};
