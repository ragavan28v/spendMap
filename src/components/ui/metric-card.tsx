import { AppIcon } from '@/components/ui/app-icon';
import { Card } from '@/components/ui/card';
import { Palette } from '@/constants/design';
import { useAppTheme } from '@/hooks/use-app-theme';
import React from 'react';
import { Text, View } from 'react-native';

interface MetricCardProps {
  label: string;
  value: string;
  icon: string;
  color: string;
  caption?: string;
}

export function MetricCard({ label, value, icon, color, caption }: MetricCardProps) {
  const theme = useAppTheme();

  return (
    <Card style={{ flex: 1, padding: 14, gap: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: theme.muted, fontSize: 12, fontWeight: '700' }}>{label}</Text>
        <AppIcon name={icon} color={color} backgroundColor={`${color}20`} size={18} />
      </View>
      <Text style={{ color: Palette.text, fontSize: 19, fontWeight: '800', fontVariant: ['tabular-nums'] }}>
        {value}
      </Text>
      {caption ? <Text style={{ color: theme.muted, fontSize: 11 }}>{caption}</Text> : null}
    </Card>
  );
}
