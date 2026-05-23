import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = [
  '@spendwise:wallets',
  '@spendwise:selectedWalletId',
  '@spendwise:transactions',
  '@spendwise:categories',
  '@spendwise:settings',
  '@spendwise:profile',
  '@spendwise:notes',
  '@spendwise:notifications',
];

export async function clearPersistedState() {
  await AsyncStorage.multiRemove(KEYS);
}
