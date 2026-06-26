import { AppIcon } from '@/components/ui/app-icon';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Palette } from '@/constants/design';
import { useAppTheme } from '@/hooks/use-app-theme';
import { TransactionRecord } from '@/types';
import { formatCurrency, formatTime } from '@/utils/formatters';
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

interface TransactionCardProps {
  transaction: TransactionRecord;
  onEdit?: (transaction: TransactionRecord) => void;
  onDelete?: (transaction: TransactionRecord) => void;
}

export function TransactionCard({ transaction, onEdit, onDelete }: TransactionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const theme = useAppTheme();
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
            <Text style={{ color: theme.text, fontSize: 15, fontWeight: '800' }}>
              {transaction.reason || transaction.categoryName}
            </Text>
            <Text style={{ color: theme.muted, fontSize: 12 }}>
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
          <View style={{ gap: 8, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 12 }}>
            {transaction.isTransfer ? (
              <>
                <Detail label="Transfer from" value={transaction.sourceWalletName ?? transaction.walletName} />
                <Detail label="Transfer to" value={transaction.destinationWalletName ?? 'Unknown'} />
                <Detail label="Amount" value={`${formatCurrency(transaction.amount)} transferred`} />
              </>
            ) : (
              <>
                <Detail label="Wallet" value={transaction.walletName} />
                <Detail label="Wallet balance after" value={formatCurrency(transaction.walletBalanceAfter)} />
                <Detail label="Total balance after" value={formatCurrency(transaction.balanceAfterTransaction)} />
                {transaction.fundingSourceWalletName ? (
                  <Detail label="Funding source" value={transaction.fundingSourceWalletName} />
                ) : null}
              </>
            )}
            <Detail label="Recurring" value={transaction.isRecurring ? transaction.recurringType ?? 'Yes' : 'No'} />
            {transaction.note ? <Detail label="Note" value={transaction.note} /> : null}
            {onEdit || onDelete ? (
              <View style={{ flexDirection: 'row', gap: 10, paddingTop: 4 }}>
                {onEdit ? (
                  <Button label="Edit" icon="create-outline" secondary compact style={{ flex: 1 }} onPress={() => onEdit(transaction)} />
                ) : null}
                {onDelete ? (
                  <Button
                    label="Delete"
                    icon="trash-outline"
                    secondary
                    compact
                    style={{ flex: 1 }}
                    onPress={() => onDelete(transaction)}
                  />
                ) : null}
              </View>
            ) : null}
          </View>
        ) : null}
      </Card>
    </Pressable>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  const theme = useAppTheme();

  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 16 }}>
      <Text style={{ color: theme.muted, fontSize: 12 }}>{label}</Text>
      <Text style={{ color: theme.text, fontSize: 12, fontWeight: '700', flex: 1, textAlign: 'right' }}>
        {value}
      </Text>
    </View>
  );
}
