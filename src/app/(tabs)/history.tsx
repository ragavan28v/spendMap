import { TransactionCard } from '@/components/transaction/transaction-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { SelectionChip } from '@/components/ui/selection-chip';
import { Palette } from '@/constants/design';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useTransactionStore } from '@/store/transactionStore';
import { TransactionRecord, TransactionType } from '@/types';
import { formatDateLabel, startOfMonth, startOfToday, startOfWeek, startOfYear } from '@/utils/formatters';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type RangeFilter = 'all' | 'today' | 'week' | 'month' | 'year';
type SortFilter = 'newest' | 'high-low';

export default function HistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const transactions = useTransactionStore((state) => state.transactions);

  const [range, setRange] = useState<RangeFilter>('all');
  const [type, setType] = useState<TransactionType | 'all'>('all');
  const [sort, setSort] = useState<SortFilter>('newest');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const startTime = getStartTime(range);
    return transactions
      .filter((transaction) => {
        if (startTime && transaction.timestamp < startTime) return false;
        if (type !== 'all' && transaction.type !== type) return false;
        const text = `${transaction.reason} ${transaction.categoryName} ${transaction.walletName}`.toLowerCase();
        return text.includes(search.trim().toLowerCase());
      })
      .sort((first, second) => (sort === 'high-low' ? second.amount - first.amount : second.timestamp - first.timestamp));
  }, [transactions, range, type, sort, search]);

  const groups = useMemo(() => groupTransactions(filtered), [filtered]);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, paddingBottom: 110, gap: 16 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ gap: 6, flex: 1 }}>
          <Text style={{ color: theme.text, fontSize: 28, fontWeight: '900' }}>History</Text>
          <Text style={{ color: theme.muted, fontSize: 13 }}>Search, filter, and expand every transaction.</Text>
        </View>
        <Button
          label="Generate report"
          icon="document-text-outline"
          onPress={() => router.push('/report')}
          secondary
          style={{ paddingHorizontal: 14, paddingVertical: 10 }}
        />
      </View>

      <Card style={{ padding: 14, gap: 12 }}>
        <Text style={{ color: theme.text, fontSize: 18, fontWeight: '900' }}>Quick filters</Text>
        <Input label="Search" value={search} onChangeText={setSearch} placeholder="Food, GPay, salary..." />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {(['all', 'today', 'week', 'month', 'year'] as RangeFilter[]).map((option) => (
            <SelectionChip key={option} label={option} selected={range === option} onPress={() => setRange(option)} />
          ))}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <SelectionChip label="All" selected={type === 'all'} onPress={() => setType('all')} />
          <SelectionChip
            label="Income"
            icon="arrow-down-circle-outline"
            color={Palette.emerald}
            selected={type === 'income'}
            onPress={() => setType('income')}
          />
          <SelectionChip
            label="Expense"
            icon="arrow-up-circle-outline"
            color={Palette.orange}
            selected={type === 'expense'}
            onPress={() => setType('expense')}
          />
          <SelectionChip
            label="High to low"
            icon="swap-vertical-outline"
            color={Palette.purple}
            selected={sort === 'high-low'}
            onPress={() => setSort(sort === 'high-low' ? 'newest' : 'high-low')}
          />
        </View>
      </Card>

      {groups.length ? (
        groups.map((group) => (
          <View key={group.label} style={{ gap: 10 }}>
            <Text style={{ color: theme.muted, fontSize: 13, fontWeight: '900' }}>{group.label}</Text>
            {group.transactions.map((transaction) => (
              <TransactionCard key={transaction.id} transaction={transaction} />
            ))}
          </View>
        ))
      ) : (
        <EmptyState icon="receipt-outline" title="No matching transactions" body="Try a different date range, type, or search term." />
      )}
    </ScrollView>
  );
}

function getStartTime(range: RangeFilter) {
  if (range === 'today') return startOfToday();
  if (range === 'week') return startOfWeek();
  if (range === 'month') return startOfMonth();
  if (range === 'year') return startOfYear();
  return null;
}

function groupTransactions(transactions: TransactionRecord[]) {
  const map = new Map<string, TransactionRecord[]>();
  transactions.forEach((transaction) => {
    const label = formatDateLabel(transaction.timestamp);
    map.set(label, [...(map.get(label) ?? []), transaction]);
  });
  return Array.from(map.entries()).map(([label, items]) => ({ label, transactions: items }));
}
