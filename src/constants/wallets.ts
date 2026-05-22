import { Wallet } from '@/types';

export const defaultWallets: Wallet[] = [
  {
    id: 'wallet-cash',
    name: 'Cash',
    type: 'cash',
    balance: 0,
    icon: 'cash-outline',
    color: '#10B981',
    isEnabled: true,
    isDefault: true,
    createdAt: Date.now(),
  },
  {
    id: 'wallet-gpay',
    name: 'GPay',
    type: 'gpay',
    balance: 0,
    icon: 'logo-google',
    color: '#3B82F6',
    isEnabled: true,
    isDefault: true,
    createdAt: Date.now(),
  },
  {
    id: 'wallet-amazon-pay',
    name: 'Amazon Pay',
    type: 'amazon_pay',
    balance: 0,
    icon: 'bag-handle-outline',
    color: '#F59E0B',
    isEnabled: true,
    isDefault: true,
    createdAt: Date.now(),
  },
  {
    id: 'wallet-airtel-pay',
    name: 'Airtel Pay',
    type: 'airtel_pay',
    balance: 0,
    icon: 'phone-portrait-outline',
    color: '#EF4444',
    isEnabled: true,
    isDefault: true,
    createdAt: Date.now(),
  },
  {
    id: 'wallet-bank',
    name: 'Bank',
    type: 'bank',
    balance: 0,
    icon: 'business-outline',
    color: '#6366F1',
    isEnabled: true,
    isDefault: true,
    createdAt: Date.now(),
  },
  {
    id: 'wallet-credit-card',
    name: 'Credit Card',
    type: 'credit_card',
    balance: 0,
    icon: 'card-outline',
    color: '#8B5CF6',
    isEnabled: true,
    isDefault: true,
    createdAt: Date.now(),
  },
];

export function mergeWithDefaultWallets(wallets: Wallet[]) {
  const walletMap = new Map<string, Wallet>();

  defaultWallets.forEach((wallet) => {
    walletMap.set(wallet.id, wallet);
  });

  wallets.forEach((wallet) => {
    walletMap.set(wallet.id, wallet);
  });

  return Array.from(walletMap.values());
}
