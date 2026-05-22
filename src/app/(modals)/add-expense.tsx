import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SelectionChip } from '@/components/ui/selection-chip';
import { Palette } from '@/constants/design';
import { useAppTheme } from '@/hooks/use-app-theme';
import { getCurrentFirebaseUserId } from '@/services/firebase/auth';
import { saveTransactionWithWallet } from '@/services/firebase/firestore';
import { buildTransaction } from '@/services/finance/transactions';
import { useCategoryStore } from '@/store/categoryStore';
import { useTransactionStore } from '@/store/transactionStore';
import { useWalletStore } from '@/store/walletStore';
import { RecurringType } from '@/types';
import { formatCurrency } from '@/utils/formatters';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

const recurringOptions: RecurringType[] = ['none', 'daily', 'weekly', 'monthly'];

export default function AddExpenseScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const wallets = useWalletStore((state) => state.wallets.filter((wallet) => wallet.isEnabled));
  const categories = useCategoryStore((state) => state.categories);
  const totalBalance = useWalletStore((state) => state.totalBalance)();
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [walletId, setWalletId] = useState(wallets[0]?.id ?? '');
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '');
  const [recurringType, setRecurringType] = useState<RecurringType>('none');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const selectedWallet = useMemo(() => wallets.find((item) => item.id === walletId), [walletId, wallets]);
  const selectedCategory = useMemo(
    () => categories.find((item) => item.id === categoryId) ?? categories[0],
    [categories, categoryId]
  );

  async function handleSubmit() {
    const amountValue = Number(amount);
    if (!reason.trim()) return setError('Reason is required.');
    if (!selectedWallet || !selectedCategory) return setError('Select wallet and category.');
    if (!Number.isFinite(amountValue) || amountValue <= 0) return setError('Enter a valid amount.');
    const userId = getCurrentFirebaseUserId();
    if (!userId) return setError('Please sign in before saving expenses.');
    if (selectedWallet.balance < amountValue) {
      return setError(`Insufficient ${selectedWallet.name} balance. Available ${formatCurrency(selectedWallet.balance)}.`);
    }

    try {
      const transaction = buildTransaction({
        type: 'expense',
        amount: amountValue,
        wallet: selectedWallet,
        category: selectedCategory,
        reason,
        note,
        recurringType,
        totalBalanceBefore: totalBalance,
      });
      const updatedWallet = {
        ...selectedWallet,
        balance: transaction.walletBalanceAfter,
      };

      setIsSaving(true);
      setError(null);
      await saveTransactionWithWallet(userId, transaction, updatedWallet);
      useWalletStore.getState().applyTransactionLocal(transaction);
      useTransactionStore.getState().addTransactionLocal(transaction);
      router.back();
    } catch (submitError) {
      console.error('Firestore expense save failed', submitError);
      setError(
        submitError instanceof Error
          ? `Could not save to Firestore: ${submitError.message}`
          : 'Could not save to Firestore.'
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ padding: 16, paddingBottom: 48, gap: 16 }}
    >
      <View style={{ gap: 6 }}>
        <Text style={{ color: theme.text, fontSize: 28, fontWeight: '900' }}>Add expense</Text>
        <Text style={{ color: theme.muted, fontSize: 13 }}>Deduct only from the wallet you choose.</Text>
      </View>

      <Card style={{ padding: 16, gap: 16 }}>
        <Input label="Amount" value={amount} onChangeText={setAmount} prefix="₹" keyboardType="numeric" />
        <Input label="Reason" value={reason} onChangeText={setReason} placeholder="Lunch, fuel, movie..." />
        <Input
          label="Optional note"
          value={note}
          onChangeText={setNote}
          placeholder="Add context for future you"
          multiline
          numberOfLines={3}
        />
      </Card>

      <PickerSection title="Wallet used" theme={theme}>
        {wallets.map((wallet) => (
          <SelectionChip
            key={wallet.id}
            label={`${wallet.name} • ${formatCurrency(wallet.balance)}`}
            icon={wallet.icon}
            color={wallet.color}
            selected={walletId === wallet.id}
            onPress={() => setWalletId(wallet.id)}
          />
        ))}
      </PickerSection>

      <PickerSection title="Category" theme={theme}>
        {categories.map((category) => (
          <SelectionChip
            key={category.id}
            label={category.name}
            icon={category.icon}
            color={category.color}
            selected={categoryId === category.id}
            onPress={() => setCategoryId(category.id)}
          />
        ))}
      </PickerSection>

      <PickerSection
        title={recurringType === 'none' ? 'Repeat schedule' : `Repeats ${recurringType}`}
        helperText="Use this for rent, EMI, subscriptions, and recurring bills."
        theme={theme}
      >
        {recurringOptions.map((option) => (
          <SelectionChip
            key={option}
            label={recurringLabel(option)}
            icon={option === 'none' ? 'flash-outline' : 'repeat-outline'}
            selected={recurringType === option}
            color={Palette.orange}
            onPress={() => setRecurringType(option)}
          />
        ))}
      </PickerSection>

      {error ? <Text style={{ color: Palette.orange, fontWeight: '700' }}>{error}</Text> : null}
      <Button
        label={isSaving ? 'Saving...' : 'Save expense'}
        icon="checkmark-circle-outline"
        onPress={handleSubmit}
        style={{ backgroundColor: Palette.orange, opacity: isSaving ? 0.7 : 1 }}
      />
    </ScrollView>
  );
}

function PickerSection({
  title,
  helperText,
  children,
  theme,
}: {
  title: string;
  helperText?: string;
  children: React.ReactNode;
  theme: ReturnType<typeof useAppTheme>;
}) {
  return (
    <Card style={{ padding: 16, gap: 12 }}>
      <Text style={{ color: theme.text, fontSize: 16, fontWeight: '900' }}>{title}</Text>
      {helperText ? <Text style={{ color: theme.muted, fontSize: 12 }}>{helperText}</Text> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>{children}</View>
    </Card>
  );
}

function recurringLabel(option: RecurringType) {
  if (option === 'none') return 'One-time';
  if (option === 'daily') return 'Daily';
  if (option === 'weekly') return 'Weekly';
  return 'Monthly';
}
