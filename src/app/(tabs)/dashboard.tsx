import { TransactionCard } from '@/components/transaction/transaction-card';
import { AppIcon } from '@/components/ui/app-icon';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { MetricCard } from '@/components/ui/metric-card';
import { ThemeToggleButton } from '@/components/ui/theme-toggle-button';
import { WalletCard } from '@/components/wallet/wallet-card';
import { Palette } from '@/constants/design';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useRecentTransactions, useTransactionSummary } from '@/hooks/useTransactions';
import { useWallets } from '@/hooks/useWallet';
import { useNotificationStore } from '@/store/notificationStore';
import { formatCurrency } from '@/utils/formatters';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const theme = useAppTheme();
  const { totalBalance, walletStats, wallets } = useWallets();
  const recentTransactions = useRecentTransactions();
  const summary = useTransactionSummary();
  const unreadNotifications = useNotificationStore((state) => state.unreadCount);

  const compact = width < 390;
  const childWalletMap = useMemo(() => {
    const map = new Map<string, typeof wallets[number][]>();

    wallets
      .filter((wallet) => wallet.isEnabled && wallet.fundingSourceWalletId)
      .forEach((wallet) => {
        const parentId = wallet.fundingSourceWalletId;
        if (!parentId) return;
        const existingChildren = map.get(parentId) ?? [];
        map.set(parentId, [...existingChildren, wallet]);
      });

    return map;
  }, [wallets]);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, paddingBottom: 110, gap: 18 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View>
          <Text style={{ color: theme.muted, fontSize: 13, fontWeight: '700' }}>SpendMap</Text>
          <Text style={{ color: theme.text, fontSize: 28, fontWeight: '900' }}>Money cockpit</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable
            onPress={() => router.push('/notifications')}
            style={{ position: 'relative' }}
          >
            <AppIcon name="notifications-outline" color={theme.text} backgroundColor={theme.notificationBackground} />
            {unreadNotifications ? (
              <View
                style={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  minWidth: 16,
                  height: 16,
                  borderRadius: 8,
                  backgroundColor: Palette.orange,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 4,
                }}
              >
                <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </Text>
              </View>
            ) : null}
          </Pressable>
          <ThemeToggleButton />
        </View>
      </View>

      <Card
        style={{
          padding: compact ? 18 : 22,
          gap: compact ? 14 : 18,
          overflow: 'hidden',
          backgroundColor: theme.surfaceElevated,
          borderColor: `${Palette.blue}50`,
        }}
      >
        <View
          style={{
            position: 'absolute',
            right: -40,
            top: -42,
            width: 140,
            height: 140,
            borderRadius: 70,
            backgroundColor: 'rgba(16,185,129,0.18)',
          }}
        />
        <View
          style={{
            position: 'absolute',
            left: -50,
            bottom: -52,
            width: 150,
            height: 150,
            borderRadius: 75,
            backgroundColor: 'rgba(59,130,246,0.16)',
          }}
        />
        <View style={{ gap: 8 }}>
          <Text style={{ color: theme.muted, fontWeight: '800', letterSpacing: 0.4 }}>TOTAL BALANCE</Text>
          <Text style={{ color: theme.text, fontSize: 40, fontWeight: '900', fontVariant: ['tabular-nums'] }}>
            {formatCurrency(totalBalance)}
          </Text>
          <Text style={{ color: theme.muted, fontSize: 13 }}>
            Split across {walletStats.length} active wallets • updates instantly
          </Text>
        </View>

        <View style={{ gap: 2 }}>
          <Text style={{ color: theme.text, fontSize: compact ? 14 : 15, fontWeight: '900' }}>Quick actions</Text>
          <Text style={{ color: theme.muted, fontSize: 12 }}>Jump straight to the most used flows.</Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <Button
            label="Income"
            icon="add-circle-outline"
            onPress={() => router.push('/add-income')}
            compact={compact}
            style={{ flex: 1, backgroundColor: Palette.emerald }}
          />
          <Button
            label="Expense"
            icon="remove-circle-outline"
            onPress={() => router.push('/add-expense')}
            compact={compact}
            style={{ flex: 1, backgroundColor: Palette.orange }}
          />
          <Button
            icon="swap-horizontal-outline"
            onPress={() => router.push('/add-transfer')}
            compact={compact}
            style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#3B82F6', padding: 0 }}
          />
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Button
            label="History"
            icon="receipt-outline"
            onPress={() => router.push('/history')}
            secondary
            compact={compact}
            style={{ flex: 1 }}
          />
          <Button
            label="Report"
            icon="document-text-outline"
            onPress={() => router.push('/report')}
            secondary
            compact={compact}
            style={{ flex: 1 }}
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
          <Text style={{ color: theme.text, fontSize: 20, fontWeight: '900' }}>Wallets</Text>
          <Text style={{ color: theme.muted, fontSize: 12, fontWeight: '700' }}>Swipe →</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
          {walletStats.map((wallet) => (
            <WalletCard
              key={wallet.id}
              wallet={wallet}
              share={wallet.share}
              childWallets={childWalletMap.get(wallet.id) ?? []}
            />
          ))}
        </ScrollView>
      </View>

      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: theme.text, fontSize: 20, fontWeight: '900' }}>Recent activity</Text>
          <Text onPress={() => router.push('/history')} style={{ color: Palette.blue, fontSize: 13, fontWeight: '800' }}>
            View all
          </Text>
        </View>
        {recentTransactions.length ? (
          recentTransactions.map((transaction) => <TransactionCard key={transaction.id} transaction={transaction} />)
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
