import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Use standard local ip for simulator/emulator environments
// 10.0.2.2 is usually android emulator to host
// localhost is iOS simulator to host
const BASE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3001' : 'http://localhost:3001';

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const login = async (email: string, password: string) => {
  try {
    const response = await apiClient.post('/api/auth/login', {
      email,
      password,
    });

    if (response.data?.data?.token) {
      await AsyncStorage.setItem('userToken', response.data.data.token);
      if (response.data.data.refreshToken) {
        await AsyncStorage.setItem('refreshToken', response.data.data.refreshToken);
      }
    }
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error.message;
  }
};
