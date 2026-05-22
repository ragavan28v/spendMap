import { AppIcon } from '@/components/ui/app-icon';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { MetricCard } from '@/components/ui/metric-card';
import { WalletCard } from '@/components/wallet/wallet-card';
import { TransactionCard } from '@/components/transaction/transaction-card';
import { Palette } from '@/constants/design';
import { useRecentTransactions, useTransactionSummary } from '@/hooks/useTransactions';
import { useWallets } from '@/hooks/useWallet';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatCurrency } from '@/utils/formatters';

export default function DashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { totalBalance, walletStats } = useWallets();
  const recentTransactions = useRecentTransactions();
  const summary = useTransactionSummary();

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: Palette.navy }}
      contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, paddingBottom: 110, gap: 18 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View>
          <Text style={{ color: Palette.muted, fontSize: 13, fontWeight: '700' }}>SpendMap</Text>
          <Text style={{ color: Palette.text, fontSize: 28, fontWeight: '900' }}>Money cockpit</Text>
        </View>
        <AppIcon name="notifications-outline" color={Palette.text} backgroundColor="rgba(255,255,255,0.08)" />
      </View>

      <Card
        style={{
          padding: 22,
          gap: 20,
          overflow: 'hidden',
          backgroundColor: '#12213B',
          borderColor: 'rgba(59, 130, 246, 0.32)',
        }}
      >
        <View style={{ position: 'absolute', right: -40, top: -42, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(16,185,129,0.18)' }} />
        <View style={{ position: 'absolute', left: -50, bottom: -52, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(59,130,246,0.16)' }} />
        <View style={{ gap: 8 }}>
          <Text style={{ color: Palette.muted, fontWeight: '800', letterSpacing: 0.4 }}>TOTAL BALANCE</Text>
          <Text style={{ color: Palette.text, fontSize: 40, fontWeight: '900', fontVariant: ['tabular-nums'] }}>
            {formatCurrency(totalBalance)}
          </Text>
          <Text style={{ color: Palette.muted, fontSize: 13 }}>
            Split across {walletStats.length} active wallets • updates instantly
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Button
            label="Expense"
            icon="remove-circle-outline"
            onPress={() => router.push('/add-expense')}
            style={{ flex: 1, backgroundColor: Palette.orange }}
          />
          <Button
            label="Income"
            icon="add-circle-outline"
            onPress={() => router.push('/add-income')}
            style={{ flex: 1, backgroundColor: Palette.emerald }}
          />
        </View>
      </Card>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <MetricCard
          label="Today spent"
          value={formatCurrency(summary.spentToday)}
          icon="flame-outline"
          color={Palette.orange}
          caption="Daily outflow"
        />
        <MetricCard
          label="This month"
          value={formatCurrency(summary.spentMonth)}
          icon="calendar-outline"
          color={Palette.purple}
          caption="Monthly expense"
        />
      </View>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <MetricCard
          label="Top category"
          value={summary.highestCategory}
          icon="pricetag-outline"
          color={Palette.blue}
          caption={formatCurrency(summary.highestCategoryAmount)}
        />
        <MetricCard
          label="Most used"
          value={summary.mostUsedWallet}
          icon="wallet-outline"
          color={Palette.emerald}
          caption="Wallet pattern"
        />
      </View>

      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: Palette.text, fontSize: 20, fontWeight: '900' }}>Wallets</Text>
          <Text style={{ color: Palette.muted, fontSize: 12, fontWeight: '700' }}>Swipe →</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
          {walletStats.map((wallet) => (
            <WalletCard key={wallet.id} wallet={wallet} share={wallet.share} />
          ))}
        </ScrollView>
      </View>

      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: Palette.text, fontSize: 20, fontWeight: '900' }}>Recent activity</Text>
          <Text onPress={() => router.push('/history')} style={{ color: Palette.blue, fontSize: 13, fontWeight: '800' }}>
            View all
          </Text>
        </View>
        {recentTransactions.length ? (
          recentTransactions.map((transaction) => (
            <TransactionCard key={transaction.id} transaction={transaction} />
          ))
        ) : (
          <EmptyState
            icon="sparkles-outline"
            title="No transactions yet"
            body="Add your first income or expense to unlock wallet analytics."
          />
        )}
      </View>
    </ScrollView>
  );
}
