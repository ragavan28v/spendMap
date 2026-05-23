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
import { cancelAllReminderNotifications } from '@/services/notifications/notifications';
import { clearPin, hasPin, savePin } from '@/services/security/app-lock';
import { clearSyncQueue, saveOrQueueProfile } from '@/services/sync/offlineQueue';
import { useCategoryStore } from '@/store/categoryStore';
import { useNotificationStore } from '@/store/notificationStore';
import { useNoteStore } from '@/store/noteStore';
import { useTransactionStore } from '@/store/transactionStore';
import { useUserStore } from '@/store/userStore';
import { useWalletStore } from '@/store/walletStore';
import { Wallet, WalletType, UserProfile } from '@/types';
import { formatCurrency } from '@/utils/formatters';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
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
  const setProfile = useUserStore((state) => state.setProfile);
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
  const clearNotifications = useNotificationStore((state) => state.clearNotifications);
  const router = useRouter();
  const [walletName, setWalletName] = useState('');
  const [walletBalance, setWalletBalance] = useState('');
  const [preset, setPreset] = useState(walletPresets[0]);
  const [pinValue, setPinValue] = useState('');
  const [confirmPinValue, setConfirmPinValue] = useState('');
  const [storedPinExists, setStoredPinExists] = useState(false);
  const [securityMessage, setSecurityMessage] = useState<string | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.name ?? '');

  useEffect(() => {
    let active = true;

    void (async () => {
      const pinExists = await hasPin();
      if (!active) return;
      setStoredPinExists(pinExists);
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setDisplayName(profile?.name ?? '');
    setIsEditingProfile(false);
  }, [profile?.name, profile?.photoURL, profile?.uid]);

  async function handleLogout() {
    try {
      await signOutUser();
    } catch {
      // local sign-out still completes
    }
    await cancelAllReminderNotifications();
    await clearPersistedState();
    await clearSyncQueue();
    resetWallets();
    initializeCategories([]);
    setTransactions([]);
    setNotes([]);
    clearNotifications();
    clearProfile();
    router.replace('/login');
  }

  async function handleSaveProfile() {
    if (!profile) {
      return;
    }

    const nextProfile: UserProfile = {
      ...profile,
      name: displayName.trim() || profile.name,
    };

    setProfile(nextProfile);
    await saveOrQueueProfile(profile.uid, nextProfile);
    setIsEditingProfile(false);
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

  async function handleNotificationsToggle(value: boolean) {
    setSettings({ notificationsEnabled: value });
    if (!value) {
      await cancelAllReminderNotifications();
    }
  }

  function handleAppLockToggle(value: boolean) {
    if (value && !storedPinExists) {
      setSettings({ appLockEnabled: false });
      setSecurityMessage('Save a PIN first to enable app lock.');
      return;
    }

    setSettings({ appLockEnabled: value });
    setSecurityMessage(value ? 'Set a PIN below to finish turning on app lock.' : 'App lock is off.');
  }

  async function handleSavePin() {
    const pin = pinValue.trim();
    const confirmation = confirmPinValue.trim();

    if (!/^\d{4,6}$/.test(pin)) {
      setSecurityMessage('Use a 4 to 6 digit PIN.');
      return;
    }

    if (pin !== confirmation) {
      setSecurityMessage('PINs do not match.');
      return;
    }

    await savePin(pin);
    setStoredPinExists(true);
    setSettings({ appLockEnabled: true });
    setPinValue('');
    setConfirmPinValue('');
    setSecurityMessage('PIN saved. App lock is on.');
  }

  async function handleClearPin() {
    await clearPin();
    setStoredPinExists(false);
    setPinValue('');
    setConfirmPinValue('');
    setSettings({ appLockEnabled: false });
    setSecurityMessage('PIN removed. App lock is off.');
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, paddingBottom: 110, gap: 16 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ gap: 6, flex: 1 }}>
          <Text style={{ color: theme.text, fontSize: 28, fontWeight: '900' }}>Settings</Text>
          <Text style={{ color: theme.muted, fontSize: 13 }}>Profile, wallets, security, and sync.</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <ThemeToggleButton />
          {profile ? (
            <Button label="Logout" icon="log-out-outline" onPress={handleLogout} secondary compact />
          ) : (
            <Button label="Sign in" icon="log-in-outline" onPress={() => router.push('/login')} secondary compact />
          )}
        </View>
      </View>

      <Card style={{ padding: 16, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              overflow: 'hidden',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.notificationBackground,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <AppIcon name="person-outline" color={Palette.blue} backgroundColor="transparent" size={24} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ color: theme.text, fontSize: 17, fontWeight: '900' }}>{profile?.name ?? 'Guest'}</Text>
            <Text style={{ color: theme.muted, fontSize: 12 }}>{profile?.email ?? 'Account required'}</Text>
          </View>
          {profile ? (
            <Button
              label=""
              icon={isEditingProfile ? 'close-outline' : 'create-outline'}
              secondary
              compact
              style={{ width: 40, height: 40, borderRadius: 20 }}
              onPress={() => setIsEditingProfile((current) => !current)}
            />
          ) : null}
        </View>
        {profile && isEditingProfile ? (
          <View style={{ gap: 12, marginTop: 4 }}>
            <Input
              label="Display name"
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your name"
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button
                label="Save profile"
                icon="save-outline"
                onPress={handleSaveProfile}
                style={{ flex: 1 }}
              />
              <Button
                label="Cancel"
                secondary
                compact
                onPress={() => {
                  setDisplayName(profile.name);
                  setIsEditingProfile(false);
                }}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        ) : null}
      </Card>

      <Card style={{ padding: 16, gap: 14 }}>
        <Text style={{ color: theme.text, fontSize: 18, fontWeight: '900' }}>Security</Text>
        <SettingSwitch label="PIN lock" value={settings.appLockEnabled} onValueChange={handleAppLockToggle} theme={theme} />
        <SettingSwitch
          label="Notifications"
          value={settings.notificationsEnabled}
          onValueChange={handleNotificationsToggle}
          theme={theme}
        />
        <Text style={{ color: theme.muted, fontSize: 12, lineHeight: 18 }}>
          PIN lock stores a local app PIN on this device.
        </Text>
        <Input
          label="PIN"
          value={pinValue}
          onChangeText={setPinValue}
          placeholder="4-6 digits"
          keyboardType="numeric"
          secureTextEntry
          maxLength={6}
        />
        <Input
          label="Confirm PIN"
          value={confirmPinValue}
          onChangeText={setConfirmPinValue}
          placeholder="Repeat the same PIN"
          keyboardType="numeric"
          secureTextEntry
          maxLength={6}
        />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button
            label={storedPinExists ? 'Update PIN' : 'Save PIN'}
            icon="shield-checkmark-outline"
            onPress={handleSavePin}
            style={{ flex: 1 }}
          />
          {storedPinExists ? (
            <Button
              label="Clear PIN"
              icon="trash-outline"
              onPress={handleClearPin}
              secondary
              compact
              style={{ flex: 1 }}
            />
          ) : null}
        </View>
        {securityMessage ? <Text style={{ color: theme.subtle, fontSize: 12, lineHeight: 18 }}>{securityMessage}</Text> : null}
      </Card>

      <Card style={{ padding: 16, gap: 10 }}>
        <Text style={{ color: theme.text, fontSize: 18, fontWeight: '900' }}>Security status</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <StatusChip
            label="PIN"
            value={storedPinExists ? 'Saved' : 'Not set'}
            color={storedPinExists ? Palette.emerald : Palette.orange}
            theme={theme}
          />
          <StatusChip
            label="App lock"
            value={settings.appLockEnabled ? 'On' : 'Off'}
            color={settings.appLockEnabled ? Palette.emerald : Palette.orange}
            theme={theme}
          />
        </View>
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

function StatusChip({
  label,
  value,
  color,
  theme,
}: {
  label: string;
  value: string;
  color: string;
  theme: ReturnType<typeof useAppTheme>;
}) {
  return (
    <View
      style={{
        minWidth: 102,
        flexGrow: 1,
        padding: 12,
        borderRadius: 16,
        backgroundColor: theme.chipBackground,
        borderWidth: 1,
        borderColor: `${color}30`,
        gap: 4,
      }}
    >
      <Text style={{ color: theme.muted, fontSize: 11, fontWeight: '700' }}>{label}</Text>
      <Text style={{ color, fontSize: 13, fontWeight: '900' }}>{value}</Text>
    </View>
  );
}
