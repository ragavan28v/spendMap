import { AppIcon } from '@/components/ui/app-icon';
import { Button } from '@/components/ui/button';
import { ThemeToggleButton } from '@/components/ui/theme-toggle-button';
import { useAppTheme } from '@/hooks/use-app-theme';
import { signInWithGoogle } from '@/services/firebase/auth';
import { useUserStore } from '@/store/userStore';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const orbitCards = [
  {
    title: 'Fast entry',
    icon: 'flash-outline',
    accent: '#3B82F6',
  },
  {
    title: 'Wallet view',
    icon: 'wallet-outline',
    accent: '#10B981',
  },
  {
    title: 'Clean reports',
    icon: 'document-text-outline',
    accent: '#8B5CF6',
  },
];

const orbitRadius = 116;
const orbitCardSize = 92;
const orbitCoreSize = 182;
const orbitDuration = 9500;

export default function LoginScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const manifest = Constants.expoConfig ?? Constants.manifest;
  const extra = (manifest as { extra?: Record<string, string> })?.extra ?? null;
  const googleWebClientId = extra?.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const googleIosClientId = extra?.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || undefined;

  const [error, setError] = useState<string | null>(null);
  const setProfile = useUserStore((state) => state.setProfile);
  const orbitProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(orbitProgress, {
        toValue: 1,
        duration: orbitDuration,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    loop.start();

    return () => {
      loop.stop();
    };
  }, [orbitProgress]);

  useEffect(() => {
    if (googleWebClientId) {
      GoogleSignin.configure({
        webClientId: googleWebClientId,
        iosClientId: googleIosClientId,
        scopes: ['profile', 'email'],
      });
    }
  }, [googleWebClientId, googleIosClientId]);

  async function handleGoogleSignIn() {
    if (!googleWebClientId) {
      setError("Google sign-in isn't configured yet.");
      return;
    }

    try {
      setError(null);
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      await GoogleSignin.signOut().catch(() => {});
      const signInResponse = await GoogleSignin.signIn();

      if (signInResponse.type !== 'success') {
        setError('Google sign-in was cancelled.');
        return;
      }

      const idToken = signInResponse.data.idToken ?? (await GoogleSignin.getTokens()).idToken;
      if (!idToken) {
        setError('Google sign-in did not return a valid token.');
        return;
      }

      const signedInProfile = await signInWithGoogle(idToken);
      setProfile(signedInProfile);
      router.replace('/dashboard');
    } catch (signInError) {
      console.error('Google sign-in failed', signInError);
      setError('Unable to sign in with Google. Please try again.');
    }
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View style={styles.root}>
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <View
            style={[
              styles.backdropOrb,
              {
                top: -70,
                right: -64,
                width: 210,
                height: 210,
                borderRadius: 105,
                backgroundColor: `${theme.accent}0f`,
              },
            ]}
          />
          <View
            style={[
              styles.backdropOrb,
              {
                bottom: -90,
                left: -78,
                width: 217,
                height: 217,
                borderRadius: 108,
                backgroundColor: `${theme.success}0a`,
              },
            ]}
          />
          <View
            style={[
              styles.backdropOrb,
              {
                top: '9%',
                left: '9%',
                width: 67,
                height: 67,
                borderRadius: 33.5,
                backgroundColor: `${theme.purple}11`,
              },
            ]}
          />
          <View
            style={[
              styles.backdropOrb,
              {
                top: '15%',
                right: '11%',
                width: 90,
                height: 90,
                borderRadius: 45,
                backgroundColor: `${theme.cyan}0f`,
              },
            ]}
          />
          <View
            style={[
              styles.backdropOrb,
              {
                bottom: '15%',
                right: '17%',
                width: 62,
                height: 62,
                borderRadius: 31,
                backgroundColor: `${theme.accent}11`,
              },
            ]}
          />
        </View>

        <View style={styles.content}>
          <View style={styles.mainStack}>
            <View style={styles.headerBlock}>
              <View style={styles.topBar}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                  <View style={[styles.brandMark, { backgroundColor: theme.surfaceGlass, borderColor: theme.border }]}>
                    <AppIcon name="wallet-outline" color={theme.accent} size={26} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 }}>
                      SPENDMAP
                    </Text>
                    <Text style={{ color: theme.text, fontSize: 15, fontWeight: '800' }}>Money, simplified</Text>
                  </View>
                </View>
                <ThemeToggleButton />
              </View>

              <View style={styles.hero}>
                <Text style={[styles.title, { color: theme.text }]}>Track spending without the clutter.</Text>
                <Text style={[styles.subtitle, { color: theme.muted }]}>
                  Sign in to sync wallets, transactions, notes, and reports across devices.
                </Text>
              </View>
            </View>

            <View style={styles.orbitBlock}>
              <View style={styles.orbitHeading}>
                <Text style={{ color: theme.text, fontSize: 14, fontWeight: '900' }}>A calmer way to start</Text>
              </View>

              <View style={styles.orbitStage}>
                <View
                  style={[
                    styles.orbitGlow,
                    {
                      backgroundColor: `${theme.accent}12`,
                    },
                  ]}
                />

                <View
                  style={[
                    styles.orbitCore,
                    {
                      backgroundColor: theme.surfaceGlass,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <AppIcon name="wallet-outline" color={theme.accent} size={32} />
                  <Text style={{ color: theme.text, fontSize: 20, fontWeight: '900', marginTop: 10 }}>SpendMap</Text>
                  <Text style={{ color: theme.muted, fontSize: 12, lineHeight: 17, textAlign: 'center', marginTop: 6 }}>
                    One place for spending, balances, notes, and reports.
                  </Text>
                </View>

                {orbitCards.map((card, index) => {
                  const phase = index / orbitCards.length;
                  const orbitAngle = orbitProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [`${phase * 360}deg`, `${phase * 360 + 360}deg`],
                    extrapolate: 'clamp',
                  });
                  const counterAngle = orbitProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [`-${phase * 360}deg`, `-${phase * 360 + 360}deg`],
                    extrapolate: 'clamp',
                  });

                  return (
                    <Animated.View
                      key={card.title}
                      style={[
                        styles.orbitCard,
                        {
                          width: orbitCardSize,
                          height: orbitCardSize,
                          marginLeft: -orbitCardSize / 2,
                          marginTop: -orbitCardSize / 2,
                          borderColor: theme.border,
                          backgroundColor: theme.surfaceElevated,
                          transform: [
                            { rotate: orbitAngle },
                            { translateX: orbitRadius },
                            { rotate: counterAngle },
                          ],
                        },
                      ]}
                    >
                      <View style={[styles.orbitCardIcon, { backgroundColor: `${card.accent}16` }]}>
                        <AppIcon name={card.icon} color={card.accent} size={18} />
                      </View>
                      <Text style={{ color: theme.text, fontSize: 11, fontWeight: '800', textAlign: 'center' }}>
                        {card.title}
                      </Text>
                    </Animated.View>
                  );
                })}
              </View>
            </View>

            <View style={[styles.authDock, { backgroundColor: theme.surfaceGlass, borderColor: theme.border }]}>
              <Text style={{ color: theme.text, fontSize: 15, fontWeight: '900' }}>Continue</Text>

              <View style={{ gap: 10 }}>
                <Button label="Sign in with Google" onPress={handleGoogleSignIn} icon="logo-google" />
              </View>

              {!googleWebClientId ? (
                <Text style={{ color: theme.muted, fontSize: 11, lineHeight: 16 }}>
                  Google sign-in isn&apos;t configured yet.
                </Text>
              ) : null}
              {error ? <Text style={{ color: theme.warning, fontSize: 11, lineHeight: 16 }}>{error}</Text> : null}
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  root: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 12,
  },
  mainStack: {
    flex: 1,
    justifyContent: 'space-between',
    gap: 12,
  },
  headerBlock: {
    gap: 12,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  brandMark: {
    width: 54,
    height: 54,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    gap: 8,
  },
  title: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '900',
    letterSpacing: -0.7,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  orbitBlock: {
    gap: 10,
    flex: 1,
    justifyContent: 'center',
  },
  orbitHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  orbitStage: {
    flex: 1,
    minHeight: 250,
    maxHeight: 330,
    marginTop: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 34,
    overflow: 'visible',
  },
  orbitGlow: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 260,
    opacity: 1,
  },
  orbitCore: {
    width: orbitCoreSize,
    height: orbitCoreSize,
    borderRadius: orbitCoreSize / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 3,
  },
  orbitCard: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    borderRadius: 28,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  orbitCardIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authDock: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  backdropOrb: {
    position: 'absolute',
  },
});
