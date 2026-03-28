import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = 'user-theme';

export const saveTheme = async (choice: string) => {
  try {
    await AsyncStorage.setItem(THEME_KEY, choice);
  } catch (e) {
    console.error("Error saving theme", e);
  }
};

export const getTheme = async () => {
  try {
    const saved = await AsyncStorage.getItem(THEME_KEY);
    return saved || 'light'; // Default to light
  } catch (e) {
    return 'light';
  }
};