import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAppTheme } from '@/hooks/use-app-theme';
import { signInWithGoogle } from '@/services/firebase/auth';
import { useUserStore } from '@/store/userStore';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

export default function LoginScreen() {
  const theme = useAppTheme();
  const manifest = Constants.expoConfig ?? Constants.manifest;
  const extra = (manifest as { extra?: Record<string, string> })?.extra ?? null;

  const googleWebClientId = extra?.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const googleIosClientId = extra?.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || undefined;
  const [error, setError] = useState<string | null>(null);
  const profile = useUserStore((state) => state.profile);
  const setProfile = useUserStore((state) => state.setProfile);
  const router = useRouter();

  useEffect(() => {
    if (googleWebClientId) {
      GoogleSignin.configure({
        webClientId: googleWebClientId,
        iosClientId: googleIosClientId,
        scopes: ['profile', 'email'],
      });
    }
  }, [googleWebClientId, googleIosClientId]);

  useEffect(() => {
    if (profile) {
      router.replace('/dashboard');
    }
  }, [router, profile]);

  async function handleGoogleSignIn() {
    if (!googleWebClientId) {
      setError("Google sign-in isn't configured yet.");
      return;
    }

    try {
      setError(null);
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      await GoogleSignin.signOut().catch(() => {
        // Ensure the Google account picker is shown instead of reusing a cached account.
      });
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
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <Card style={styles.card}>
          <Text style={[styles.title, { color: theme.text }]}>Welcome to SpendWise</Text>
          <Text style={[styles.body, { color: theme.muted }]}>Secure personal finance tracking with split wallets.</Text>
          <Button label="Sign in with Google" onPress={handleGoogleSignIn} />
          {!googleWebClientId && (
            <Text style={[styles.body, { color: theme.muted }]}>
              Google sign-in isn&apos;t configured yet. Make sure your Expo env vars are set and app.config.js is loaded.
            </Text>
          )}
          {error ? <Text style={[styles.body, { color: theme.warning }]}>{error}</Text> : null}
          <Button label="Continue without signing in" onPress={() => router.replace('/dashboard')} secondary />
        </Card>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  content: {
    padding: 16,
  },
  card: {
    padding: 24,
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
  },
});
