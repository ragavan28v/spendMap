import { Palette, Radius } from '@/constants/design';
import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Card({ children, style }: CardProps) {
  return (
    <View
      style={[
        {
          backgroundColor: Palette.surfaceGlass,
          borderRadius: Radius.lg,
          borderCurve: 'continuous',
          borderWidth: 1,
          borderColor: Palette.border,
          boxShadow: '0 18px 40px rgba(0, 0, 0, 0.18)',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
