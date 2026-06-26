import { AppIcon } from '@/components/ui/app-icon';
import { Radius } from '@/constants/design';
import { useAppTheme } from '@/hooks/use-app-theme';
import React from 'react';
import { Pressable, Text, ViewStyle } from 'react-native';

interface ButtonProps {
  label?: string;
  onPress: () => void;
  secondary?: boolean;
  icon?: string;
  style?: ViewStyle;
  compact?: boolean;
}

export function Button({ label = '', onPress, secondary, icon, style, compact }: ButtonProps) {
  const theme = useAppTheme();
  const iconOnly = !label;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          borderRadius: Radius.md,
          borderCurve: 'continuous',
          paddingVertical: iconOnly ? 0 : compact ? 11 : 14,
          paddingHorizontal: iconOnly ? 0 : compact ? 13 : 16,
          width: iconOnly ? 40 : undefined,
          height: iconOnly ? 40 : undefined,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: iconOnly ? 0 : compact ? 6 : 8,
          backgroundColor: secondary ? theme.buttonSecondaryBackground : theme.accent,
          borderWidth: 1,
          borderColor: secondary ? theme.border : 'rgba(255, 255, 255, 0.16)',
          opacity: pressed ? 0.82 : 1,
        },
        style,
      ]}
    >
      {icon ? <AppIcon name={icon} color={secondary ? theme.text : '#FFFFFF'} size={compact ? 16 : 18} /> : null}
      {label ? (
        <Text style={{ color: secondary ? theme.text : '#FFFFFF', fontSize: compact ? 13 : 15, fontWeight: '700' }}>
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}
