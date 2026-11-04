import React, { createContext, useContext, useEffect, useState } from 'react';
import { ActiveSubscriptionInfo, TransactionRecord } from '../types/billing';
import { StorageService } from '../services/storageService';

interface UserContextType {
  credits: number;
  isLifetimePremium: boolean;
  activeSubscription: ActiveSubscriptionInfo | null;
  transactions: TransactionRecord[];
  isLoading: boolean;
  addCredits: (amount: number) => Promise<void>;
  spendCredits: (amount: number) => Promise<boolean>;
  setLifetimePremiumStatus: (isPremium: boolean) => Promise<void>;
  updateSubscription: (sub: ActiveSubscriptionInfo | null) => Promise<void>;
  recordTransaction: (record: TransactionRecord) => Promise<void>;
  resetAccount: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [credits, setCredits] = useState<number>(0);
  const [isLifetimePremium, setIsLifetimePremium] = useState<boolean>(false);
  const [activeSubscription, setActiveSubscription] = useState<ActiveSubscriptionInfo | null>(null);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load persisted user state on app launch (Fulfills: "Maintain premium access after application restart")
  useEffect(() => {
    const loadState = async () => {
      try {
        const [savedCredits, savedPremium, savedSub, savedHistory] = await Promise.all([
          StorageService.getCreditBalance(),
          StorageService.getLifetimePremium(),
          StorageService.getActiveSubscription(),
          StorageService.getTransactionHistory(),
        ]);

        setCredits(savedCredits);
        setIsLifetimePremium(savedPremium);
        setActiveSubscription(savedSub);
        setTransactions(savedHistory);
      } catch (err) {
        console.error('Error hydrating user context from local storage:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadState();
  }, []);

  const addCredits = async (amount: number) => {
    const newBalance = credits + amount;
    setCredits(newBalance);
    await StorageService.saveCreditBalance(newBalance);
  };

  const spendCredits = async (amount: number): Promise<boolean> => {
    if (credits < amount) {
      return false;
    }
    const newBalance = credits - amount;
    setCredits(newBalance);
    await StorageService.saveCreditBalance(newBalance);
    return true;
  };

  const setLifetimePremiumStatus = async (isPremium: boolean) => {
    setIsLifetimePremium(isPremium);
    await StorageService.saveLifetimePremium(isPremium);
  };

  const updateSubscription = async (sub: ActiveSubscriptionInfo | null) => {
    setActiveSubscription(sub);
    await StorageService.saveActiveSubscription(sub);
  };

  const recordTransaction = async (record: TransactionRecord) => {
    setTransactions(prev => [record, ...prev.filter(t => t.id !== record.id)]);
    await StorageService.addTransaction(record);
  };

  const resetAccount = async () => {
    await StorageService.clearAllData();
    setCredits(0);
    setIsLifetimePremium(false);
    setActiveSubscription(null);
    setTransactions([]);
  };

  return (
    <UserContext.Provider
      value={{
        credits,
        isLifetimePremium,
        activeSubscription,
        transactions,
        isLoading,
        addCredits,
        spendCredits,
        setLifetimePremiumStatus,
        updateSubscription,
        recordTransaction,
        resetAccount,
      }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
