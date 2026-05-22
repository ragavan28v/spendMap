import { AppIcon } from '@/components/ui/app-icon';
import { Card } from '@/components/ui/card';
import { Palette } from '@/constants/design';
import { useAppTheme } from '@/hooks/use-app-theme';
import React from 'react';
import { Text } from 'react-native';

interface EmptyStateProps {
  icon: string;
  title: string;
  body: string;
}

export function EmptyState({ icon, title, body }: EmptyStateProps) {
  const theme = useAppTheme();

  return (
    <Card style={{ padding: 22, gap: 10, alignItems: 'center' }}>
      <AppIcon name={icon} color={Palette.blue} backgroundColor="rgba(59, 130, 246, 0.16)" size={24} />
      <Text style={{ color: theme.text, fontSize: 16, fontWeight: '800', textAlign: 'center' }}>{title}</Text>
      <Text style={{ color: theme.muted, fontSize: 13, textAlign: 'center', lineHeight: 19 }}>{body}</Text>
    </Card>
  );
}
