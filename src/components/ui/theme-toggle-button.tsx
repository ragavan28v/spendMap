import { AppIcon } from '@/components/ui/app-icon';
import { getNextThemeMode } from '@/constants/app-theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useUserStore } from '@/store/userStore';
import React from 'react';
import { Pressable, ViewStyle } from 'react-native';

interface ThemeToggleButtonProps {
  style?: ViewStyle;
}

export function ThemeToggleButton({ style }: ThemeToggleButtonProps) {
  const theme = useAppTheme();
  const setSettings = useUserStore((state) => state.setSettings);
  const nextTheme = getNextThemeMode(theme.themeMode);

  return (
    <Pressable
      onPress={() => setSettings({ theme: nextTheme })}
      accessibilityRole="button"
      accessibilityLabel={`Switch to ${nextTheme} mode`}
      style={({ pressed }) => [
        {
          width: 40,
          height: 40,
          borderRadius: 20,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.notificationBackground,
          borderWidth: 1,
          borderColor: theme.border,
          opacity: pressed ? 0.82 : 1,
        },
        style,
      ]}
    >
      <AppIcon name={theme.themeMode === 'dark' ? 'sunny-outline' : 'moon-outline'} color={theme.text} size={18} />
    </Pressable>
  );
}
