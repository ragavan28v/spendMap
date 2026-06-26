import { AppIcon } from '@/components/ui/app-icon';
import { Card } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/progress-bar';
import { useAppTheme } from '@/hooks/use-app-theme';
import { Wallet } from '@/types';
import { formatCurrency } from '@/utils/formatters';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

interface WalletCardProps {
  wallet: Wallet;
  share: number;
  onManagePress?: () => void;
  childWallets?: Wallet[];
}

export function WalletCard({ wallet, share, onManagePress, childWallets = [] }: WalletCardProps) {
  const theme = useAppTheme();
  const hasChildren = childWallets.length > 0;
  const maxRows = 2;
  const columns = hasChildren ? Math.ceil(childWallets.length / maxRows) : 0;
  const cardWidth = hasChildren ? 168 + columns * 64 : 156;

  const childColumns = Array.from({ length: columns }, (_, columnIndex) =>
    childWallets.slice(columnIndex * maxRows, (columnIndex + 1) * maxRows)
  );

  return (
    <Card style={{ width: cardWidth, padding: 16, gap: 14, borderColor: `${wallet.color}55` }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <AppIcon name={wallet.icon} color={wallet.color} backgroundColor={`${wallet.color}20`} size={21} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ color: theme.muted, fontSize: 12, fontWeight: '800' }}>{Math.round(share * 100)}%</Text>
          {onManagePress ? (
            <TouchableOpacity onPress={onManagePress}>
              <AppIcon name="ellipsis-vertical-outline" color={theme.muted} backgroundColor="transparent" size={16} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 4 }}>
        <View style={{ flexShrink: 0, width: 130, gap: 3 }}>
          <Text style={{ color: theme.text, fontSize: 16, fontWeight: '800' }}>{wallet.name}</Text>
          <Text style={{ color: theme.muted, fontSize: 11 }}>Wallet balance</Text>
          <Text style={{ color: theme.text, fontSize: 20, fontWeight: '900', fontVariant: ['tabular-nums'] }}>
            {formatCurrency(wallet.balance)}
          </Text>
        </View>

        {hasChildren ? (
          <View style={{ alignItems: 'flex-start', gap: 4 }}>
            <Text style={{ color: theme.muted, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }}>
              Linked
            </Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {childColumns.map((column, index) => (
                <View key={index} style={{ minWidth: 66, gap: 4 }}>
                  {column.map((child) => (
                    <View
                      key={child.id}
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 999,
                        backgroundColor: `${child.color}16`,
                        borderWidth: 1,
                        borderColor: `${child.color}44`,
                      }}
                    >
                      <Text style={{ color: theme.text, fontSize: 10, fontWeight: '700' }}>{child.name}</Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </View>

      <ProgressBar value={share} color={wallet.color} />
    </Card>
  );
}
