import { TransactionCard } from '@/components/transaction/transaction-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { SelectionChip } from '@/components/ui/selection-chip';
import { Palette } from '@/constants/design';
import { useAppTheme } from '@/hooks/use-app-theme';
import { getCurrentFirebaseUserId } from '@/services/firebase/auth';
import { deleteTransactionWithWallets } from '@/services/firebase/firestore';
import { showFeedbackDialog } from '@/store/feedbackDialogStore';
import { useNotificationStore } from '@/store/notificationStore';
import { useTransactionStore } from '@/store/transactionStore';
import { useWalletStore } from '@/store/walletStore';
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
  const removeTransactionLocal = useTransactionStore((state) => state.removeTransactionLocal);
  const wallets = useWalletStore((state) => state.wallets);
  const upsertWallet = useWalletStore((state) => state.upsertWallet);
  const removeNotificationsByTransactionId = useNotificationStore((state) => state.removeNotificationsByTransactionId);

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

  function handleEditTransaction(transaction: TransactionRecord) {
    router.push({ pathname: '/edit-transaction/[id]', params: { id: transaction.id } });
  }

  function handleDeleteTransaction(transaction: TransactionRecord) {
    showFeedbackDialog({
      title: 'Delete transaction?',
      message: 'This will remove the transaction and restore the wallet balance.',
      variant: 'warning',
      primaryLabel: 'Delete',
      secondaryLabel: 'Cancel',
      onPrimary: async () => {
        if (transaction.isTransfer && transaction.sourceWalletId && transaction.destinationWalletId) {
          const sourceWallet = wallets.find((item) => item.id === transaction.sourceWalletId);
          const destinationWallet = wallets.find((item) => item.id === transaction.destinationWalletId);
          const sourceFundingWallet = transaction.sourceFundingWalletId
            ? wallets.find((item) => item.id === transaction.sourceFundingWalletId)
            : sourceWallet?.fundingSourceWalletId
            ? wallets.find((item) => item.id === sourceWallet.fundingSourceWalletId)
            : undefined;
          const destinationFundingWallet = transaction.destinationFundingWalletId
            ? wallets.find((item) => item.id === transaction.destinationFundingWalletId)
            : destinationWallet?.fundingSourceWalletId
            ? wallets.find((item) => item.id === destinationWallet.fundingSourceWalletId)
            : undefined;

          const updatedSourceWallet = sourceWallet
            ? { ...sourceWallet, balance: sourceWallet.balance + transaction.amount }
            : undefined;
          const updatedDestinationWallet = destinationWallet
            ? { ...destinationWallet, balance: destinationWallet.balance - transaction.amount }
            : undefined;

          const walletUpdates = new Map<string, typeof updatedSourceWallet>();
          if (updatedSourceWallet) {
            walletUpdates.set(updatedSourceWallet.id, updatedSourceWallet);
          }
          if (updatedDestinationWallet) {
            walletUpdates.set(updatedDestinationWallet.id, updatedDestinationWallet);
          }

          if (sourceFundingWallet) {
            walletUpdates.set(sourceFundingWallet.id, {
              ...sourceFundingWallet,
              balance:
                (walletUpdates.get(sourceFundingWallet.id)?.balance ?? sourceFundingWallet.balance) +
                transaction.amount,
            });
          }
          if (destinationFundingWallet) {
            walletUpdates.set(destinationFundingWallet.id, {
              ...destinationFundingWallet,
              balance:
                (walletUpdates.get(destinationFundingWallet.id)?.balance ?? destinationFundingWallet.balance) -
                transaction.amount,
            });
          }

          const walletsToSave = Array.from(walletUpdates.values()).filter(
            (item): item is NonNullable<typeof item> => Boolean(item)
          );

          walletsToSave.forEach((item) => upsertWallet(item));
          removeTransactionLocal(transaction.id);
          removeNotificationsByTransactionId(transaction.id);

          const userId = getCurrentFirebaseUserId();
          if (userId) {
            await deleteTransactionWithWallets(userId, transaction.id, walletsToSave);
          }

          showFeedbackDialog({
            title: 'Transfer removed',
            message: 'The transfer was removed and wallet balances were restored.',
            variant: 'success',
          });
          return;
        }

        const signedAmount = transaction.type === 'income' ? transaction.amount : -transaction.amount;
        const wallet = wallets.find((item) => item.id === transaction.walletId);
        const fundingWallet = transaction.fundingSourceWalletId
          ? wallets.find((item) => item.id === transaction.fundingSourceWalletId)
          : undefined;

        if (!wallet) {
          removeTransactionLocal(transaction.id);
          removeNotificationsByTransactionId(transaction.id);
          showFeedbackDialog({
            title: 'Transaction removed',
            message: 'The transaction was removed from your history.',
            variant: 'success',
          });
          return;
        }

        const restoredWallet = {
          ...wallet,
          balance: wallet.balance - signedAmount,
        };

        const walletsToSave = [restoredWallet];
        if (fundingWallet) {
          walletsToSave.push({ ...fundingWallet, balance: fundingWallet.balance - signedAmount });
        }

        walletsToSave.forEach((item) => upsertWallet(item));
        removeTransactionLocal(transaction.id);
        removeNotificationsByTransactionId(transaction.id);

        const userId = getCurrentFirebaseUserId();
        if (userId) {
          await deleteTransactionWithWallets(userId, transaction.id, walletsToSave);
        }

        showFeedbackDialog({
          title: 'Transaction removed',
          message: 'The wallet balance has been restored.',
          variant: 'success',
        });
      },
    });
  }

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
            label="Transfer"
            icon="swap-horizontal-outline"
            color={Palette.purple}
            selected={type === 'transfer'}
            onPress={() => setType('transfer')}
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
              <TransactionCard
                key={transaction.id}
                transaction={transaction}
                onEdit={handleEditTransaction}
                onDelete={handleDeleteTransaction}
              />
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
