import { Palette } from '@/constants/design';
import { useAppTheme } from '@/hooks/use-app-theme';
import React from 'react';
import { DimensionValue, View } from 'react-native';

interface ProgressBarProps {
  value: number;
  color?: string;
  height?: number;
}

export function ProgressBar({ value, color = Palette.blue, height = 8 }: ProgressBarProps) {
  const theme = useAppTheme();
  const width = `${Math.max(0, Math.min(100, value * 100))}%` as DimensionValue;

  return (
    <View
      style={{
        height,
        borderRadius: height,
        overflow: 'hidden',
        backgroundColor: theme.trackBackground,
      }}
    >
      <View
        style={{
          height: '100%',
          width,
          borderRadius: height,
          backgroundColor: color,
        }}
      />
    </View>
  );
}
