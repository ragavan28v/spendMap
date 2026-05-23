import AsyncStorage from '@react-native-async-storage/async-storage';

const PIN_KEY = '@spendmap:app-lock-pin';
const BACKGROUND_KEY = '@spendmap:app-lock-background-at';

export async function getStoredPin() {
  return AsyncStorage.getItem(PIN_KEY);
}

export async function savePin(pin: string) {
  await AsyncStorage.setItem(PIN_KEY, pin);
  return true;
}

export async function clearPin() {
  await AsyncStorage.removeItem(PIN_KEY);
  return true;
}

export async function setAppLockBackgroundAt(timestamp: number) {
  await AsyncStorage.setItem(BACKGROUND_KEY, String(timestamp));
}

export async function getAppLockBackgroundAt() {
  const storedValue = await AsyncStorage.getItem(BACKGROUND_KEY);
  const timestamp = Number(storedValue);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export async function clearAppLockBackgroundAt() {
  await AsyncStorage.removeItem(BACKGROUND_KEY);
}

export async function hasPin() {
  return Boolean(await getStoredPin());
}
