/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { resolveThemeMode } from '@/hooks/use-app-theme';
import { useUserStore } from '@/store/userStore';

export function useTheme() {
  const preference = useUserStore((state) => state.settings.theme);
  const scheme = useColorScheme();
  const theme = resolveThemeMode(preference, scheme === 'dark' ? 'dark' : 'light');

  return Colors[theme];
}
