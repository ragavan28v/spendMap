import { AppIcon } from '@/components/ui/app-icon';
import { Button } from '@/components/ui/button';
import { ThemeToggleButton } from '@/components/ui/theme-toggle-button';
import { useAppTheme } from '@/hooks/use-app-theme';
import { signInWithGoogle } from '@/services/firebase/auth';
import { useUserStore } from '@/store/userStore';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type FeatureSlide = {
  title: string;
  body: string;
  icon: string;
  accent: string;
  chips: string[];
};

const featureSlides: FeatureSlide[] = [
  {
    title: 'Track every rupee',
    body: 'Record income, expenses, and wallet balances in a clean flow.',
    icon: 'sparkles-outline',
    accent: '#3B82F6',
    chips: ['Fast entry', 'Wallet balance'],
  },
  {
    title: 'Smart wallet views',
    body: 'See Cash, Paytm, Bank, and custom wallets at a glance.',
    icon: 'wallet-outline',
    accent: '#10B981',
    chips: ['Multiple wallets', 'Default wallet'],
  },
  {
    title: 'Reports that help',
    body: 'Generate polished monthly PDF and Excel reports quickly.',
    icon: 'document-text-outline',
    accent: '#8B5CF6',
    chips: ['PDF export', 'Excel export'],
  },
  {
    title: 'Dark and light',
    body: 'Switch moods instantly while keeping the interface elegant.',
    icon: 'moon-outline',
    accent: '#06B6D4',
    chips: ['Theme toggle', 'Readability'],
  },
];

const AUTO_SCROLL_INTERVAL = 2600;
const AUTO_SCROLL_DURATION = 900;

