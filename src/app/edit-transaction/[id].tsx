import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SelectionChip } from '@/components/ui/selection-chip';
import { Palette } from '@/constants/design';
import { defaultCategories } from '@/constants/categories';
import { useAppTheme } from '@/hooks/use-app-theme';
import { getCurrentFirebaseUserId } from '@/services/firebase/auth';
import { updateTransactionWithWallets } from '@/services/firebase/firestore';
import { showFeedbackDialog } from '@/store/feedbackDialogStore';
import { useCategoryStore } from '@/store/categoryStore';
import { useTransactionStore } from '@/store/transactionStore';
import { useWalletStore } from '@/store/walletStore';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function EditTransactionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const transactionId = Array.isArray(params.id) ? params.id[0] : params.id;
  const transaction = useTransactionStore((state) => state.transactions.find((item) => item.id === transactionId));
  const updateTransactionLocal = useTransactionStore((state) => state.updateTransactionLocal);
  const wallets = useWalletStore((state) => state.wallets);
  const upsertWallet = useWalletStore((state) => state.upsertWallet);
  const categories = useCategoryStore((state) => state.categories);

  const [amount, setAmount] = useState(() => transaction?.amount.toString() ?? '');
  const [reason, setReason] = useState(() => transaction?.reason ?? '');
  const [note, setNote] = useState(() => transaction?.note ?? '');
  const [selectedWalletId, setSelectedWalletId] = useState(() => transaction?.walletId ?? wallets[0]?.id ?? '');
  const [selectedCategoryId, setSelectedCategoryId] = useState(() => transaction?.categoryId ?? categories[0]?.id ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const wallet = useMemo(
    () => wallets.find((item) => item.id === selectedWalletId) ?? wallets.find((item) => item.id === transaction?.walletId),
    [selectedWalletId, transaction?.walletId, wallets]
  );

  const category = useMemo(
    () =>
      categories.find((item) => item.id === selectedCategoryId) ??
      categories.find((item) => item.id === transaction?.categoryId) ??
      defaultCategories[0],
    [categories, selectedCategoryId, transaction?.categoryId]
  );

  useEffect(() => {
    if (!transaction) {
      return;
    }

    setAmount(transaction.amount.toString());
    setReason(transaction.reason);
    setNote(transaction.note ?? '');
    setSelectedWalletId(transaction.walletId);
    setSelectedCategoryId(transaction.categoryId);
  }, [transaction]);

  if (!transaction || !wallet || !category) {
    return (
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ flex: 1, backgroundColor: theme.background }}
        contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, paddingBottom: 110, gap: 16 }}
      >
        <Card style={{ padding: 16, gap: 12 }}>
          <Text style={{ color: theme.text, fontSize: 18, fontWeight: '900' }}>Transaction not found</Text>
          <Text style={{ color: theme.muted, fontSize: 13, lineHeight: 18 }}>
            The transaction may have been deleted or the data has not loaded yet.
          </Text>
          <Button label="Back" icon="arrow-back-outline" onPress={() => router.back()} secondary />
        </Card>
      </ScrollView>
    );
  }

  async function handleSave() {
    const amountValue = Number(amount);
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      setError('Enter a valid amount.');
      return;
    }
    if (!reason.trim()) {
      setError('Reason is required.');
      return;
    }
    if (!wallet) {
      setError('Select a wallet.');
      return;
    }
    if (!category) {
      setError('Select a category.');
      return;
    }

    const oldSigned = transaction.type === 'income' ? transaction.amount : -transaction.amount;
    const newSigned = transaction.type === 'income' ? amountValue : -amountValue;
    const originalWallet = wallets.find((item) => item.id === transaction.walletId);
    if (!originalWallet) {
      setError('Original wallet not found.');
      return;
    }

    const selectedWallet = wallet;
    const sameWallet = selectedWallet.id === originalWallet.id;
    const finalWalletBalance = sameWallet
      ? originalWallet.balance - oldSigned + newSigned
      : selectedWallet.balance + newSigned;
    const walletUpdates = sameWallet
      ? [
          {
            ...selectedWallet,
            balance: finalWalletBalance,
          },
        ]
      : [
          {
            ...originalWallet,
            balance: originalWallet.balance - oldSigned,
          },
          {
            ...selectedWallet,
            balance: finalWalletBalance,
          },
        ];
    const updatedTransaction = {
      ...transaction,
      amount: amountValue,
      reason: reason.trim(),
      note: note.trim() || undefined,
      walletId: selectedWallet.id,
      walletName: selectedWallet.name,
      walletBalanceAfter: finalWalletBalance,
      balanceAfterTransaction: transaction.balanceAfterTransaction - oldSigned + newSigned,
      categoryId: category.id,
      categoryName: category.name,
      categoryColor: category.color,
    };

    setSaving(true);
    setError(null);

    try {
      updateTransactionLocal(updatedTransaction);
      walletUpdates.forEach((item) => upsertWallet(item));

      const userId = getCurrentFirebaseUserId();
      if (userId) {
        await updateTransactionWithWallets(userId, updatedTransaction, walletUpdates);
      }

      showFeedbackDialog({
        title: 'Transaction updated',
        message: 'Your changes were saved successfully.',
        variant: 'success',
      });
      router.back();
    } catch (saveError) {
      console.error('Transaction update failed', saveError);
      setError(saveError instanceof Error ? saveError.message : 'Unable to update the transaction.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, paddingBottom: 110, gap: 16 }}
    >
      <View style={{ gap: 6 }}>
        <Text style={{ color: theme.text, fontSize: 28, fontWeight: '900' }}>Edit transaction</Text>
        <Text style={{ color: theme.muted, fontSize: 13 }}>Adjust the amount, reason, or note.</Text>
      </View>

      <Card style={{ padding: 16, gap: 14 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <InfoPill label="Type" value={transaction.type} theme={theme} />
          <InfoPill label="Wallet" value={transaction.walletName} theme={theme} />
          <InfoPill label="Category" value={transaction.categoryName} theme={theme} />
        </View>
        <View style={{ gap: 10 }}>
          <Text style={{ color: theme.text, fontSize: 14, fontWeight: '900' }}>Wallet</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {wallets.map((item) => (
              <SelectionChip
                key={item.id}
                label={item.name}
                icon={item.icon}
                color={item.color}
                selected={selectedWalletId === item.id}
                onPress={() => setSelectedWalletId(item.id)}
              />
            ))}
          </View>
        </View>
        <View style={{ gap: 10 }}>
          <Text style={{ color: theme.text, fontSize: 14, fontWeight: '900' }}>Category</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {categories.map((item) => (
              <SelectionChip
                key={item.id}
                label={item.name}
                icon={item.icon}
                color={item.color}
                selected={selectedCategoryId === item.id}
                onPress={() => setSelectedCategoryId(item.id)}
              />
            ))}
          </View>
        </View>
        <Input label="Amount" value={amount} onChangeText={setAmount} prefix="₹" keyboardType="numeric" />
        <Input label="Reason" value={reason} onChangeText={setReason} placeholder="Food, salary, rent..." />
        <Input
          label="Note"
          value={note}
          onChangeText={setNote}
          placeholder="Optional extra context"
          multiline
          numberOfLines={3}
        />
      </Card>

      {error ? <Text style={{ color: Palette.orange, fontWeight: '700' }}>{error}</Text> : null}

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Button label="Cancel" onPress={() => router.back()} secondary compact style={{ flex: 1 }} />
        <Button label={saving ? 'Saving...' : 'Save changes'} onPress={handleSave} style={{ flex: 1 }} />
      </View>
    </ScrollView>
  );
}

function InfoPill({
  label,
  value,
  theme,
}: {
  label: string;
  value: string;
  theme: ReturnType<typeof useAppTheme>;
}) {
  return (
    <View
      style={{
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 16,
        backgroundColor: theme.chipBackground,
        borderWidth: 1,
        borderColor: theme.border,
      }}
    >
      <Text style={{ color: theme.muted, fontSize: 11, fontWeight: '700' }}>{label}</Text>
      <Text style={{ color: theme.text, fontSize: 13, fontWeight: '800', marginTop: 3 }}>{value}</Text>
    </View>
  );
}
