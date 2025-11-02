import AsyncStorage from '@react-native-async-storage/async-storage';

export const TOKEN_KEY = 'authToken';

/**
 * Save JWT token to AsyncStorage
 */
export const saveToken = async (token: string): Promise<void> => {
  await AsyncStorage.setItem(TOKEN_KEY, token);
};

/**
 * Retrieve JWT token from AsyncStorage
 */
export const getToken = async (): Promise<string | null> => {
  return await AsyncStorage.getItem(TOKEN_KEY);
};

/**
 * Remove JWT token from AsyncStorage
 */
export const removeToken = async (): Promise<void> => {
  await AsyncStorage.removeItem(TOKEN_KEY);
};
