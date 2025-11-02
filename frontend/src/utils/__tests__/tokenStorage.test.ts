import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveToken, getToken, removeToken, TOKEN_KEY } from '../tokenStorage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('tokenStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('saveToken', () => {
    it('should save token to AsyncStorage', async () => {
      const token = 'test-jwt-token-123';

      await saveToken(token);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(TOKEN_KEY, token);
      expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1);
    });

    it('should throw error if AsyncStorage.setItem fails', async () => {
      const token = 'test-jwt-token-123';
      const error = new Error('Storage error');
      (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(error);

      await expect(saveToken(token)).rejects.toThrow('Storage error');
    });
  });

  describe('getToken', () => {
    it('should retrieve token from AsyncStorage', async () => {
      const token = 'test-jwt-token-123';
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(token);

      const result = await getToken();

      expect(result).toBe(token);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith(TOKEN_KEY);
      expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1);
    });

    it('should return null if no token exists', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

      const result = await getToken();

      expect(result).toBeNull();
    });

    it('should throw error if AsyncStorage.getItem fails', async () => {
      const error = new Error('Storage error');
      (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(error);

      await expect(getToken()).rejects.toThrow('Storage error');
    });
  });

  describe('removeToken', () => {
    it('should remove token from AsyncStorage', async () => {
      await removeToken();

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(TOKEN_KEY);
      expect(AsyncStorage.removeItem).toHaveBeenCalledTimes(1);
    });

    it('should throw error if AsyncStorage.removeItem fails', async () => {
      const error = new Error('Storage error');
      (AsyncStorage.removeItem as jest.Mock).mockRejectedValueOnce(error);

      await expect(removeToken()).rejects.toThrow('Storage error');
    });
  });
});
