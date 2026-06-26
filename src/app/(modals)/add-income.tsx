import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SelectionChip } from '@/components/ui/selection-chip';
import { Palette, Radius } from '@/constants/design';
import { IncomeSourceId, incomeSources } from '@/constants/income-sources';
import { useAppTheme } from '@/hooks/use-app-theme';
import { buildTransaction } from '@/services/finance/transactions';
import { getCurrentFirebaseUserId } from '@/services/firebase/auth';
import { saveTransactionWithWallet, updateTransactionWithWallets } from '@/services/firebase/firestore';
import { showFeedbackDialog } from '@/store/feedbackDialogStore';
import { useNotificationStore } from '@/store/notificationStore';
import { useTransactionStore } from '@/store/transactionStore';
import { useWalletStore } from '@/store/walletStore';
import { RecurringType } from '@/types';
import { formatCurrency, formatDateLabel } from '@/utils/formatters';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';

const recurringOptions: RecurringType[] = ['none', 'daily', 'weekly', 'monthly'];

export default function AddIncomeScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const wallets = useWalletStore((state) => state.wallets.filter((wallet) => wallet.isEnabled));
  const totalBalance = useWalletStore((state) => state.totalBalance)();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [note, setNote] = useState('');
  const [walletId, setWalletId] = useState(wallets[0]?.id ?? '');
  const [sourceId, setSourceId] = useState<IncomeSourceId>(incomeSources[0].id);
  const [recurringType, setRecurringType] = useState<RecurringType>(incomeSources[0].defaultRecurringType);
  const [transactionDate, setTransactionDate] = useState(() => new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const selectedWallet = useMemo(() => wallets.find((item) => item.id === walletId), [walletId, wallets]);
  const selectedSource = useMemo(
    () => incomeSources.find((item) => item.id === sourceId) ?? incomeSources[0],
    [sourceId]
  );

  async function handleSubmit() {
    const amountValue = Number(amount);
    if (!selectedWallet || !selectedSource) return setError('Select wallet and income source.');
    if (!Number.isFinite(amountValue) || amountValue <= 0) return setError('Enter a valid amount.');
    const userId = getCurrentFirebaseUserId();
    if (!userId) return setError('Please sign in before saving income.');

    const fundingWallet = selectedWallet.fundingSourceWalletId
      ? wallets.find((wallet) => wallet.id === selectedWallet.fundingSourceWalletId)
      : undefined;

    const transaction = buildTransaction({
      type: 'income',
      amount: amountValue,
      wallet: selectedWallet,
      category: selectedSource,
      reason: description.trim() || selectedSource.name,
      note,
      timestamp: transactionDate.getTime(),
      recurringType,
      totalBalanceBefore: totalBalance,
      fundingSourceWalletName: fundingWallet?.name,
    });
    const updatedWallet = {
      ...selectedWallet,
      balance: transaction.walletBalanceAfter,
    };

    const walletsToSave = fundingWallet
      ? [
          updatedWallet,
          { ...fundingWallet, balance: fundingWallet.balance + transaction.amount },
        ]
      : [updatedWallet];

    try {
      setIsSaving(true);
      setError(null);
      if (fundingWallet) {
        await updateTransactionWithWallets(userId, transaction, walletsToSave);
      } else {
        await saveTransactionWithWallet(userId, transaction, updatedWallet);
      }
      useWalletStore.getState().applyTransactionLocal(transaction);
      useTransactionStore.getState().addTransactionLocal(transaction);
      useNotificationStore.getState().addNotification({
        id: `transaction-${transaction.id}`,
        kind: 'transaction',
        title: 'Income saved',
        body: `${formatCurrency(amountValue)} added to ${selectedWallet.name}.`,
        timestamp: Date.now(),
        read: false,
        transactionId: transaction.id,
        route: '/history',
      });
      showFeedbackDialog({
        title: 'Income saved',
        message: `${formatCurrency(amountValue)} was added to ${selectedWallet.name}.`,
        variant: 'success',
      });
      router.back();
    } catch (submitError) {
      console.error('Firestore income save failed', submitError);
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
        <Text style={{ color: theme.text, fontSize: 28, fontWeight: '900' }}>Add income</Text>
        <Text style={{ color: theme.muted, fontSize: 13 }}>Add only to the selected wallet.</Text>
      </View>

      <Card style={{ padding: 16, gap: 16 }}>
        <Input label="Amount" value={amount} onChangeText={setAmount} prefix="₹" keyboardType="numeric" />
        <Input
          label="Description"
          value={description}
          onChangeText={setDescription}
          placeholder={`${selectedSource.name} details, employer, client...`}
        />
        <Input
          label="Optional note"
          value={note}
          onChangeText={setNote}
          placeholder="Anything worth remembering?"
          multiline
          numberOfLines={3}
        />
        <View style={{ gap: 8 }}>
          <Text style={{ color: theme.muted, fontSize: 14, fontWeight: '700' }}>Transaction date</Text>
          <Pressable
            onPress={() => setShowDatePicker(true)}
            style={{
              borderRadius: Radius.md,
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.inputBackground,
              paddingVertical: 14,
              paddingHorizontal: 14,
            }}
          >
            <Text style={{ color: theme.text, fontSize: 15 }}>{formatDateLabel(transactionDate.getTime())}</Text>
          </Pressable>
          {showDatePicker ? (
            <DateTimePicker
              value={transactionDate}
              mode="date"
              display="default"
              maximumDate={new Date()}
              onChange={(_event, selectedDate) => {
                const currentDate = selectedDate ?? transactionDate;
                setShowDatePicker(Platform.OS === 'ios');
                if (selectedDate) setTransactionDate(currentDate);
              }}
            />
          ) : null}
        </View>
      </Card>

      <PickerSection title="Wallet to credit" theme={theme}>
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

      <PickerSection title="Income source" theme={theme}>
        {incomeSources.map((source) => (
          <SelectionChip
            key={source.id}
            label={source.name}
            icon={source.icon}
            color={source.color}
            selected={sourceId === source.id}
            onPress={() => {
              setSourceId(source.id);
              setRecurringType(source.defaultRecurringType);
            }}
          />
        ))}
      </PickerSection>

      <PickerSection
        title={recurringType === 'none' ? 'Repeat schedule' : `Repeats ${recurringType}`}
        helperText="Recurring items are stored with a schedule flag for upcoming automation."
        theme={theme}
      >
        {recurringOptions.map((option) => (
          <SelectionChip
            key={option}
            label={recurringLabel(option)}
            icon={option === 'none' ? 'flash-outline' : 'repeat-outline'}
            selected={recurringType === option}
            color={Palette.emerald}
            onPress={() => setRecurringType(option)}
          />
        ))}
      </PickerSection>

      {error ? <Text style={{ color: Palette.orange, fontWeight: '700' }}>{error}</Text> : null}
      <Button
        label={isSaving ? 'Saving...' : 'Save income'}
        icon="checkmark-circle-outline"
        onPress={handleSubmit}
        style={{ backgroundColor: Palette.emerald, opacity: isSaving ? 0.7 : 1 }}
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
