import { AppIcon } from '@/components/ui/app-icon';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SelectionChip } from '@/components/ui/selection-chip';
import { ThemeToggleButton } from '@/components/ui/theme-toggle-button';
import { Palette } from '@/constants/design';
import { useAppTheme } from '@/hooks/use-app-theme';
import { signOutUser } from '@/services/firebase/auth';
import { clearPersistedState } from '@/services/persistence';
import { useCategoryStore } from '@/store/categoryStore';
import { useNoteStore } from '@/store/noteStore';
import { useTransactionStore } from '@/store/transactionStore';
import { useUserStore } from '@/store/userStore';
import { useWalletStore } from '@/store/walletStore';
import { Wallet, WalletType } from '@/types';
import { formatCurrency } from '@/utils/formatters';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const walletPresets: { type: WalletType; name: string; icon: string; color: string }[] = [
  { type: 'paytm', name: 'Paytm', icon: 'phone-portrait-outline', color: '#06B6D4' },
  { type: 'bank', name: 'Bank Account', icon: 'business-outline', color: '#6366F1' },
  { type: 'credit_card', name: 'Credit Card', icon: 'card-outline', color: '#8B5CF6' },
  { type: 'custom', name: 'Custom Wallet', icon: 'wallet-outline', color: '#14B8A6' },
];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const profile = useUserStore((state) => state.profile);
  const settings = useUserStore((state) => state.settings);
  const setSettings = useUserStore((state) => state.setSettings);
  const clearProfile = useUserStore((state) => state.clearProfile);
  const wallets = useWalletStore((state) => state.wallets);
  const upsertWallet = useWalletStore((state) => state.upsertWallet);
  const toggleWallet = useWalletStore((state) => state.toggleWallet);
  const resetWallets = useWalletStore((state) => state.resetWallets);
  const initializeCategories = useCategoryStore((state) => state.initializeCategories);
  const setTransactions = useTransactionStore((state) => state.setTransactions);
  const setNotes = useNoteStore((state) => state.setNotes);
  const router = useRouter();
  const [walletName, setWalletName] = useState('');
  const [walletBalance, setWalletBalance] = useState('');
  const [preset, setPreset] = useState(walletPresets[0]);

  async function handleLogout() {
    try {
      await signOutUser();
    } catch {
      // local sign-out still completes
    }
    await clearPersistedState();
    resetWallets();
    initializeCategories([]);
    setTransactions([]);
    setNotes([]);
    clearProfile();
    router.replace('/login');
  }

  function handleAddWallet() {
    const balance = Number(walletBalance || 0);
    const timestamp = Date.now();
    const wallet: Wallet = {
      id: `wallet-${preset.type}-${timestamp}`,
      name: walletName.trim() || preset.name,
      type: preset.type,
      balance: Number.isFinite(balance) ? balance : 0,
      icon: preset.icon,
      color: preset.color,
      isEnabled: true,
      isDefault: false,
      createdAt: timestamp,
    };
    upsertWallet(wallet);
    setWalletName('');
    setWalletBalance('');
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, paddingBottom: 110, gap: 16 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View style={{ gap: 6, flex: 1 }}>
          <Text style={{ color: theme.text, fontSize: 28, fontWeight: '900' }}>Settings</Text>
          <Text style={{ color: theme.muted, fontSize: 13 }}>Profile, wallets, security, and sync.</Text>
        </View>
        <ThemeToggleButton />
      </View>

      <Card style={{ padding: 16, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <AppIcon name="person-outline" color={Palette.blue} backgroundColor="rgba(59, 130, 246, 0.18)" size={24} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.text, fontSize: 17, fontWeight: '900' }}>{profile?.name ?? 'Guest'}</Text>
            <Text style={{ color: theme.muted, fontSize: 12 }}>{profile?.email ?? 'Sign in to sync data'}</Text>
          </View>
        </View>
      </Card>

      <Card style={{ padding: 16, gap: 14 }}>
        <Text style={{ color: theme.text, fontSize: 18, fontWeight: '900' }}>Security</Text>
        <SettingSwitch label="PIN lock" value={settings.appLockEnabled} onValueChange={(value) => setSettings({ appLockEnabled: value })} theme={theme} />
        <SettingSwitch
          label="Fingerprint"
          value={settings.biometricEnabled}
          onValueChange={(value) => setSettings({ biometricEnabled: value })}
          theme={theme}
        />
        <SettingSwitch
          label="Notifications"
          value={settings.notificationsEnabled}
          onValueChange={(value) => setSettings({ notificationsEnabled: value })}
          theme={theme}
        />
      </Card>

      <Card style={{ padding: 16, gap: 14 }}>
        <Text style={{ color: theme.text, fontSize: 18, fontWeight: '900' }}>Wallet management</Text>
        {wallets.map((wallet) => (
          <View key={wallet.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <AppIcon name={wallet.icon} color={wallet.color} backgroundColor={`${wallet.color}20`} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.text, fontWeight: '800' }}>{wallet.name}</Text>
              <Text style={{ color: theme.muted, fontSize: 12 }}>{formatCurrency(wallet.balance)}</Text>
            </View>
            <Switch value={wallet.isEnabled} onValueChange={() => toggleWallet(wallet.id)} />
          </View>
        ))}
      </Card>

      <Card style={{ padding: 16, gap: 14 }}>
        <Text style={{ color: theme.text, fontSize: 18, fontWeight: '900' }}>Create wallet</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {walletPresets.map((item) => (
            <SelectionChip
              key={item.type}
              label={item.name}
              icon={item.icon}
              color={item.color}
              selected={preset.type === item.type}
              onPress={() => setPreset(item)}
            />
          ))}
        </View>
        <Input label="Wallet name" value={walletName} onChangeText={setWalletName} placeholder={preset.name} />
        <Input label="Opening balance" value={walletBalance} onChangeText={setWalletBalance} keyboardType="numeric" prefix="₹" />
        <Button label="Add wallet" icon="add-circle-outline" onPress={handleAddWallet} />
      </Card>

      {profile ? (
        <Button label="Logout" icon="log-out-outline" onPress={handleLogout} secondary />
      ) : (
        <Button label="Sign in" icon="log-in-outline" onPress={() => router.push('/login')} secondary />
      )}
    </ScrollView>
  );
}

function SettingSwitch({
  label,
  value,
  onValueChange,
  theme,
}: {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  theme: ReturnType<typeof useAppTheme>;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Text style={{ color: theme.text, fontSize: 15, fontWeight: '800' }}>{label}</Text>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );
}
