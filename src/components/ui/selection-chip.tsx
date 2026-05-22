import { AppIcon } from '@/components/ui/app-icon';
import { Palette, Radius } from '@/constants/design';
import React from 'react';
import { Pressable, Text, ViewStyle } from 'react-native';

interface SelectionChipProps {
  label: string;
  selected?: boolean;
  icon?: string;
  color?: string;
  onPress: () => void;
  style?: ViewStyle;
}

export function SelectionChip({ label, selected, icon, color = Palette.blue, onPress, style }: SelectionChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          borderRadius: Radius.md,
          borderCurve: 'continuous',
          paddingHorizontal: 14,
          paddingVertical: 10,
          backgroundColor: selected ? `${color}24` : 'rgba(15, 23, 42, 0.52)',
          borderWidth: 1,
          borderColor: selected ? color : Palette.border,
          opacity: pressed ? 0.78 : 1,
        },
        style,
      ]}
    >
      {icon ? <AppIcon name={icon} color={selected ? color : Palette.muted} size={17} /> : null}
      <Text style={{ color: selected ? Palette.text : Palette.muted, fontWeight: '700', fontSize: 13 }}>
        {label}
      </Text>
    </Pressable>
  );
}
