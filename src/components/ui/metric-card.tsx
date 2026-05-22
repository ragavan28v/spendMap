import { AppIcon } from '@/components/ui/app-icon';
import { Card } from '@/components/ui/card';
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
      <Text
        style={{
          color: theme.mode === 'light' ? '#0F172A' : '#F8FAFC',
          fontSize: 19,
          fontWeight: '900',
          fontVariant: ['tabular-nums'],
          opacity: 1,
        }}
      >
        {value}
      </Text>
      {caption ? <Text style={{ color: theme.muted, fontSize: 11 }}>{caption}</Text> : null}
    </Card>
  );
}
