import { useWalletStore } from '@/store/walletStore';
import { useMemo } from 'react';

export function useWallets() {
  const wallets = useWalletStore((state) => state.wallets);
  const totalBalance = useWalletStore((state) => state.totalBalance)();

  const walletStats = useMemo(
    () =>
      wallets
        .filter((wallet) => wallet.isEnabled)
        .map((wallet) => ({
          ...wallet,
          share: totalBalance > 0 ? wallet.balance / totalBalance : 0,
        })),
    [wallets, totalBalance]
  );

  return {
    wallets,
    totalBalance,
    walletStats,
  };
}

export function useSelectedWallet() {
  const selectedWalletId = useWalletStore((state) => state.selectedWalletId);
  const wallet = useWalletStore((state) => state.getWalletById(selectedWalletId));
  return wallet;
}
