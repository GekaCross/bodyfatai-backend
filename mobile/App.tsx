import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MainScreen from './src/screens/MainScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import { subscriptionService } from './src/services/subscription';

export default function App() {
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    // Для тестирования - всегда показываем onboarding при запуске
    // В продакшене раскомментируйте проверку AsyncStorage:
    // AsyncStorage.getItem('onboardingCompleted').then((value) => {
    //   setShowOnboarding(value !== 'true');
    // });
    setShowOnboarding(true);

    // Инициализируем RevenueCat при запуске приложения
    subscriptionService.initialize().catch((error) => {
      console.error('Failed to initialize subscriptions:', error);
    });
  }, []);

  const handleOnboardingComplete = async () => {
    // Для тестирования - не сохраняем статус onboarding
    // В продакшене раскомментируйте следующую строку:
    // await AsyncStorage.setItem('onboardingCompleted', 'true');
    setShowOnboarding(false);
  };

  // Показываем загрузку, пока проверяем onboarding
  if (showOnboarding === null) {
    return null;
  }

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      {showOnboarding ? (
        <OnboardingScreen onComplete={handleOnboardingComplete} />
      ) : (
        <MainScreen />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
});


