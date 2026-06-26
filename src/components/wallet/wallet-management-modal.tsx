import { AppIcon } from '@/components/ui/app-icon';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAppTheme } from '@/hooks/use-app-theme';
import { Wallet } from '@/types';
import { formatCurrency } from '@/utils/formatters';
import React, { useState } from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';

interface WalletManagementModalProps {
  visible: boolean;
  wallet: Wallet | null;
  allWallets: Wallet[];
  onClose: () => void;
  onDelete: (walletId: string) => void;
  onLinkToParent: (walletId: string, parentWalletId: string | undefined) => void;
}

export function WalletManagementModal({
  visible,
  wallet,
  allWallets,
  onClose,
  onDelete,
  onLinkToParent,
}: WalletManagementModalProps) {
  const theme = useAppTheme();
  const [mode, setMode] = useState<'menu' | 'link'>('menu');
  const [selectedParentId, setSelectedParentId] = useState<string | undefined>(
    wallet?.fundingSourceWalletId
  );

  if (!wallet) return null;

  const parentWallet = wallet.fundingSourceWalletId
    ? allWallets.find((w) => w.id === wallet.fundingSourceWalletId)
    : null;

  const availableParents = allWallets.filter(
    (w) => w.id !== wallet.id && w.isEnabled
  );

  function handleDelete() {
    if (!wallet) return;
    onDelete(wallet.id);
    onClose();
  }

  function handleSaveParent() {
    if (!wallet) return;
    if (selectedParentId === wallet.fundingSourceWalletId) {
      setMode('menu');
      return;
    }

    const newParent = selectedParentId
      ? allWallets.find((w) => w.id === selectedParentId)
      : null;

    if (newParent && wallet.balance > newParent.balance) {
      // Could add error handling here
      return;
    }

    onLinkToParent(wallet.id, selectedParentId);
    setMode('menu');
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
        <View
          style={{
            flex: 1,
            marginTop: '20%',
            backgroundColor: theme.background,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 16,
            paddingTop: 24,
          }}
        >
          {mode === 'menu' ? (
            <>
              <View style={{ gap: 16, marginBottom: 20 }}>
                <View style={{ gap: 8 }}>
                  <Text
                    style={{
                      color: theme.text,
                      fontSize: 20,
                      fontWeight: '900',
                    }}
                  >
                    Manage "{wallet.name}"
                  </Text>
                  <Text style={{ color: theme.muted, fontSize: 13 }}>
                    {formatCurrency(wallet.balance)}
                  </Text>
                </View>

                {parentWallet ? (
                  <Card style={{ padding: 12, gap: 8, backgroundColor: theme.surface }}>
                    <Text
                      style={{
                        color: theme.muted,
                        fontSize: 12,
                        fontWeight: '700',
                      }}
                    >
                      LINKED TO
                    </Text>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <AppIcon
                        name={parentWallet.icon}
                        color={parentWallet.color}
                        backgroundColor={`${parentWallet.color}20`}
                        size={20}
                      />
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            color: theme.text,
                            fontWeight: '800',
                            fontSize: 14,
                          }}
                        >
                          {parentWallet.name}
                        </Text>
                        <Text style={{ color: theme.muted, fontSize: 11 }}>
                          {formatCurrency(parentWallet.balance)}
                        </Text>
                      </View>
                    </View>
                  </Card>
                ) : null}
              </View>

              <ScrollView
                style={{ flex: 1, marginBottom: 16 }}
                contentContainerStyle={{ gap: 10 }}
              >
                <Button
                  label={
                    parentWallet ? 'Change linked wallet' : 'Link to parent wallet'
                  }
                  icon="link-outline"
                  onPress={() => {
                    setMode('link');
                    setSelectedParentId(wallet.fundingSourceWalletId);
                  }}
                />

                {parentWallet ? (
                  <Button
                    label="Unlink from parent"
                    icon="unlink-outline"
                    secondary
                    onPress={() => onLinkToParent(wallet.id, undefined)}
                  />
                ) : null}

                <Button
                  label="Delete wallet"
                  icon="trash-outline"
                  secondary
                  onPress={handleDelete}
                  style={{ marginTop: 8 }}
                />
              </ScrollView>

              <Button
                label="Close"
                icon="close-outline"
                secondary
                compact
                onPress={onClose}
              />
            </>
          ) : (
            <>
              <View style={{ gap: 16, marginBottom: 20 }}>
                <Text
                  style={{
                    color: theme.text,
                    fontSize: 18,
                    fontWeight: '900',
                  }}
                >
                  Choose parent wallet
                </Text>
                <Text style={{ color: theme.muted, fontSize: 13 }}>
                  Select a wallet to link "{wallet.name}" to, or choose "None" to
                  unlink.
                </Text>
              </View>

              <ScrollView
                style={{ flex: 1, marginBottom: 16 }}
                contentContainerStyle={{ gap: 10 }}
              >
                <TouchableOpacity
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    backgroundColor: selectedParentId === undefined ? theme.chipBackground : theme.surface,
                    borderWidth: 2,
                    borderColor:
                      selectedParentId === undefined
                        ? '#14B8A6'
                        : theme.border,
                  }}
                  onPress={() => setSelectedParentId(undefined)}
                >
                  <Text
                    style={{
                      color:
                        selectedParentId === undefined ? '#14B8A6' : theme.text,
                      fontWeight: '800',
                      fontSize: 14,
                    }}
                  >
                    None (independent wallet)
                  </Text>
                </TouchableOpacity>

                {availableParents.map((parent) => (
                  <TouchableOpacity
                    key={parent.id}
                    style={{
                      padding: 12,
                      borderRadius: 12,
                      backgroundColor:
                        selectedParentId === parent.id
                          ? theme.chipBackground
                          : theme.surface,
                      borderWidth: 2,
                      borderColor:
                        selectedParentId === parent.id ? parent.color : theme.border,
                    }}
                    onPress={() => setSelectedParentId(parent.id)}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                      }}
                    >
                      <AppIcon
                        name={parent.icon}
                        color={parent.color}
                        backgroundColor={`${parent.color}20`}
                        size={20}
                      />
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            color:
                              selectedParentId === parent.id
                                ? parent.color
                                : theme.text,
                            fontWeight: '800',
                            fontSize: 14,
                          }}
                        >
                          {parent.name}
                        </Text>
                        <Text
                          style={{
                            color: theme.muted,
                            fontSize: 11,
                          }}
                        >
                          {formatCurrency(parent.balance)}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Button
                  label="Save"
                  icon="checkmark-outline"
                  onPress={handleSaveParent}
                  style={{ flex: 1 }}
                />
                <Button
                  label="Cancel"
                  icon="close-outline"
                  secondary
                  compact
                  onPress={() => setMode('menu')}
                  style={{ flex: 1 }}
                />
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
