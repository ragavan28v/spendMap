import { AppIcon } from '@/components/ui/app-icon';
import { Card } from '@/components/ui/card';
import { Palette } from '@/constants/design';
import { TransactionRecord } from '@/types';
import { formatCurrency, formatTime } from '@/utils/formatters';
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

interface TransactionCardProps {
  transaction: TransactionRecord;
}

export function TransactionCard({ transaction }: TransactionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isIncome = transaction.type === 'income';
  const accent = isIncome ? Palette.emerald : Palette.orange;

  return (
    <Pressable onPress={() => setExpanded((value) => !value)}>
      <Card style={{ padding: 14, gap: 12, borderColor: `${accent}40` }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <AppIcon
            name={isIncome ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline'}
            color={accent}
            backgroundColor={`${accent}20`}
            size={22}
          />
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={{ color: Palette.text, fontSize: 15, fontWeight: '800' }}>
              {transaction.reason || transaction.categoryName}
            </Text>
            <Text style={{ color: Palette.muted, fontSize: 12 }}>
              {transaction.categoryName} • {formatTime(transaction.timestamp)}
            </Text>
          </View>
          <Text
            style={{
              color: accent,
              fontSize: 16,
              fontWeight: '900',
              fontVariant: ['tabular-nums'],
            }}
          >
            {isIncome ? '+' : '-'}
            {formatCurrency(transaction.amount)}
          </Text>
        </View>

        {expanded ? (
          <View style={{ gap: 8, borderTopWidth: 1, borderTopColor: Palette.border, paddingTop: 12 }}>
            <Detail label="Wallet" value={transaction.walletName} />
            <Detail label="Wallet balance after" value={formatCurrency(transaction.walletBalanceAfter)} />
            <Detail label="Total balance after" value={formatCurrency(transaction.balanceAfterTransaction)} />
            <Detail label="Recurring" value={transaction.isRecurring ? transaction.recurringType ?? 'Yes' : 'No'} />
            {transaction.note ? <Detail label="Note" value={transaction.note} /> : null}
          </View>
        ) : null}
      </Card>
    </Pressable>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 16 }}>
      <Text style={{ color: Palette.muted, fontSize: 12 }}>{label}</Text>
      <Text style={{ color: Palette.text, fontSize: 12, fontWeight: '700', flex: 1, textAlign: 'right' }}>
        {value}
      </Text>
    </View>
  );
}
