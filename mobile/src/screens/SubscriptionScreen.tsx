import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Constants from 'expo-constants';
import { subscriptionService, SubscriptionStatus } from '../services/subscription';

interface SubscriptionScreenProps {
  onClose: () => void;
  hasUsedFreeTrial?: boolean;
  onUseFreeTrial?: () => void;
}

// Проверяем, работаем ли в Expo Go
const isExpoGo = Constants.executionEnvironment === 'storeClient';

// Динамический импорт для Expo Go
let Purchases: any = null;
if (!isExpoGo) {
  try {
    Purchases = require('react-native-purchases');
  } catch (e) {
    console.warn('react-native-purchases not available');
  }
}

export default function SubscriptionScreen({ onClose, hasUsedFreeTrial = false, onUseFreeTrial }: SubscriptionScreenProps) {
  const [packages, setPackages] = useState<Purchases.Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>({ isActive: false });

  useEffect(() => {
    loadSubscriptions();
    checkStatus();
  }, []);

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      const availablePackages = await subscriptionService.getAvailableSubscriptions();
      setPackages(availablePackages);
    } catch (error) {
      console.error('Failed to load subscriptions:', error);
      Alert.alert('Error', 'Failed to load subscription options');
    } finally {
      setLoading(false);
    }
  };

  const checkStatus = async () => {
    const status = await subscriptionService.checkSubscriptionStatus();
    setSubscriptionStatus(status);
  };

  const handlePurchase = async (packageToPurchase: any) => {
    if (isExpoGo) {
      Alert.alert(
        'Expo Go Demo',
        'Purchases are not available in Expo Go. Build a development build to test real purchases.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      setPurchasing(packageToPurchase.identifier);
      const success = await subscriptionService.purchaseSubscription(packageToPurchase);
      
      if (success) {
        Alert.alert('Success', 'Subscription activated!', [
          { text: 'OK', onPress: onClose }
        ]);
        await checkStatus();
      }
    } catch (error: any) {
      if (!error.userCancelled) {
        Alert.alert('Error', error.message || 'Failed to purchase subscription');
      }
    } finally {
      setPurchasing(null);
    }
  };

  const handleRestore = async () => {
    try {
      setLoading(true);
      const restored = await subscriptionService.restorePurchases();
      
      if (restored) {
        Alert.alert('Success', 'Purchases restored!');
        await checkStatus();
        onClose();
      } else {
        Alert.alert('No Purchases', 'No active subscriptions found to restore');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to restore purchases');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (packageItem: any) => {
    return packageItem.product?.priceString || '$0.00';
  };

  const getPackageTitle = (packageItem: any) => {
    const packageType = packageItem.packageType;
    if (Purchases) {
      if (packageType === Purchases.PACKAGE_TYPE.MONTHLY) {
        return 'Monthly Premium';
      } else if (packageType === Purchases.PACKAGE_TYPE.ANNUAL) {
        return 'Annual Premium';
      } else if (packageType === Purchases.PACKAGE_TYPE.SIX_MONTH) {
        return '6-Month Premium';
      }
    } else {
      // Для Expo Go используем строковые значения
      if (packageType === 'MONTHLY' || packageItem.identifier === '$rc_monthly') {
        return 'Monthly Premium';
      } else if (packageType === 'ANNUAL' || packageItem.identifier === '$rc_annual') {
        return 'Annual Premium';
      }
    }
    return 'Premium';
  };

  const getPackageDescription = (packageItem: any) => {
    const packageType = packageItem.packageType;
    if (Purchases) {
      if (packageType === Purchases.PACKAGE_TYPE.ANNUAL) {
        return 'Best value - Save 50%';
      }
    } else {
      // Для Expo Go
      if (packageType === 'ANNUAL' || packageItem.identifier === '$rc_annual') {
        return 'Best value - Save 50%';
      }
    }
    return 'Full access to all features';
  };

  if (subscriptionStatus.isActive) {
    return (
      <View style={styles.container}>
        <View style={styles.activeContainer}>
          <Text style={styles.activeTitle}>✓ Premium Active</Text>
          {subscriptionStatus.expirationDate && (
            <Text style={styles.activeText}>
              Expires: {subscriptionStatus.expirationDate.toLocaleDateString()}
            </Text>
          )}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Unlock Premium</Text>
        {!hasUsedFreeTrial && (
          <View style={styles.freeTrialBadge}>
            <Text style={styles.freeTrialBadgeText}>🎁 First Time Free!</Text>
          </View>
        )}
        <Text style={styles.subtitle}>
          {!hasUsedFreeTrial 
            ? 'Try it free for the first time, then unlock unlimited access'
            : 'Get unlimited access to all features'}
        </Text>
      </View>

      <View style={styles.features}>
        <Text style={styles.featuresTitle}>What you get with Premium:</Text>
        <FeatureItem icon="📸" text="Unlimited photo analysis" />
        <FeatureItem icon="📊" text="Detailed body composition reports" />
        <FeatureItem icon="💪" text="Personalized workout plans" />
        <FeatureItem icon="🍎" text="Custom nutrition recommendations" />
        <FeatureItem icon="📈" text="Progress tracking over time" />
        <FeatureItem icon="🔔" text="Priority support" />
      </View>

      {!hasUsedFreeTrial && (
        <TouchableOpacity 
          style={styles.freeTrialButton}
          onPress={() => {
            if (onUseFreeTrial) {
              onUseFreeTrial();
            }
          }}
        >
          <Text style={styles.freeTrialButtonText}>✨ Try Free Now (First Time Only)</Text>
        </TouchableOpacity>
      )}

      {isExpoGo && (
        <View style={styles.expoGoWarning}>
          <Text style={styles.expoGoWarningText}>
            ⚠️ Running in Expo Go{'\n'}
            Subscriptions are in demo mode.{'\n'}
            Use development build for real purchases.
          </Text>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color="#667eea" style={styles.loader} />
      ) : (
        <View style={styles.packages}>
          {packages.map((pkg) => {
            const isAnnual = Purchases 
              ? pkg.packageType === Purchases.PACKAGE_TYPE.ANNUAL
              : pkg.packageType === 'ANNUAL' || pkg.identifier === '$rc_annual';
            
            return (
              <TouchableOpacity
                key={pkg.identifier}
                style={[
                  styles.packageCard,
                  isAnnual && styles.packageCardFeatured,
                ]}
                onPress={() => handlePurchase(pkg)}
                disabled={purchasing !== null}
              >
                {isAnnual && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>BEST VALUE</Text>
                  </View>
                )}
              <Text style={styles.packageTitle}>{getPackageTitle(pkg)}</Text>
              <Text style={styles.packageDescription}>{getPackageDescription(pkg)}</Text>
              <Text style={styles.packagePrice}>{formatPrice(pkg)}</Text>
              {purchasing === pkg.identifier ? (
                <ActivityIndicator color="#fff" style={styles.purchaseLoader} />
              ) : (
                <Text style={styles.packageButton}>Subscribe</Text>
              )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <TouchableOpacity style={styles.restoreButton} onPress={handleRestore}>
        <Text style={styles.restoreButtonText}>Restore Purchases</Text>
      </TouchableOpacity>

      <Text style={styles.terms}>
        Subscriptions will auto-renew unless cancelled at least 24 hours before the end of the current period.
      </Text>
    </ScrollView>
  );
}

function FeatureItem({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.featureItem}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
  },
  freeTrialBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 10,
    marginBottom: 5,
  },
  freeTrialBadgeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  freeTrialButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  freeTrialButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  features: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  packages: {
    marginBottom: 20,
  },
  packageCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    position: 'relative',
  },
  packageCardFeatured: {
    borderColor: '#667eea',
    backgroundColor: '#f8f9ff',
  },
  badge: {
    position: 'absolute',
    top: -10,
    right: 20,
    backgroundColor: '#667eea',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  packageTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  packageDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  packagePrice: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#667eea',
    marginBottom: 12,
  },
  packageButton: {
    backgroundColor: '#667eea',
    color: '#fff',
    padding: 12,
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    overflow: 'hidden',
  },
  purchaseLoader: {
    marginTop: 12,
  },
  restoreButton: {
    padding: 15,
    alignItems: 'center',
  },
  restoreButtonText: {
    color: '#667eea',
    fontSize: 16,
    fontWeight: '600',
  },
  terms: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 18,
  },
  activeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  activeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 12,
  },
  activeText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
  closeButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loader: {
    marginVertical: 40,
  },
  expoGoWarning: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffc107',
    borderWidth: 1,
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
  },
  expoGoWarningText: {
    color: '#856404',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});

