import { Card } from '@/components/ui/card';
import { MetricCard } from '@/components/ui/metric-card';
import { ProgressBar } from '@/components/ui/progress-bar';
import { SelectionChip } from '@/components/ui/selection-chip';
import { Palette } from '@/constants/design';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useTransactionSummary } from '@/hooks/useTransactions';
import { useWallets } from '@/hooks/useWallet';
import { useTransactionStore } from '@/store/transactionStore';
import { formatCurrency, startOfMonth, startOfToday, startOfWeek, startOfYear } from '@/utils/formatters';
import React, { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Period = 'daily' | 'weekly' | 'monthly' | 'yearly';

export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const [period, setPeriod] = useState<Period>('monthly');
  const transactions = useTransactionStore((state) => state.transactions);
  const { walletStats } = useWallets();
  const summary = useTransactionSummary();

  const analytics = useMemo(() => {
    const start = getStart(period);
    const scoped = transactions.filter((transaction) => transaction.timestamp >= start);
    const income = scoped.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0);
    const expense = scoped.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0);
    const categoryTotals = new Map<string, { amount: number; color: string }>();

    scoped
      .filter((item) => item.type === 'expense')
      .forEach((item) => {
        const current = categoryTotals.get(item.categoryName) ?? { amount: 0, color: item.categoryColor };
        categoryTotals.set(item.categoryName, { amount: current.amount + item.amount, color: item.categoryColor });
      });

    return {
      income,
      expense,
      net: income - expense,
      categoryBreakdown: Array.from(categoryTotals.entries())
        .map(([name, value]) => ({ name, ...value }))
        .sort((first, second) => second.amount - first.amount),
    };
  }, [transactions, period]);

  const maxCategory = Math.max(...analytics.categoryBreakdown.map((item) => item.amount), 1);
  const maxWallet = Math.max(...walletStats.map((item) => item.balance), 1);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, paddingBottom: 110, gap: 16 }}
    >
      <View style={{ gap: 6 }}>
        <Text style={{ color: theme.text, fontSize: 28, fontWeight: '900' }}>Insights</Text>
        <Text style={{ color: theme.muted, fontSize: 13 }}>Readable analytics without dashboard clutter.</Text>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {(['daily', 'weekly', 'monthly', 'yearly'] as Period[]).map((option) => (
          <SelectionChip
            key={option}
            label={option}
            icon="calendar-outline"
            color={Palette.purple}
            selected={period === option}
            onPress={() => setPeriod(option)}
          />
        ))}
      </View>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <MetricCard label="Income" value={formatCurrency(analytics.income)} icon="trending-up-outline" color={Palette.emerald} />
        <MetricCard label="Expense" value={formatCurrency(analytics.expense)} icon="trending-down-outline" color={Palette.orange} />
      </View>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <MetricCard
          label="Net flow"
          value={formatCurrency(analytics.net)}
          icon="pulse-outline"
          color={analytics.net >= 0 ? Palette.emerald : Palette.red}
        />
        <MetricCard label="Top category" value={summary.highestCategory} icon="pricetag-outline" color={Palette.blue} />
      </View>

      <Card style={{ padding: 16, gap: 14 }}>
        <Text style={{ color: theme.text, fontSize: 18, fontWeight: '900' }}>Category breakdown</Text>
        {analytics.categoryBreakdown.length ? (
          analytics.categoryBreakdown.map((item) => (
            <View key={item.name} style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: theme.text, fontWeight: '800' }}>{item.name}</Text>
                <Text style={{ color: theme.muted, fontWeight: '800' }}>{formatCurrency(item.amount)}</Text>
              </View>
              <ProgressBar value={item.amount / maxCategory} color={item.color} height={10} />
            </View>
          ))
        ) : (
          <Text style={{ color: theme.muted }}>No expenses in this period.</Text>
        )}
      </Card>

      <Card style={{ padding: 16, gap: 14 }}>
        <Text style={{ color: theme.text, fontSize: 18, fontWeight: '900' }}>Wallet usage</Text>
        {walletStats.map((wallet) => (
          <View key={wallet.id} style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: theme.text, fontWeight: '800' }}>{wallet.name}</Text>
              <Text style={{ color: theme.muted, fontWeight: '800' }}>{formatCurrency(wallet.balance)}</Text>
            </View>
            <ProgressBar value={wallet.balance / maxWallet} color={wallet.color} height={10} />
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}

function getStart(period: Period) {
  if (period === 'daily') return startOfToday();
  if (period === 'weekly') return startOfWeek();
  if (period === 'yearly') return startOfYear();
  return startOfMonth();
}
