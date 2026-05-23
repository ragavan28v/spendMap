import { AppIcon } from '@/components/ui/app-icon';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Palette } from '@/constants/design';
import { useAppTheme } from '@/hooks/use-app-theme';
import { getStoredPin } from '@/services/security/app-lock';
import React, { useState } from 'react';
import { Text, View } from 'react-native';

interface AppLockScreenProps {
  onUnlock: () => void;
}

export function AppLockScreen({ onUnlock }: AppLockScreenProps) {
  const theme = useAppTheme();
  const [pin, setPin] = useState('');
  const [storedPin, setStoredPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    let active = true;

    void (async () => {
      const savedPin = await getStoredPin();
      if (!active) return;
      setStoredPin(savedPin ?? '');
    })();

    return () => {
      active = false;
    };
  }, []);

  function unlock() {
    onUnlock();
    setPin('');
    setError(null);
  }

  function handleUnlock() {
    if (!pin.trim()) {
      setError('Enter your PIN to continue.');
      return;
    }

    if (storedPin && pin.trim() === storedPin) {
      unlock();
      return;
    }

    setError('Incorrect PIN. Try again.');
  }

  function handlePinChange(value: string) {
    const nextValue = value.replace(/\D/g, '').slice(0, 6);
    setPin(nextValue);
    setError(null);

    if (!storedPin) {
      return;
    }

    if (nextValue.length === storedPin.length) {
      if (nextValue === storedPin) {
        unlock();
      } else {
        setError('Incorrect PIN. Try again.');
      }
    }
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.background,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        overflow: 'hidden',
      }}
    >
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: -40,
          right: -60,
          width: 220,
          height: 220,
          borderRadius: 220,
          backgroundColor: `${theme.accent}18`,
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          bottom: -70,
          left: -80,
          width: 260,
          height: 260,
          borderRadius: 260,
          backgroundColor: `${Palette.emerald}14`,
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: '18%',
          left: '12%',
          width: 120,
          height: 120,
          borderRadius: 120,
          backgroundColor: `${Palette.purple}14`,
        }}
      />

      <Card
        style={{
          width: '100%',
          maxWidth: 380,
          padding: 22,
          gap: 18,
          alignItems: 'center',
          backgroundColor: theme.surfaceElevated,
        }}
      >
      <View
        style={{
          width: 84,
          height: 84,
          borderRadius: 28,
          backgroundColor: theme.surfaceGlass,
          borderColor: theme.border,
          borderWidth: 1,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: theme.accent,
          shadowOpacity: 0.12,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 10 },
        }}
      >
        <AppIcon name="lock-closed-outline" color={theme.accent} size={30} />
      </View>
      <View style={{ gap: 6, alignItems: 'center' }}>
        <Text style={{ color: theme.text, fontSize: 28, fontWeight: '900', textAlign: 'center' }}>Locked</Text>
        <Text style={{ color: theme.muted, fontSize: 13, textAlign: 'center', maxWidth: 320 }}>
          Type your PIN and the app opens automatically once it matches.
        </Text>
      </View>

      <View style={{ width: '100%', maxWidth: 360, gap: 12 }}>
        <Input label="PIN" value={pin} onChangeText={handlePinChange} placeholder="Enter PIN" secureTextEntry keyboardType="numeric" maxLength={6} />
        {error ? <Text style={{ color: theme.warning, fontSize: 12, fontWeight: '700' }}>{error}</Text> : null}
        <Button label="Unlock" onPress={handleUnlock} style={{ width: '100%' }} />
      </View>
      </Card>
    </View>
  );
}
