import { AppIcon } from '@/components/ui/app-icon';
import { Palette, Radius } from '@/constants/design';
import React from 'react';
import { Pressable, Text, ViewStyle } from 'react-native';

interface ButtonProps {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  icon?: string;
  style?: ViewStyle;
}

export function Button({ label, onPress, secondary, icon, style }: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          borderRadius: Radius.md,
          borderCurve: 'continuous',
          paddingVertical: 14,
          paddingHorizontal: 16,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 8,
          backgroundColor: secondary ? 'rgba(15, 23, 42, 0.52)' : Palette.blue,
          borderWidth: 1,
          borderColor: secondary ? Palette.border : 'rgba(255, 255, 255, 0.16)',
          opacity: pressed ? 0.82 : 1,
        },
        style,
      ]}
    >
      {icon ? <AppIcon name={icon} color={Palette.text} size={18} /> : null}
      <Text style={{ color: Palette.text, fontSize: 15, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}
