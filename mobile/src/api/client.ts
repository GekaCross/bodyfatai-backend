import { Platform } from 'react-native';

// API client for backend communication
// Для реального устройства замените на IP-адрес вашего компьютера в локальной сети
// Например: 'http://192.168.1.100:8000'
// IP вашего компьютера в локальной сети (из Expo подключения)
// Для реального устройства замените на IP вашего компьютера
const COMPUTER_IP = '192.168.100.69';

const getApiBaseUrl = (): string => {
  if (__DEV__) {
    // В режиме разработки
    // Для реального устройства всегда используем IP компьютера
    // Для эмуляторов используем специальные адреса
    if (Platform.OS === 'android') {
      // Android эмулятор использует специальный IP для доступа к localhost хоста
      return 'http://10.0.2.2:8000';
    } else {
      // Для iOS симулятора и реальных устройств
      // iOS симулятор может использовать localhost, но для реального устройства нужен IP
      // Используем IP компьютера (работает и для симулятора, и для реального устройства)
      return `http://${COMPUTER_IP}:8000`;
    }
  }
  // PRODUCTION: Backend deployed on Render.com
  // ВАЖНО: Используйте HTTPS, не HTTP!
  return 'https://bodyfatai-backend.onrender.com';
};

const API_BASE_URL = getApiBaseUrl();

export interface BodyFatRequest {
  gender: 'male' | 'female';
  age: number;
  height: number;
  weight: number;
  waist?: number;
  images?: string[]; // Array of image URIs
}

export interface BodyFatResponse {
  body_fat_percent: number;
  comment: string;
  evaluation?: string;
}

export interface AdviceRequest {
  body_fat_percent: number;
  gender: 'male' | 'female';
  age: number;
  evaluation: string;
}

export interface AdviceResponse {
  title: string;
  sections: Array<{
    title: string;
    content: string;
    macros?: {
      calories: { min: number; max: number; goal: string };
      protein: { percent: number; grams: number };
      carbs: { percent: number; grams: number };
      fats: { percent: number; grams: number };
    };
  }>;
  time_estimate?: Array<{ percent: number; months: number }> | string;
}

export async function getAdvice(
  data: AdviceRequest
): Promise<AdviceResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/advice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail || `HTTP error! status: ${response.status}`
      );
    }

    const result: AdviceResponse = await response.json();
    return result;
  } catch (error: any) {
    console.error('API Error:', error);
    throw error;
  }
}

export async function calculateBodyFat(
  data: BodyFatRequest
): Promise<BodyFatResponse> {
  try {
    const formData = new FormData();

    // Add text fields
    formData.append('gender', data.gender);
    formData.append('age', data.age.toString());
    formData.append('height', data.height.toString());
    formData.append('weight', data.weight.toString());
    
    if (data.waist !== undefined && data.waist > 0) {
      formData.append('waist', data.waist.toString());
    }

    // Add images if provided
    if (data.images && data.images.length > 0) {
      for (const imageUri of data.images) {
        // For React Native, we need to create a file object differently
        const filename = imageUri.split('/').pop() || 'photo.jpg';
        const fileType = 'image/jpeg';
        
        // In React Native, we can append the URI directly or convert to blob
        // Using a workaround for React Native FormData
        formData.append('images', {
          uri: imageUri,
          type: fileType,
          name: filename,
        } as any);
      }
    }

    const response = await fetch(`${API_BASE_URL}/api/bodyfat`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail || `HTTP error! status: ${response.status}`
      );
    }

    const result: BodyFatResponse = await response.json();
    return result;
  } catch (error: any) {
    console.error('API Error:', error);
    
    // Обработка различных типов ошибок
    if (error.message) {
      if (error.message.includes('Network request failed') || 
          error.message.includes('Failed to fetch') ||
          error.message.includes('NetworkError')) {
        throw new Error(
          `Failed to connect to server (${API_BASE_URL}).\n\nCheck:\n1. Backend is running: uvicorn main:app --reload --host 0.0.0.0 --port 8000\n2. Phone and computer are on the same Wi-Fi network\n3. IP address is correct: ${COMPUTER_IP}`
        );
      }
    }
    
    // Пробрасываем оригинальную ошибку
    throw error;
  }
}

