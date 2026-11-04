import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActiveSubscriptionInfo, TransactionRecord } from '../types/billing';

const STORAGE_KEYS = {
  CREDIT_BALANCE: '@billing_demo:credit_balance',
  LIFETIME_PREMIUM: '@billing_demo:lifetime_premium',
  ACTIVE_SUBSCRIPTION: '@billing_demo:active_subscription',
  TRANSACTION_HISTORY: '@billing_demo:transaction_history',
  PROCESSED_TOKENS: '@billing_demo:processed_tokens',
};

export const StorageService = {
  // Credits
  async getCreditBalance(): Promise<number> {
    try {
      const val = await AsyncStorage.getItem(STORAGE_KEYS.CREDIT_BALANCE);
      return val ? parseInt(val, 10) : 0;
    } catch {
      return 0;
    }
  },

  async saveCreditBalance(balance: number): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CREDIT_BALANCE, balance.toString());
    } catch (e) {
      console.error('Failed to save credit balance', e);
    }
  },

  // Lifetime Premium
  async getLifetimePremium(): Promise<boolean> {
    try {
      const val = await AsyncStorage.getItem(STORAGE_KEYS.LIFETIME_PREMIUM);
      return val === 'true';
    } catch {
      return false;
    }
  },

  async saveLifetimePremium(isPremium: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LIFETIME_PREMIUM, isPremium ? 'true' : 'false');
    } catch (e) {
      console.error('Failed to save lifetime premium status', e);
    }
  },

  // Subscription
  async getActiveSubscription(): Promise<ActiveSubscriptionInfo | null> {
    try {
      const val = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_SUBSCRIPTION);
      return val ? JSON.parse(val) : null;
    } catch {
      return null;
    }
  },

  async saveActiveSubscription(sub: ActiveSubscriptionInfo | null): Promise<void> {
    try {
      if (!sub) {
        await AsyncStorage.removeItem(STORAGE_KEYS.ACTIVE_SUBSCRIPTION);
      } else {
        await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_SUBSCRIPTION, JSON.stringify(sub));
      }
    } catch (e) {
      console.error('Failed to save active subscription', e);
    }
  },

  // Transaction History
  async getTransactionHistory(): Promise<TransactionRecord[]> {
    try {
      const val = await AsyncStorage.getItem(STORAGE_KEYS.TRANSACTION_HISTORY);
      return val ? JSON.parse(val) : [];
    } catch {
      return [];
    }
  },

  async addTransaction(record: TransactionRecord): Promise<void> {
    try {
      const current = await this.getTransactionHistory();
      // Prepend newest transaction
      const updated = [record, ...current.filter(t => t.id !== record.id)];
      await AsyncStorage.setItem(STORAGE_KEYS.TRANSACTION_HISTORY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to add transaction record', e);
    }
  },

  // Idempotency: Processed Tokens
  async isTokenProcessed(token: string): Promise<boolean> {
    try {
      const val = await AsyncStorage.getItem(STORAGE_KEYS.PROCESSED_TOKENS);
      const list: string[] = val ? JSON.parse(val) : [];
      return list.includes(token);
    } catch {
      return false;
    }
  },

  async markTokenProcessed(token: string): Promise<void> {
    try {
      const val = await AsyncStorage.getItem(STORAGE_KEYS.PROCESSED_TOKENS);
      const list: string[] = val ? JSON.parse(val) : [];
      if (!list.includes(token)) {
        list.push(token);
        await AsyncStorage.setItem(STORAGE_KEYS.PROCESSED_TOKENS, JSON.stringify(list));
      }
    } catch (e) {
      console.error('Failed to mark token processed', e);
    }
  },

  // Reset for Demo testing
  async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.CREDIT_BALANCE,
        STORAGE_KEYS.LIFETIME_PREMIUM,
        STORAGE_KEYS.ACTIVE_SUBSCRIPTION,
        STORAGE_KEYS.TRANSACTION_HISTORY,
        STORAGE_KEYS.PROCESSED_TOKENS,
      ]);
    } catch (e) {
      console.error('Failed to clear storage data', e);
    }
  },
};
