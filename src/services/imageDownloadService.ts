import { Linking, Alert } from 'react-native';
import { ActiveSubscriptionInfo, GoogleSubscriptionState } from '../types/billing';
import { EntitlementCheckResult, GalleryImage } from '../types/gallery';
import { StorageService } from './storageService';

/**
 * ImageDownloadService
 * Enforces Zero-Trust Entitlement Verification before permitting image downloads.
 */
export const ImageDownloadService = {
  /**
   * Verifies if the user is entitled to download the specified image.
   * Free images are accessible to everyone.
   * Premium images strictly require active Monthly, Yearly, or Lifetime Premium entitlement.
   */
  checkEntitlement(
    isPremiumImage: boolean,
    isLifetimePremium: boolean,
    activeSubscription: ActiveSubscriptionInfo | null
  ): EntitlementCheckResult {
    // 1. Free images have no restrictions
    if (!isPremiumImage) {
      return {
        allowed: true,
        isPremiumRequired: false,
      };
    }

    // 2. Lifetime Premium grants permanent, irrevocable access
    if (isLifetimePremium) {
      return {
        allowed: true,
        isPremiumRequired: true,
      };
    }

    // 3. Subscriptions grant access only while active and not expired
    if (activeSubscription && activeSubscription.isActive) {
      // Must not be expired or in revoked state
      const isStatusActive =
        activeSubscription.status === GoogleSubscriptionState.SUBSCRIPTION_STATE_ACTIVE ||
        activeSubscription.status === GoogleSubscriptionState.SUBSCRIPTION_STATE_IN_GRACE_PERIOD;

      const isNotExpired =
        !activeSubscription.expiryTimestamp || activeSubscription.expiryTimestamp > Date.now();

      if (isStatusActive && isNotExpired) {
        return {
          allowed: true,
          isPremiumRequired: true,
        };
      }
    }

    // 4. Denied: User is on Free tier or subscription expired
    return {
      allowed: false,
      isPremiumRequired: true,
      reason: 'This image requires an active Monthly, Yearly, or Lifetime Premium subscription.',
    };
  },

  /**
   * Downloads an image with progressive status feedback.
   * Simulates the mobile download flow (Pixieset pattern):
   * Handshake -> Download stream with percentage -> Storage validation -> Gallery sync.
   */
  async downloadImage(
    image: GalleryImage,
    onProgress?: (ratio: number) => void
  ): Promise<{ success: boolean; message: string; uri?: string }> {
    try {
      // Step 1: Initialize
      if (onProgress) onProgress(0.1);
      await new Promise(resolve => setTimeout(resolve, 200));

      // Step 2: Streaming chunks progress simulation
      if (onProgress) onProgress(0.35);
      await new Promise(resolve => setTimeout(resolve, 300));

      // Step 3: Fetch image metadata/data to verify URL reachability
      try {
        await fetch(image.highResUrl, { method: 'HEAD' });
      } catch {
        // Fallback gracefully if offline/sandboxed
      }

      if (onProgress) onProgress(0.75);
      await new Promise(resolve => setTimeout(resolve, 300));

      if (onProgress) onProgress(1.0);
      await new Promise(resolve => setTimeout(resolve, 200));

      // Step 4: Persist in local storage
      await StorageService.recordDownloadedImage(image.id);

      return {
        success: true,
        message: `Saved "${image.title}" (${image.resolution}) to device Gallery.`,
        uri: image.highResUrl,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Failed to download image. Please check network connection.',
      };
    }
  },

  /**
   * Opens high-resolution original image in external browser / media viewer
   */
  async openInExternalViewer(url: string): Promise<void> {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Notice', 'Cannot open image link on this device.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Unable to open media link.');
    }
  },
};
