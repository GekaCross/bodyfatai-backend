import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  Image,
} from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { calculateBodyFat, getAdvice, AdviceResponse } from '../api/client';
import { subscriptionService, SubscriptionStatus } from '../services/subscription';
import SubscriptionScreen from './SubscriptionScreen';

type Gender = 'male' | 'female';

interface BodyFatResult {
  body_fat_percent: number;
  comment: string;
  evaluation?: string;
}

export default function MainScreen() {
  const [currentStep, setCurrentStep] = useState(1); // 1: Photos, 2: Data, 3: Result, 4: Advice
  const [unitSystem, setUnitSystem] = useState<'metric' | 'imperial'>('metric');
  const [gender, setGender] = useState<Gender | null>(null);
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [heightFeet, setHeightFeet] = useState('');
  const [heightInches, setHeightInches] = useState('');
  const [weight, setWeight] = useState('');
  const [waist, setWaist] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [result, setResult] = useState<BodyFatResult | null>(null);
  const [advice, setAdvice] = useState<AdviceResponse | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>({ isActive: false }); // По умолчанию неактивна
  const [showSubscriptionScreen, setShowSubscriptionScreen] = useState(false);
  const [checkingSubscription, setCheckingSubscription] = useState(true);
  const [hasUsedFreeTrial, setHasUsedFreeTrial] = useState(false);
  const [isUsingFreeTrial, setIsUsingFreeTrial] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingAdviceProgress, setLoadingAdviceProgress] = useState(0);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const adviceProgressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Для тестирования - всегда сбрасываем статус бесплатной попытки при запуске
    // В продакшене раскомментируйте checkFreeTrial() и закомментируйте следующие строки
    console.log('=== APP STARTED - RESETTING ALL STATES ===');
    setHasUsedFreeTrial(false);
    setIsUsingFreeTrial(false);
    setShowSubscriptionScreen(false);
    // Убеждаемся, что подписка неактивна при запуске
    setSubscriptionStatus({ isActive: false });
    console.log('All states reset: hasUsedFreeTrial=false, isUsingFreeTrial=false, subscription=inactive');
    // checkFreeTrial();
    checkSubscription();
    requestImagePickerPermission();
  }, []);
  
  // Отладочный useEffect для отслеживания изменений showSubscriptionScreen
  useEffect(() => {
    console.log('🔔 showSubscriptionScreen changed to:', showSubscriptionScreen);
    if (showSubscriptionScreen) {
      console.log('✅✅✅ SUBSCRIPTION SCREEN IS NOW TRUE - MODAL SHOULD BE VISIBLE! ✅✅✅');
    }
  }, [showSubscriptionScreen]);

  const checkFreeTrial = async () => {
    const used = await AsyncStorage.getItem('freeTrialUsed');
    setHasUsedFreeTrial(used === 'true');
  };

  const requestImagePickerPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'We need camera roll permissions to upload photos');
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        const newPhotos = result.assets.map(asset => asset.uri);
        setPhotos([...photos, ...newPhotos]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleRemovePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    setPhotos(newPhotos);
  };

  const handleRemoveAllPhotos = () => {
    setPhotos([]);
  };

  const checkSubscription = async () => {
    try {
      setCheckingSubscription(true);
      const status = await subscriptionService.checkSubscriptionStatus();
      console.log('Subscription status checked:', status);
      setSubscriptionStatus(status);
    } catch (error) {
      console.error('Failed to check subscription:', error);
      // В случае ошибки устанавливаем неактивную подписку
      setSubscriptionStatus({ isActive: false });
    } finally {
      setCheckingSubscription(false);
    }
  };

  const convertToMetric = () => {
    let heightCm = 0;
    let weightKg = 0;
    let waistCm: number | undefined = undefined;

    if (unitSystem === 'imperial') {
      // Convert height from feet/inches to cm
      const feet = parseFloat(heightFeet) || 0;
      const inches = parseFloat(heightInches) || 0;
      const totalInches = feet * 12 + inches;
      heightCm = totalInches * 2.54;

      // Convert weight from lbs to kg
      const lbs = parseFloat(weight) || 0;
      weightKg = lbs * 0.453592;

      // Convert waist from inches to cm
      if (waist) {
        const waistInches = parseFloat(waist) || 0;
        waistCm = waistInches * 2.54;
      }
    } else {
      heightCm = parseFloat(height) || 0;
      weightKg = parseFloat(weight) || 0;
      waistCm = waist ? parseFloat(waist) : undefined;
    }

    return { heightCm, weightKg, waistCm };
  };

  const validateInputs = (): boolean => {
    if (!gender) {
      Alert.alert('Error', 'Please select gender');
      return false;
    }
    if (!age || isNaN(Number(age)) || Number(age) <= 0) {
      Alert.alert('Error', 'Please enter a valid age');
      return false;
    }
    
    if (unitSystem === 'imperial') {
      if (!heightFeet || isNaN(Number(heightFeet)) || Number(heightFeet) <= 0) {
        Alert.alert('Error', 'Please enter a valid height (feet)');
        return false;
      }
      if (!heightInches || isNaN(Number(heightInches)) || Number(heightInches) < 0) {
        Alert.alert('Error', 'Please enter a valid height (inches)');
        return false;
      }
    } else {
      if (!height || isNaN(Number(height)) || Number(height) <= 0) {
        Alert.alert('Error', 'Please enter a valid height (in cm)');
        return false;
      }
    }
    
    if (!weight || isNaN(Number(weight)) || Number(weight) <= 0) {
      Alert.alert('Error', unitSystem === 'imperial' ? 'Please enter a valid weight (in lbs)' : 'Please enter a valid weight (in kg)');
      return false;
    }
    
    if (waist && (isNaN(Number(waist)) || Number(waist) <= 0)) {
      Alert.alert('Error', unitSystem === 'imperial' ? 'Please enter a valid waist circumference (in inches)' : 'Please enter a valid waist circumference (in cm)');
      return false;
    }
    return true;
  };

  const switchUnitSystem = (system: 'metric' | 'imperial') => {
    if (system === unitSystem) return;

    // Convert values when switching
    if (system === 'metric') {
      // Convert from imperial to metric
      if (heightFeet && heightInches) {
        const feet = parseFloat(heightFeet) || 0;
        const inches = parseFloat(heightInches) || 0;
        const totalInches = feet * 12 + inches;
        const cm = totalInches * 2.54;
        setHeight(Math.round(cm).toString());
        setHeightFeet('');
        setHeightInches('');
      }
      if (weight) {
        const lbs = parseFloat(weight);
        if (lbs) {
          const kg = lbs * 0.453592;
          setWeight((Math.round(kg * 10) / 10).toString());
        }
      }
      if (waist) {
        const inches = parseFloat(waist);
        if (inches) {
          const cm = inches * 2.54;
          setWaist((Math.round(cm * 10) / 10).toString());
        }
      }
    } else {
      // Convert from metric to imperial
      if (height) {
        const cm = parseFloat(height);
        if (cm) {
          const totalInches = cm / 2.54;
          const feet = Math.floor(totalInches / 12);
          const inches = Math.round(totalInches % 12);
          setHeightFeet(feet.toString());
          setHeightInches(inches.toString());
          setHeight('');
        }
      }
      if (weight) {
        const kg = parseFloat(weight);
        if (kg) {
          const lbs = kg / 0.453592;
          setWeight((Math.round(lbs * 10) / 10).toString());
        }
      }
      if (waist) {
        const cm = parseFloat(waist);
        if (cm) {
          const inches = cm / 2.54;
          setWaist((Math.round(inches * 10) / 10).toString());
        }
      }
    }

    setUnitSystem(system);
  };

  const handleNextToStep2 = () => {
    setCurrentStep(2);
  };

  const handleBackToStep1 = () => {
    setCurrentStep(1);
  };

  const getEvaluation = (bodyFatPercent: number, gender: Gender): string => {
    if (gender === 'male') {
      if (bodyFatPercent < 6) return 'Very Low';
      if (bodyFatPercent < 14) return 'Low (Athletic)';
      if (bodyFatPercent < 18) return 'Normal';
      if (bodyFatPercent < 25) return 'Above Average';
      return 'High';
    } else {
      if (bodyFatPercent < 16) return 'Very Low';
      if (bodyFatPercent < 20) return 'Low (Athletic)';
      if (bodyFatPercent < 25) return 'Normal';
      if (bodyFatPercent < 32) return 'Above Average';
      return 'High';
    }
  };

  const handleCalculate = async (forceFreeTrial: boolean = false) => {
    if (!validateInputs()) {
      return;
    }

    console.log('=== handleCalculate START ===');
    console.log('forceFreeTrial:', forceFreeTrial);
    console.log('forceFreeTrial type:', typeof forceFreeTrial);
    console.log('forceFreeTrial === false:', forceFreeTrial === false);
    console.log('forceFreeTrial === true:', forceFreeTrial === true);
    console.log('!forceFreeTrial:', !forceFreeTrial);
    console.log('hasUsedFreeTrial:', hasUsedFreeTrial);
    console.log('subscriptionStatus.isActive:', subscriptionStatus.isActive);
    
    // КРИТИЧНО: Проверяем ПЕРЕД началом расчета
    // Если forceFreeTrial НЕ равен true, значит пользователь нажал "Calculate" - показываем экран подписки
    // Если forceFreeTrial === true, значит пользователь нажал "Try Free Now" - продолжаем расчет
    
    if (forceFreeTrial !== true) {
      // Пользователь нажал "Calculate" - ВСЕГДА показываем экран подписки
      console.log('>>> USER CLICKED CALCULATE - MUST SHOW SUBSCRIPTION SCREEN <<<');
      console.log('forceFreeTrial is NOT true, showing subscription screen');
      setShowSubscriptionScreen(true);
      console.log('✅ setShowSubscriptionScreen(true) called');
      console.log('⛔ EXITING handleCalculate - calculation will NOT start');
      return; // КРИТИЧНО: выходим, НЕ продолжаем расчет
    }
    
    // forceFreeTrial === true - пользователь нажал "Try Free Now", продолжаем расчет
    console.log('>>> forceFreeTrial is TRUE - Using free trial - proceeding with calculation <<<');

    setLoading(true);
    setLoadingProgress(0);
    setResult(null);
    setCurrentStep(3); // Переходим к шагу 3 сразу, чтобы показать прогресс
    
    // Запускаем анимацию прогресса
    progressIntervalRef.current = setInterval(() => {
      setLoadingProgress((prev) => {
        const newProgress = prev + Math.random() * 15;
        return newProgress > 90 ? 90 : newProgress;
      });
    }, 200);

    try {
      const { heightCm, weightKg, waistCm } = convertToMetric();
      
      const response = await calculateBodyFat({
        gender: gender!,
        age: Number(age),
        height: heightCm,
        weight: weightKg,
        waist: waistCm,
        images: photos.length > 0 ? photos : undefined,
      });

      // Добавляем evaluation, если его нет
      const resultWithEvaluation = {
        ...response,
        evaluation: response.evaluation || getEvaluation(response.body_fat_percent, gender!),
      };

      // Завершаем прогресс до 100%
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      setLoadingProgress(100);
      
      // Небольшая задержка, чтобы показать 100%
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setResult(resultWithEvaluation);
      
      // Если это была бесплатная попытка, отмечаем, что она использована
      // Для тестирования - не сохраняем в AsyncStorage, чтобы можно было тестировать много раз
      // В продакшене раскомментируйте следующие строки:
      // if (forceFreeTrial) {
      //   await AsyncStorage.setItem('freeTrialUsed', 'true');
      //   setHasUsedFreeTrial(true);
      // }
      if (forceFreeTrial) {
        setHasUsedFreeTrial(true);
        setIsUsingFreeTrial(false); // Сбрасываем флаг после использования
      }
    } catch (error: any) {
      console.error('Calculate error:', error);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      setLoadingProgress(0);
      const errorMessage = error?.message || error?.toString() || 'Failed to calculate body fat percentage. Please check your connection to the server.';
      Alert.alert('Error', errorMessage);
      setCurrentStep(2); // Возвращаемся к шагу 2 при ошибке
    } finally {
      setLoading(false);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    }
  };

  const handleGetAdvice = async () => {
    if (!result || !gender) return;

    setLoadingAdvice(true);
    setLoadingAdviceProgress(0);
    setCurrentStep(4);

    // Запускаем анимацию прогресса
    adviceProgressIntervalRef.current = setInterval(() => {
      setLoadingAdviceProgress((prev) => {
        const newProgress = prev + Math.random() * 15;
        return newProgress > 90 ? 90 : newProgress;
      });
    }, 200);

    try {
      const evaluation = result.evaluation || getEvaluation(result.body_fat_percent, gender);
      const adviceData = await getAdvice({
        body_fat_percent: result.body_fat_percent,
        gender: gender,
        age: Number(age),
        evaluation: evaluation,
      });

      // Завершаем прогресс до 100%
      if (adviceProgressIntervalRef.current) {
        clearInterval(adviceProgressIntervalRef.current);
        adviceProgressIntervalRef.current = null;
      }
      setLoadingAdviceProgress(100);
      
      // Небольшая задержка, чтобы показать 100%
      await new Promise(resolve => setTimeout(resolve, 300));

      setAdvice(adviceData);
    } catch (error: any) {
      console.error('Advice error:', error);
      if (adviceProgressIntervalRef.current) {
        clearInterval(adviceProgressIntervalRef.current);
        adviceProgressIntervalRef.current = null;
      }
      setLoadingAdviceProgress(0);
      Alert.alert('Error', 'Failed to load advice. Please try again.');
      setCurrentStep(3); // Возвращаемся к результату при ошибке
    } finally {
      setLoadingAdvice(false);
      if (adviceProgressIntervalRef.current) {
        clearInterval(adviceProgressIntervalRef.current);
        adviceProgressIntervalRef.current = null;
      }
    }
  };

  const handleBackToStep3 = () => {
    setCurrentStep(3);
  };

  const handleStartOver = () => {
    setCurrentStep(1);
    setResult(null);
    setAdvice(null);
    setPhotos([]);
    setGender(null);
    setAge('');
    setHeight('');
    setHeightFeet('');
    setHeightInches('');
    setWeight('');
    setWaist('');
    setUnitSystem('metric');
    setHasUsedFreeTrial(false); // Сбрасываем статус бесплатной попытки
  };

  const handleSubscriptionClose = async () => {
    setShowSubscriptionScreen(false);
    await checkSubscription();
  };

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>BodyFatAI</Text>
          <Text style={styles.subtitle}>Body Fat Percentage Calculator</Text>
          <TouchableOpacity
            style={styles.subscriptionButton}
            onPress={() => {
              console.log('Upgrade button pressed - showing subscription screen');
              setShowSubscriptionScreen(true);
            }}
          >
            <Text style={styles.subscriptionButtonText}>
              {subscriptionStatus.isActive ? '✓ Premium' : 'Upgrade to Premium'}
            </Text>
          </TouchableOpacity>
          
          {/* Тестовая кнопка для проверки Modal */}
          <TouchableOpacity
            style={[styles.subscriptionButton, { backgroundColor: '#ff4444', marginTop: 10 }]}
            onPress={() => {
              console.log('TEST BUTTON PRESSED - forcing subscription screen');
              setShowSubscriptionScreen(true);
              console.log('showSubscriptionScreen set to:', true);
            }}
          >
            <Text style={styles.subscriptionButtonText}>🧪 TEST: Show Subscription</Text>
          </TouchableOpacity>
        </View>

        {/* Step Indicator */}
        <View style={styles.stepIndicator}>
          <View style={[styles.stepDot, currentStep >= 1 && styles.stepDotActive]} />
          <View style={[styles.stepDot, currentStep >= 2 && styles.stepDotActive]} />
          <View style={[styles.stepDot, currentStep >= 3 && styles.stepDotActive]} />
          <View style={[styles.stepDot, currentStep >= 4 && styles.stepDotActive]} />
        </View>

        {/* Step 1: Photo Upload */}
        {currentStep === 1 && (
          <View style={styles.form}>
            <Text style={styles.sectionTitle}>Step 1: Upload Photos</Text>
            <TouchableOpacity style={styles.photoUploadArea} onPress={handlePickImage}>
              <Text style={styles.photoUploadIcon}>📸</Text>
              <Text style={styles.photoUploadText}>Click to upload photos</Text>
              <Text style={styles.photoUploadHint}>
                You can upload multiple photos. Full-body or torso photos from different angles are recommended
              </Text>
            </TouchableOpacity>

            {photos.length > 0 && (
              <View style={styles.photoPreview}>
                <View style={styles.photoGrid}>
                  {photos.map((uri, index) => (
                    <View key={index} style={styles.photoItem}>
                      <Image source={{ uri }} style={styles.photoImage} />
                      <TouchableOpacity
                        style={styles.removePhotoButton}
                        onPress={() => handleRemovePhoto(index)}
                      >
                        <Text style={styles.removePhotoButtonText}>×</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
                <TouchableOpacity
                  style={styles.removeAllButton}
                  onPress={handleRemoveAllPhotos}
                >
                  <Text style={styles.removeAllButtonText}>Remove All Photos</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={styles.button}
              onPress={handleNextToStep2}
            >
              <Text style={styles.buttonText}>Next</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 2: Data Input */}
        {currentStep === 2 && (
          <ScrollView 
            style={styles.form}
            contentContainerStyle={styles.formContent}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.sectionTitle}>Step 2: Enter Your Data</Text>
            
            {/* Unit System Toggle */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Measurement System</Text>
              <View style={styles.unitToggleContainer}>
                <TouchableOpacity
                  style={[
                    styles.unitToggleButton,
                    unitSystem === 'metric' && styles.unitToggleButtonActive,
                  ]}
                  onPress={() => switchUnitSystem('metric')}
                >
                  <Text
                    style={[
                      styles.unitToggleButtonText,
                      unitSystem === 'metric' && styles.unitToggleButtonTextActive,
                    ]}
                  >
                    Metric (cm, kg)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.unitToggleButton,
                    unitSystem === 'imperial' && styles.unitToggleButtonActive,
                  ]}
                  onPress={() => switchUnitSystem('imperial')}
                >
                  <Text
                    style={[
                      styles.unitToggleButtonText,
                      unitSystem === 'imperial' && styles.unitToggleButtonTextActive,
                    ]}
                  >
                    Imperial (ft/in, lbs)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Gender</Text>
          <View style={styles.genderContainer}>
            <TouchableOpacity
              style={[
                styles.genderButton,
                styles.genderButtonLeft,
                gender === 'male' && styles.genderButtonSelected,
              ]}
              onPress={() => setGender('male')}
            >
              <Text
                style={[
                  styles.genderButtonText,
                  gender === 'male' && styles.genderButtonTextSelected,
                ]}
              >
                Male
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.genderButton,
                styles.genderButtonRight,
                gender === 'female' && styles.genderButtonSelected,
              ]}
              onPress={() => setGender('female')}
            >
              <Text
                style={[
                  styles.genderButtonText,
                  gender === 'female' && styles.genderButtonTextSelected,
                ]}
              >
                Female
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Age (years)</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter age"
            keyboardType="numeric"
            value={age}
            onChangeText={setAge}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            {unitSystem === 'metric' ? 'Height (cm)' : 'Height (ft/in)'}
          </Text>
          {unitSystem === 'metric' ? (
            <TextInput
              style={styles.input}
              placeholder="Enter height in cm"
              keyboardType="numeric"
              value={height}
              onChangeText={setHeight}
            />
          ) : (
            <View style={styles.heightImperialContainer}>
              <TextInput
                style={[styles.input, styles.heightFeetInput]}
                placeholder="Feet"
                keyboardType="numeric"
                value={heightFeet}
                onChangeText={setHeightFeet}
              />
              <TextInput
                style={[styles.input, styles.heightInchesInput]}
                placeholder="Inches"
                keyboardType="numeric"
                value={heightInches}
                onChangeText={setHeightInches}
              />
            </View>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            {unitSystem === 'metric' ? 'Weight (kg)' : 'Weight (lbs)'}
          </Text>
          <TextInput
            style={styles.input}
            placeholder={unitSystem === 'metric' ? 'Enter weight in kg' : 'Enter weight in lbs'}
            keyboardType="numeric"
            value={weight}
            onChangeText={setWeight}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            {unitSystem === 'metric' ? 'Waist Circumference (cm)' : 'Waist Circumference (in)'}
          </Text>
          <Text style={styles.optionalLabel}>optional</Text>
          <TextInput
            style={styles.input}
            placeholder={unitSystem === 'metric' ? 'Enter waist circumference in cm' : 'Enter waist circumference in inches'}
            keyboardType="numeric"
            value={waist}
            onChangeText={setWaist}
          />
        </View>

            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBackToStep1}
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={() => {
                console.log('Calculate button pressed - calling handleCalculate with NO parameters');
                handleCalculate(false); // Явно передаем false
              }}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Calculate</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* Step 3: Result */}
        {currentStep === 3 && (
          <View style={styles.form}>
            <Text style={styles.sectionTitle}>Step 3: Your Result</Text>
            {loading ? (
              <View style={styles.loadingContainer}>
                <View style={styles.circularProgressContainer}>
                  <Svg width="120" height="120" viewBox="0 0 120 120">
                    <Circle
                      cx="60"
                      cy="60"
                      r="50"
                      stroke="#e0e0e0"
                      strokeWidth="8"
                      fill="none"
                    />
                    <G rotation="-90" origin="60, 60">
                      <Circle
                        cx="60"
                        cy="60"
                        r="50"
                        stroke="#4CAF50"
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray={314}
                        strokeDashoffset={314 - (314 * loadingProgress / 100)}
                        strokeLinecap="round"
                      />
                    </G>
                  </Svg>
                  <Text style={styles.progressPercent}>{Math.round(loadingProgress)}%</Text>
                </View>
                <Text style={styles.loadingText}>Calculating your body fat percentage...</Text>
              </View>
            ) : result ? (
              <View style={styles.resultContainer}>
                <View style={styles.resultBox}>
                  <Text style={styles.resultPercent}>
                    {result.body_fat_percent.toFixed(1)}%
                  </Text>
                  {result.evaluation && (
                    <Text style={[
                      styles.resultEvaluation,
                      result.evaluation === 'Normal' && styles.resultEvaluationNormal,
                      result.evaluation === 'Low (Athletic)' && styles.resultEvaluationLow,
                      result.evaluation === 'Very Low' && styles.resultEvaluationVeryLow,
                      result.evaluation === 'Above Average' && styles.resultEvaluationHigh,
                      result.evaluation === 'High' && styles.resultEvaluationVeryHigh,
                    ]}>
                      {result.evaluation}
                    </Text>
                  )}
                  <Text style={styles.resultComment}>{result.comment}</Text>
                </View>
              </View>
            ) : null}

            {!loading && result && (
              <>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={handleBackToStep1}
                >
                  <Text style={styles.backButtonText}>← Back</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.button}
                  onPress={handleGetAdvice}
                >
                  <Text style={styles.buttonText}>💡 Get Personalized Advice</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {/* Step 4: Advice */}
        {currentStep === 4 && (
          <View style={styles.form}>
            <Text style={styles.sectionTitle}>Step 4: Personalized Advice</Text>
            {loadingAdvice ? (
              <View style={styles.loadingContainer}>
                <View style={styles.circularProgressContainer}>
                  <Svg width="120" height="120" viewBox="0 0 120 120">
                    <Circle
                      cx="60"
                      cy="60"
                      r="50"
                      stroke="#e0e0e0"
                      strokeWidth="8"
                      fill="none"
                    />
                    <G rotation="-90" origin="60, 60">
                      <Circle
                        cx="60"
                        cy="60"
                        r="50"
                        stroke="#4CAF50"
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray={314}
                        strokeDashoffset={314 - (314 * loadingAdviceProgress / 100)}
                        strokeLinecap="round"
                      />
                    </G>
                  </Svg>
                  <Text style={styles.progressPercent}>{Math.round(loadingAdviceProgress)}%</Text>
                </View>
                <Text style={styles.loadingText}>Loading advice...</Text>
              </View>
            ) : advice ? (
              <View style={styles.adviceContainer}>
                <Text style={styles.adviceTitle}>{advice.title}</Text>
                {advice.sections.map((section, index) => {
                  const icons = ['🍎', '💪', '😴', '💧', '🧠', '📈'];
                  const isNutrition = section.title.toLowerCase().includes('nutrition');
                  const macros = section.macros;
                  
                  return (
                    <View key={index} style={styles.adviceSection}>
                      <View style={styles.adviceSectionHeader}>
                        <Text style={styles.adviceSectionIcon}>{icons[index] || '📋'}</Text>
                        <Text style={styles.adviceSectionTitle}>{section.title}</Text>
                      </View>
                      
                      {isNutrition && macros && (
                        <View style={styles.macrosContainer}>
                          {/* Daily Calories */}
                          {macros.calories && (
                            <View style={styles.dailyCalories}>
                              <View style={styles.caloriesLabel}>
                                <Text style={styles.caloriesIcon}>🔥</Text>
                                <Text style={styles.caloriesLabelText}>Daily Calories</Text>
                              </View>
                              <Text style={styles.caloriesValue}>
                                {macros.calories.min && macros.calories.max 
                                  ? `${macros.calories.min}-${macros.calories.max}`
                                  : macros.calories.min || macros.calories.max || 'N/A'} kcal
                              </Text>
                              {macros.calories.goal && (
                                <View style={[
                                  styles.caloriesGoal,
                                  macros.calories.goal.toLowerCase() === 'lose' && styles.caloriesGoalLose,
                                  macros.calories.goal.toLowerCase() === 'gain' && styles.caloriesGoalGain,
                                  macros.calories.goal.toLowerCase() === 'maintain' && styles.caloriesGoalMaintain,
                                ]}>
                                  <Text style={styles.caloriesGoalText}>{macros.calories.goal}</Text>
                                </View>
                              )}
                            </View>
                          )}
                          
                          {/* Macronutrients Split */}
                          <Text style={styles.macrosSplitTitle}>Macronutrients Split</Text>
                          
                          {macros.protein && macros.protein.percent !== undefined && (
                            <View style={styles.macroItem}>
                              <View style={styles.macroHeader}>
                                <Text style={styles.macroName}>🥩 Protein</Text>
                                <Text style={styles.macroPercent}>{macros.protein.percent}%</Text>
                              </View>
                              {macros.protein.grams && (
                                <Text style={styles.macroGrams}>{macros.protein.grams}g</Text>
                              )}
                              <View style={styles.macroProgress}>
                                <View style={[styles.macroProgressBar, styles.macroProgressBarProtein, { width: `${macros.protein.percent}%` }]} />
                              </View>
                            </View>
                          )}
                          
                          {macros.carbs && macros.carbs.percent !== undefined && (
                            <View style={styles.macroItem}>
                              <View style={styles.macroHeader}>
                                <Text style={styles.macroName}>🍞 Carbs</Text>
                                <Text style={styles.macroPercent}>{macros.carbs.percent}%</Text>
                              </View>
                              {macros.carbs.grams && (
                                <Text style={styles.macroGrams}>{macros.carbs.grams}g</Text>
                              )}
                              <View style={styles.macroProgress}>
                                <View style={[styles.macroProgressBar, styles.macroProgressBarCarbs, { width: `${macros.carbs.percent}%` }]} />
                              </View>
                            </View>
                          )}
                          
                          {macros.fats && macros.fats.percent !== undefined && (
                            <View style={styles.macroItem}>
                              <View style={styles.macroHeader}>
                                <Text style={styles.macroName}>🥑 Fats</Text>
                                <Text style={styles.macroPercent}>{macros.fats.percent}%</Text>
                              </View>
                              {macros.fats.grams && (
                                <Text style={styles.macroGrams}>{macros.fats.grams}g</Text>
                              )}
                              <View style={styles.macroProgress}>
                                <View style={[styles.macroProgressBar, styles.macroProgressBarFats, { width: `${macros.fats.percent}%` }]} />
                              </View>
                            </View>
                          )}
                        </View>
                      )}
                      
                      <Text style={styles.adviceSectionContent}>
                        {section.content.split('\n').filter(p => p.trim()).join('\n\n')}
                      </Text>
                    </View>
                  );
                })}
                {advice.time_estimate && Array.isArray(advice.time_estimate) && advice.time_estimate.length > 0 && (
                  <View style={styles.timeEstimateContainer}>
                    <View style={styles.timeEstimateHeader}>
                      <Text style={styles.timeEstimateIcon}>⏱️</Text>
                      <Text style={styles.timeEstimateTitle}>Timeline to Reach Your Goals</Text>
                    </View>
                    <View style={styles.timeTable}>
                      {advice.time_estimate.map((item, index) => (
                        <View key={index} style={styles.timeTableRow}>
                          <Text style={styles.timeTablePercent}>{item.percent}% body fat</Text>
                          <Text style={styles.timeTableMonths}>
                            {item.months === 0 ? 'current level' : item.months === 1 ? '1 month' : `${item.months} months`}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            ) : null}

            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBackToStep3}
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.button}
              onPress={handleStartOver}
            >
              <Text style={styles.buttonText}>Start Over</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={showSubscriptionScreen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleSubscriptionClose}
        onShow={() => {
          console.log('>>> MODAL SHOWN - Subscription screen is visible! <<<');
        }}
      >
        <SubscriptionScreen 
          onClose={handleSubscriptionClose}
          hasUsedFreeTrial={hasUsedFreeTrial}
          onUseFreeTrial={() => {
            // Сразу закрываем модальное окно
            setShowSubscriptionScreen(false);
            // Устанавливаем флаг для будущих вызовов
            setIsUsingFreeTrial(true);
            // Вызываем handleCalculate с forceFreeTrial=true, чтобы избежать повторной проверки
            // Небольшая задержка, чтобы модальное окно успело закрыться
            setTimeout(() => {
              handleCalculate(true);
            }, 100);
          }}
        />
      </Modal>
    </>
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
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 15,
  },
  subscriptionButton: {
    backgroundColor: '#667eea',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  subscriptionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    gap: 10,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#e0e0e0',
  },
  stepDotActive: {
    backgroundColor: '#667eea',
    transform: [{ scale: 1.3 }],
  },
  formContent: {
    paddingBottom: 20,
  },
  backButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 10,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 10,
  },
  backButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  optionalLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  photoUploadArea: {
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    backgroundColor: '#fafafa',
    marginBottom: 15,
  },
  photoUploadIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  photoUploadText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  photoUploadHint: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 5,
  },
  photoPreview: {
    marginTop: 15,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 15,
  },
  photoItem: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  removePhotoButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(255, 68, 68, 0.9)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removePhotoButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  removeAllButton: {
    backgroundColor: '#ff4444',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  removeAllButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  resultEvaluation: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    textAlign: 'center',
    overflow: 'hidden',
  },
  resultEvaluationNormal: {
    backgroundColor: '#e8f5e9',
    color: '#2e7d32',
    borderWidth: 2,
    borderColor: '#4caf50',
  },
  resultEvaluationLow: {
    backgroundColor: '#e3f2fd',
    color: '#1565c0',
    borderWidth: 2,
    borderColor: '#2196f3',
  },
  resultEvaluationVeryLow: {
    backgroundColor: '#e1f5fe',
    color: '#0277bd',
    borderWidth: 2,
    borderColor: '#03a9f4',
  },
  resultEvaluationHigh: {
    backgroundColor: '#fff3e0',
    color: '#e65100',
    borderWidth: 2,
    borderColor: '#ff9800',
  },
  resultEvaluationVeryHigh: {
    backgroundColor: '#ffebee',
    color: '#c62828',
    borderWidth: 2,
    borderColor: '#f44336',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  circularProgressContainer: {
    position: 'relative',
    width: 120,
    height: 120,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressPercent: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -20 }, { translateY: -10 }],
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
    textAlign: 'center',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
  adviceContainer: {
    marginBottom: 20,
  },
  adviceTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  adviceSection: {
    backgroundColor: '#f8f9ff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#667eea',
  },
  adviceSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  adviceSectionIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  adviceSectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  adviceSectionContent: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginTop: 10,
  },
  macrosContainer: {
    marginTop: 20,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dailyCalories: {
    backgroundColor: '#fff3e0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#ff9800',
  },
  caloriesLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  caloriesIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  caloriesLabelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  caloriesValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#e65100',
    marginBottom: 8,
  },
  caloriesGoal: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  caloriesGoalLose: {
    backgroundColor: '#ffebee',
  },
  caloriesGoalGain: {
    backgroundColor: '#e8f5e9',
  },
  caloriesGoalMaintain: {
    backgroundColor: '#e3f2fd',
  },
  caloriesGoalText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  macrosSplitTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  macroItem: {
    marginBottom: 20,
  },
  macroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  macroName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  macroPercent: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  macroGrams: {
    fontSize: 13,
    color: '#888',
    marginTop: 4,
    marginBottom: 6,
  },
  macroProgress: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  macroProgressBar: {
    height: '100%',
    borderRadius: 4,
  },
  macroProgressBarProtein: {
    backgroundColor: '#2196F3',
  },
  macroProgressBarCarbs: {
    backgroundColor: '#FF9800',
  },
  macroProgressBarFats: {
    backgroundColor: '#4CAF50',
  },
  timeEstimateContainer: {
    marginTop: 20,
    padding: 20,
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2196f3',
  },
  timeEstimateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  timeEstimateIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  timeEstimateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1976d2',
    flex: 1,
  },
  timeTable: {
    marginTop: 10,
  },
  timeTableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#bbdefb',
  },
  timeTablePercent: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  timeTableMonths: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  unitToggleContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  unitToggleButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  unitToggleButtonActive: {
    borderColor: '#667eea',
    backgroundColor: '#f8f9ff',
  },
  unitToggleButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  unitToggleButtonTextActive: {
    color: '#667eea',
    fontWeight: '600',
  },
  heightImperialContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  heightFeetInput: {
    flex: 1,
  },
  heightInchesInput: {
    flex: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  genderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  genderButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  genderButtonLeft: {
    marginRight: 5,
  },
  genderButtonRight: {
    marginLeft: 5,
  },
  genderButtonSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#e3f2fd',
  },
  genderButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  genderButtonTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#999',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  resultContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  resultBox: {
    alignItems: 'center',
  },
  resultPercent: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 16,
  },
  resultComment: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
});



