import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Проверяем, работаем ли в Expo Go (где нативные модули не работают)
const isExpoGo = Constants.executionEnvironment === 'storeClient';

// RevenueCat API ключи (получите на https://app.revenuecat.com)
const REVENUECAT_API_KEY_IOS = 'test_sTsrhXMKJMmNrYrUdNBjGGYdEbt';
const REVENUECAT_API_KEY_ANDROID = 'YOUR_ANDROID_API_KEY';

// Динамический импорт для Expo Go
let Purchases: any = null;
if (!isExpoGo) {
  try {
    Purchases = require('react-native-purchases');
  } catch (e) {
    console.warn('react-native-purchases not available');
  }
}

// ID подписок (создайте в App Store Connect и RevenueCat)
export const SUBSCRIPTION_IDS = {
  monthly: 'monthly_premium',
  yearly: 'yearly_premium',
};

export interface SubscriptionStatus {
  isActive: boolean;
  expirationDate?: Date;
  productId?: string;
}

class SubscriptionService {
  private initialized = false;

  async initialize(userId?: string): Promise<void> {
    if (this.initialized) return;

    // В Expo Go RevenueCat не работает, используем мок
    if (isExpoGo || !Purchases) {
      console.log('Running in Expo Go - subscriptions disabled (use development build for full features)');
      this.initialized = true;
      return;
    }

    try {
      const apiKey = Platform.OS === 'ios' 
        ? REVENUECAT_API_KEY_IOS 
        : REVENUECAT_API_KEY_ANDROID;

      await Purchases.configure({ apiKey });
      
      if (userId) {
        await Purchases.logIn(userId);
      }

      this.initialized = true;
      console.log('RevenueCat initialized');
    } catch (error) {
      console.error('Failed to initialize RevenueCat:', error);
      throw error;
    }
  }

  async getAvailableSubscriptions(): Promise<any[]> {
    // В Expo Go возвращаем мок данные
    if (isExpoGo || !Purchases) {
      return [
        {
          identifier: '$rc_monthly',
          packageType: 'MONTHLY',
          product: {
            identifier: 'monthly',
            priceString: '$4.99',
            title: 'Monthly Premium',
            description: 'Monthly subscription (Expo Go - mock data)',
          },
        },
        {
          identifier: '$rc_annual',
          packageType: 'ANNUAL',
          product: {
            identifier: 'yearly',
            priceString: '$39.99',
            title: 'Annual Premium',
            description: 'Annual subscription (Expo Go - mock data)',
          },
        },
      ];
    }

    try {
      const offerings = await Purchases.getOfferings();
      
      if (offerings.current !== null) {
        return offerings.current.availablePackages;
      }
      
      return [];
    } catch (error) {
      console.error('Failed to get offerings:', error);
      return [];
    }
  }

  async purchaseSubscription(packageToPurchase: any): Promise<boolean> {
    // В Expo Go покупки не работают
    if (isExpoGo || !Purchases) {
      console.log('Purchases not available in Expo Go. Use development build for real purchases.');
      return false;
    }

    try {
      const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
      
      // Проверяем, активна ли подписка
      return customerInfo.entitlements.active['premium'] !== undefined;
    } catch (error: any) {
      if (error.userCancelled) {
        console.log('User cancelled purchase');
        return false;
      }
      console.error('Purchase error:', error);
      throw error;
    }
  }

  async restorePurchases(): Promise<boolean> {
    // В Expo Go восстановление не работает
    if (isExpoGo || !Purchases) {
      console.log('Restore not available in Expo Go. Use development build for real restore.');
      return false;
    }

    try {
      const customerInfo = await Purchases.restorePurchases();
      return customerInfo.entitlements.active['premium'] !== undefined;
    } catch (error) {
      console.error('Restore error:', error);
      return false;
    }
  }

  async checkSubscriptionStatus(): Promise<SubscriptionStatus> {
    // В Expo Go всегда возвращаем неактивную подписку
    if (isExpoGo || !Purchases) {
      return { isActive: false };
    }

    try {
      const customerInfo = await Purchases.getCustomerInfo();
      const entitlement = customerInfo.entitlements.active['premium'];

      if (entitlement) {
        return {
          isActive: true,
          expirationDate: new Date(entitlement.expirationDate),
          productId: entitlement.productIdentifier,
        };
      }

      return { isActive: false };
    } catch (error) {
      console.error('Failed to check subscription:', error);
      return { isActive: false };
    }
  }

  async getCurrentUserId(): Promise<string | null> {
    // В Expo Go возвращаем null
    if (isExpoGo || !Purchases) {
      return null;
    }

    try {
      const customerInfo = await Purchases.getCustomerInfo();
      return customerInfo.originalAppUserId;
    } catch (error) {
      console.error('Failed to get user ID:', error);
      return null;
    }
  }
}

export const subscriptionService = new SubscriptionService();

