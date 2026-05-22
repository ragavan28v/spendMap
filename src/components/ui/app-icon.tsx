import { Palette } from '@/constants/design';
import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface AppIconProps {
  name: string;
  color?: string;
  size?: number;
  backgroundColor?: string;
  style?: StyleProp<ViewStyle>;
}

export function AppIcon({
  name,
  color = Palette.text,
  size = 20,
  backgroundColor,
  style,
}: AppIconProps) {
  const icon = name as IoniconName;

  if (!backgroundColor) {
    return <Ionicons name={icon} color={color} size={size} />;
  }

  return (
    <View
      style={[
        {
          width: size + 20,
          height: size + 20,
          borderRadius: (size + 20) / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor,
        },
        style,
      ]}
    >
      <Ionicons name={icon} color={color} size={size} />
    </View>
  );
}