export default function LoginScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const manifest = Constants.expoConfig ?? Constants.manifest;
  const extra = (manifest as { extra?: Record<string, string> })?.extra ?? null;
  const googleWebClientId = extra?.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const googleIosClientId = extra?.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || undefined;

  const [error, setError] = useState<string | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const profile = useUserStore((state) => state.profile);
  const setProfile = useUserStore((state) => state.setProfile);
  const carouselRef = useRef<ScrollView>(null);
  const autoScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const carouselIndexRef = useRef(0);

  const orbOne = useRef(new Animated.Value(0)).current;
  const orbTwo = useRef(new Animated.Value(0)).current;

  const compact = width < 390;
  const featureCardWidth = useMemo(() => Math.min(width - 88, compact ? 260 : 280), [width, compact]);
  const featureGap = 10;
  const itemWidth = featureCardWidth + featureGap;
  const displaySlides = useMemo(
    () => (featureSlides.length > 1 ? [...featureSlides, featureSlides[0]] : featureSlides),
    []
  );

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

  const scrollToIndex = useCallback(
    (index: number, animated: boolean) => {
      carouselRef.current?.scrollTo({
        x: index * itemWidth,
        animated,
      });
    },
    [itemWidth]
  );

  const snapToIndex = useCallback(
    (index: number) => {
      carouselIndexRef.current = index;
      const displayIndex = index >= featureSlides.length ? 0 : index;
      setActiveSlide(displayIndex);
      if (index >= featureSlides.length) {
        scrollToIndex(0, false);
        carouselIndexRef.current = 0;
      }
    },
    [scrollToIndex]
  );

  const animateToIndex = useCallback(
    (targetIndex: number, onComplete?: () => void) => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      const startIndex = carouselIndexRef.current;
      const startOffset = startIndex * itemWidth;
      const targetOffset = targetIndex * itemWidth;
      const startTime = Date.now();

      const easeInOutCubic = (value: number) =>
        value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;

      const frame = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / AUTO_SCROLL_DURATION, 1);
        const eased = easeInOutCubic(progress);
        const nextOffset = startOffset + (targetOffset - startOffset) * eased;
        carouselRef.current?.scrollTo({ x: nextOffset, animated: false });

        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(frame);
          return;
        }

        animationFrameRef.current = null;
        snapToIndex(targetIndex);
        onComplete?.();
      };

      animationFrameRef.current = requestAnimationFrame(frame);
    },
    [itemWidth, snapToIndex]
  );

  useEffect(() => {
    if (displaySlides.length < 2) {
      return;
    }

    scrollToIndex(0, false);
    carouselIndexRef.current = 0;
    setActiveSlide(0);

    const loop = () => {
      autoScrollTimerRef.current = setTimeout(() => {
        const currentIndex = carouselIndexRef.current;
        const nextIndex = currentIndex + 1;
        animateToIndex(nextIndex, loop);
      }, AUTO_SCROLL_INTERVAL);
    };

    loop();

    return () => {
      if (autoScrollTimerRef.current) {
        clearTimeout(autoScrollTimerRef.current);
        autoScrollTimerRef.current = null;
      }
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [animateToIndex, displaySlides.length, scrollToIndex]);

  useEffect(() => {
    const makeLoop = (value: Animated.Value, toValue: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(value, {
            toValue,
            duration: 10000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration: 10000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );

    const first = makeLoop(orbOne, 1);
    const second = makeLoop(orbTwo, 1);
    first.start();
    second.start();

    return () => {
      first.stop();
      second.stop();
    };
  }, [orbOne, orbTwo]);

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

  const orbOneTranslate = {
    transform: [
      {
        translateX: orbOne.interpolate({
          inputRange: [0, 1],
          outputRange: [-18, 26],
        }),
      },
      {
        translateY: orbOne.interpolate({
          inputRange: [0, 1],
          outputRange: [18, -20],
        }),
      },
    ],
  };

  const orbTwoTranslate = {
    transform: [
      {
        translateX: orbTwo.interpolate({
          inputRange: [0, 1],
          outputRange: [18, -24],
        }),
      },
      {
        translateY: orbTwo.interpolate({
          inputRange: [0, 1],
          outputRange: [-10, 22],
        }),
      },
    ],
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View style={styles.root}>
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Animated.View
            style={[
              styles.orb,
              {
                width: 240,
                height: 240,
                borderRadius: 120,
                backgroundColor: `${theme.accent}18`,
                top: -52,
                right: -68,
              },
              orbOneTranslate,
            ]}
          />
          <Animated.View
            style={[
              styles.orb,
              {
                width: 180,
                height: 180,
                borderRadius: 90,
                backgroundColor: `${theme.success}12`,
                top: 220,
                left: -42,
              },
              orbTwoTranslate,
            ]}
          />
          <View
            style={[
              styles.halo,
              {
                backgroundColor: theme.themeMode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(15,23,42,0.03)',
              },
            ]}
          />
        </View>

        <View style={styles.content}>
          <View style={styles.mainStack}>
            <View style={styles.topBar}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                <View
                  style={[
                    styles.brandMark,
                    { backgroundColor: theme.surfaceGlass, borderColor: theme.border },
                  ]}
                >
                  <AppIcon name="wallet-outline" color={theme.accent} size={26} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.muted, fontSize: 12, fontWeight: '800', letterSpacing: 0.8 }}>
                    SPENDMAP
                  </Text>
                  <Text style={{ color: theme.text, fontSize: 16, fontWeight: '800' }}>Personal finance, refined</Text>
                </View>
              </View>
              <ThemeToggleButton />
            </View>

            <View style={styles.hero}>
              <Text style={[styles.kicker, { color: theme.accent }]}>Designed for clarity</Text>
              <Text style={[styles.title, { color: theme.text }]}>
                Money management that feels calm and premium.
              </Text>
              <Text style={[styles.subtitle, { color: theme.muted }]}>
                Track income, balances, and reports with a polished experience.
              </Text>
            </View>

            <View style={styles.carouselBlock}>
              <View style={styles.sectionHeader}>
                <Text style={{ color: theme.text, fontSize: compact ? 16 : 18, fontWeight: '900' }}>
                  Why people like it
                </Text>
                <Text style={{ color: theme.muted, fontSize: 12 }}>Swipe highlights</Text>
              </View>

              <ScrollView
                ref={carouselRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={featureCardWidth + featureGap}
                decelerationRate="fast"
                contentContainerStyle={{ paddingHorizontal: 2, paddingBottom: 2 }}
                onMomentumScrollEnd={(event) => {
                  const x = event.nativeEvent.contentOffset.x;
                  const rawIndex = Math.round(x / itemWidth);
                  const normalizedIndex = rawIndex >= featureSlides.length ? 0 : rawIndex;
                  carouselIndexRef.current = normalizedIndex;
                  setActiveSlide(normalizedIndex);

                  if (rawIndex >= featureSlides.length) {
                    scrollToIndex(0, false);
                  }
                }}
              >
                {displaySlides.map((slide, index) => (
                  <View
                    key={`${slide.title}-${index}`}
                    style={[
                      styles.featureCard,
                      {
                        width: featureCardWidth,
                        marginRight: featureGap,
                        backgroundColor: theme.surfaceGlass,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <View style={styles.featureIconRow}>
                      <View style={[styles.featureIcon, { backgroundColor: `${slide.accent}18` }]}>
                        <AppIcon name={slide.icon} color={slide.accent} size={20} />
                      </View>
                      <View
                        style={[
                          styles.featurePill,
                          { backgroundColor: `${slide.accent}14`, borderColor: `${slide.accent}28` },
                        ]}
                      >
                        <Text style={{ color: slide.accent, fontSize: 10, fontWeight: '800' }}>Feature</Text>
                      </View>
                    </View>
                    <Text style={{ color: theme.text, fontSize: compact ? 16 : 17, fontWeight: '900', marginTop: 12 }}>
                      {slide.title}
                    </Text>
                    <Text style={{ color: theme.muted, fontSize: 11.5, lineHeight: 17, marginTop: 6 }}>
                      {slide.body}
                    </Text>
                    <View style={styles.chipRow}>
                      {slide.chips.slice(0, 2).map((chip) => (
                        <View
                          key={chip}
                          style={[
                            styles.featureChip,
                            { backgroundColor: theme.chipBackground, borderColor: theme.chipBorder },
                          ]}
                        >
                          <Text style={{ color: theme.text, fontSize: 10, fontWeight: '700' }}>{chip}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
              </ScrollView>

              <View style={styles.dotsRow}>
                {featureSlides.map((slide, index) => (
                  <View
                    key={slide.title}
                    style={[
                      styles.dot,
                      {
                        width: activeSlide === index ? 18 : 7,
                        backgroundColor: activeSlide === index ? theme.accent : theme.border,
                      },
                    ]}
                  />
                ))}
              </View>
            </View>

            <View style={styles.trustStrip}>
              <View style={[styles.trustCard, { backgroundColor: theme.surfaceGlass, borderColor: theme.border }]}>
                <AppIcon name="flash-outline" color={theme.accent} size={18} />
                <Text style={{ color: theme.text, fontSize: 11, fontWeight: '800' }}>Fast setup</Text>
                <Text style={{ color: theme.muted, fontSize: 10, lineHeight: 14, textAlign: 'center' }}>
                  Start tracking in seconds.
                </Text>
              </View>
              <View style={[styles.trustCard, { backgroundColor: theme.surfaceGlass, borderColor: theme.border }]}>
                <AppIcon name="document-text-outline" color={theme.success} size={18} />
                <Text style={{ color: theme.text, fontSize: 11, fontWeight: '800' }}>Monthly export</Text>
                <Text style={{ color: theme.muted, fontSize: 10, lineHeight: 14, textAlign: 'center' }}>
                  PDF and Excel ready.
                </Text>
              </View>
              <View style={[styles.trustCard, { backgroundColor: theme.surfaceGlass, borderColor: theme.border }]}>
                <AppIcon name="moon-outline" color={theme.warning} size={18} />
                <Text style={{ color: theme.text, fontSize: 11, fontWeight: '800' }}>Theme aware</Text>
                <Text style={{ color: theme.muted, fontSize: 10, lineHeight: 14, textAlign: 'center' }}>
                  Light and dark tuned.
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.authDock, { backgroundColor: theme.surfaceGlass, borderColor: theme.border }]}>
            <Text style={{ color: theme.text, fontSize: 16, fontWeight: '900' }}>Ready to continue?</Text>
            <Text style={{ color: theme.muted, fontSize: 12, lineHeight: 17 }}>
              Sign in to sync data, or continue without login to explore the app first.
            </Text>

            <View style={{ gap: 10 }}>
              <Button label="Sign in with Google" onPress={handleGoogleSignIn} icon="logo-google" />
              <Button label="Continue without signing in" onPress={() => router.replace('/dashboard')} secondary />
            </View>

            {!googleWebClientId ? (
              <Text style={{ color: theme.muted, fontSize: 11, lineHeight: 16 }}>
                Google sign-in isn&apos;t configured yet. Set your Expo env vars and reload the app.
              </Text>
            ) : null}
            {error ? <Text style={{ color: theme.warning, fontSize: 11, lineHeight: 16 }}>{error}</Text> : null}
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
    paddingTop: 10,
    paddingBottom: 12,
    gap: 12,
  },
  mainStack: {
    flex: 1,
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
    gap: 7,
  },
  kicker: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '900',
    letterSpacing: -0.7,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  carouselBlock: {
    gap: 8,
  },
  trustStrip: {
    flexDirection: 'row',
    gap: 8,
  },
  trustCard: {
    flex: 1,
    minWidth: 0,
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  featureCard: {
    minHeight: 128,
    padding: 14,
    borderRadius: 24,
    borderWidth: 1,
  },
  featureIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  featureIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featurePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  featureChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
    marginTop: 2,
  },
  dot: {
    height: 7,
    borderRadius: 999,
  },
  authDock: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  orb: {
    position: 'absolute',
  },
  halo: {
    position: 'absolute',
    left: -40,
    right: -40,
    top: 120,
    height: 220,
    borderRadius: 120,
  },
});
