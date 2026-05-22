import { AppIcon } from '@/components/ui/app-icon';
import { Card } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Palette } from '@/constants/design';
import { Wallet } from '@/types';
import { formatCurrency } from '@/utils/formatters';
import React from 'react';
import { Text, View } from 'react-native';

interface WalletCardProps {
  wallet: Wallet;
  share: number;
}

export function WalletCard({ wallet, share }: WalletCardProps) {
  return (
    <Card style={{ width: 188, padding: 16, gap: 14, borderColor: `${wallet.color}55` }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <AppIcon name={wallet.icon} color={wallet.color} backgroundColor={`${wallet.color}20`} size={21} />
        <Text style={{ color: Palette.muted, fontSize: 12, fontWeight: '800' }}>{Math.round(share * 100)}%</Text>
      </View>

      <View style={{ gap: 5 }}>
        <Text style={{ color: Palette.text, fontSize: 16, fontWeight: '800' }}>{wallet.name}</Text>
        <Text style={{ color: Palette.muted, fontSize: 12 }}>Wallet balance</Text>
      </View>

      <Text style={{ color: Palette.text, fontSize: 22, fontWeight: '900', fontVariant: ['tabular-nums'] }}>
        {formatCurrency(wallet.balance)}
      </Text>

      <ProgressBar value={share} color={wallet.color} />
    </Card>
  );
}
