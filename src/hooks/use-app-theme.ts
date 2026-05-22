import { AppThemes, ThemeMode } from '@/constants/app-theme';
import { useUserStore } from '@/store/userStore';
import { useColorScheme } from 'react-native';
import { useMemo } from 'react';

export function resolveThemeMode(preference: 'dark' | 'light' | 'system', systemScheme: ThemeMode | null) {
  if (preference === 'system') {
    return systemScheme === 'dark' ? 'dark' : 'light';
  }

  return preference;
}

export function useAppTheme() {
  const preference = useUserStore((state) => state.settings.theme);
  const systemScheme = useColorScheme();

  return useMemo(() => {
    const themeMode = resolveThemeMode(preference, systemScheme === 'dark' ? 'dark' : 'light');
    return {
      ...AppThemes[themeMode],
      themeMode,
      preference,
    };
  }, [preference, systemScheme]);
}
