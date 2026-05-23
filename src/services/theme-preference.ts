import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ThemeMode } from '@/constants/app-theme';

const THEME_KEY = '@spendwise:theme';

export async function getStoredThemePreference() {
  const storedValue = await AsyncStorage.getItem(THEME_KEY);
  if (storedValue === 'dark' || storedValue === 'light' || storedValue === 'system') {
    return storedValue as ThemeMode | 'system';
  }

  return null;
}

export async function saveStoredThemePreference(theme: ThemeMode | 'system') {
  await AsyncStorage.setItem(THEME_KEY, theme);
}
