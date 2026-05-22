import { AppIcon } from '@/components/ui/app-icon';
import { Palette, Radius } from '@/constants/design';
import { useAppTheme } from '@/hooks/use-app-theme';
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
  const theme = useAppTheme();

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
          backgroundColor: selected ? `${color}24` : theme.chipBackground,
          borderWidth: 1,
          borderColor: selected ? color : theme.chipBorder,
          opacity: pressed ? 0.78 : 1,
        },
        style,
      ]}
    >
      {icon ? <AppIcon name={icon} color={selected ? color : theme.muted} size={17} /> : null}
      <Text style={{ color: selected ? theme.text : theme.muted, fontWeight: '700', fontSize: 13 }}>
        {label}
      </Text>
    </Pressable>
  );
}
