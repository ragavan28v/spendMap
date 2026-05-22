import { Radius } from '@/constants/design';
import { useAppTheme } from '@/hooks/use-app-theme';
import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Card({ children, style }: CardProps) {
  const theme = useAppTheme();

  return (
    <View
      style={[
        {
          backgroundColor: theme.surfaceGlass,
          borderRadius: Radius.lg,
          borderCurve: 'continuous',
          borderWidth: 1,
          borderColor: theme.border,
          boxShadow: theme.cardShadow,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
