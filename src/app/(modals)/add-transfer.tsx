import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SelectionChip } from '@/components/ui/selection-chip';
import { Palette } from '@/constants/design';
import { useAppTheme } from '@/hooks/use-app-theme';
import { buildTransferTransaction } from '@/services/finance/transactions';
import { getCurrentFirebaseUserId } from '@/services/firebase/auth';
import { updateTransactionWithWallets } from '@/services/firebase/firestore';
import { showFeedbackDialog } from '@/store/feedbackDialogStore';
import { useNotificationStore } from '@/store/notificationStore';
import { useTransactionStore } from '@/store/transactionStore';
import { useWalletStore } from '@/store/walletStore';
import { formatCurrency } from '@/utils/formatters';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

export default function AddTransferScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const wallets = useWalletStore((state) => state.wallets.filter((wallet) => wallet.isEnabled));
  const totalBalance = useWalletStore((state) => state.totalBalance)();
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [sourceWalletId, setSourceWalletId] = useState(wallets[0]?.id ?? '');
  const [destinationWalletId, setDestinationWalletId] = useState(wallets[1]?.id ?? wallets[0]?.id ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const sourceWallet = useMemo(() => wallets.find((item) => item.id === sourceWalletId), [sourceWalletId, wallets]);
  const destinationWallet = useMemo(
    () => wallets.find((item) => item.id === destinationWalletId),
    [destinationWalletId, wallets]
  );

  async function handleSubmit() {
    const amountValue = Number(amount);
    if (!reason.trim()) return setError('Reason is required.');
    if (!sourceWallet || !destinationWallet) return setError('Select both wallets.');
    if (sourceWallet.id === destinationWallet.id) return setError('Source and destination cannot be the same wallet.');
    if (!Number.isFinite(amountValue) || amountValue <= 0) return setError('Enter a valid amount.');
    const userId = getCurrentFirebaseUserId();
    if (!userId) return setError('Please sign in before saving transfers.');
    if (sourceWallet.balance < amountValue) {
      return setError(`Insufficient ${sourceWallet.name} balance. Available ${formatCurrency(sourceWallet.balance)}.`);
    }

    const transaction = buildTransferTransaction({
      amount: amountValue,
      sourceWallet,
      destinationWallet,
      reason,
      note,
      totalBalanceBefore: totalBalance,
    });

    const updatedSourceWallet = {
      ...sourceWallet,
      balance: sourceWallet.balance - amountValue,
    };
    const updatedDestinationWallet = {
      ...destinationWallet,
      balance: destinationWallet.balance + amountValue,
    };

    const sourceFundingWallet = sourceWallet.fundingSourceWalletId
      ? wallets.find((wallet) => wallet.id === sourceWallet.fundingSourceWalletId)
      : undefined;
    const destinationFundingWallet = destinationWallet.fundingSourceWalletId
      ? wallets.find((wallet) => wallet.id === destinationWallet.fundingSourceWalletId)
      : undefined;

    const walletUpdates = new Map<string, typeof updatedSourceWallet>();
    walletUpdates.set(updatedSourceWallet.id, updatedSourceWallet);
    walletUpdates.set(updatedDestinationWallet.id, updatedDestinationWallet);

    if (sourceFundingWallet) {
      walletUpdates.set(sourceFundingWallet.id, {
        ...sourceFundingWallet,
        balance:
          (walletUpdates.get(sourceFundingWallet.id)?.balance ?? sourceFundingWallet.balance) - amountValue,
      });
    }
    if (destinationFundingWallet) {
      walletUpdates.set(destinationFundingWallet.id, {
        ...destinationFundingWallet,
        balance:
          (walletUpdates.get(destinationFundingWallet.id)?.balance ?? destinationFundingWallet.balance) + amountValue,
      });
    }

    const walletsToSave = Array.from(walletUpdates.values());

    try {
      setIsSaving(true);
      setError(null);
      await updateTransactionWithWallets(userId, transaction, walletsToSave);
      useWalletStore.getState().applyTransactionLocal(transaction);
      useTransactionStore.getState().addTransactionLocal(transaction);
      useNotificationStore.getState().addNotification({
        id: `transaction-${transaction.id}`,
        kind: 'transaction',
        title: 'Transfer saved',
        body: `${formatCurrency(amountValue)} moved from ${sourceWallet.name} to ${destinationWallet.name}.`,
        timestamp: Date.now(),
        read: false,
        transactionId: transaction.id,
        route: '/history',
      });
      showFeedbackDialog({
        title: 'Transfer saved',
        message: `${formatCurrency(amountValue)} moved from ${sourceWallet.name} to ${destinationWallet.name}.`,
        variant: 'success',
      });
      router.back();
    } catch (submitError) {
      console.error('Firestore transfer save failed', submitError);
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
        <Text style={{ color: theme.text, fontSize: 28, fontWeight: '900' }}>Add transfer</Text>
        <Text style={{ color: theme.muted, fontSize: 13 }}>Move money between wallets without recording income or expense.</Text>
      </View>

      <Card style={{ padding: 16, gap: 16 }}>
        <Input label="Amount" value={amount} onChangeText={setAmount} prefix="₹" keyboardType="numeric" />
        <Input label="Reason" value={reason} onChangeText={setReason} placeholder="Cash withdrawal, bank deposit..." />
        <Input
          label="Optional note"
          value={note}
          onChangeText={setNote}
          placeholder="Add context for future you"
          multiline
          numberOfLines={3}
        />
      </Card>

      <PickerSection title="Source wallet" theme={theme}>
        {wallets.map((wallet) => (
          <SelectionChip
            key={wallet.id}
            label={`${wallet.name} • ${formatCurrency(wallet.balance)}`}
            icon={wallet.icon}
            color={wallet.color}
            selected={sourceWalletId === wallet.id}
            onPress={() => setSourceWalletId(wallet.id)}
          />
        ))}
      </PickerSection>

      <PickerSection title="Destination wallet" theme={theme}>
        {wallets.map((wallet) => (
          <SelectionChip
            key={wallet.id}
            label={`${wallet.name} • ${formatCurrency(wallet.balance)}`}
            icon={wallet.icon}
            color={wallet.color}
            selected={destinationWalletId === wallet.id}
            onPress={() => setDestinationWalletId(wallet.id)}
          />
        ))}
      </PickerSection>

      {error ? <Text style={{ color: Palette.orange, fontWeight: '700' }}>{error}</Text> : null}
      <Button
        label={isSaving ? 'Saving...' : 'Save transfer'}
        icon="swap-horizontal-outline"
        onPress={handleSubmit}
        style={{ backgroundColor: Palette.purple, opacity: isSaving ? 0.7 : 1 }}
      />
    </ScrollView>
  );
}

function PickerSection({
  title,
  children,
  theme,
}: {
  title: string;
  children: React.ReactNode;
  theme: ReturnType<typeof useAppTheme>;
}) {
  return (
    <Card style={{ padding: 16, gap: 12 }}>
      <Text style={{ color: theme.text, fontSize: 16, fontWeight: '900' }}>{title}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>{children}</View>
    </Card>
  );
}
