import { AppIcon } from '@/components/ui/app-icon';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Palette } from '@/constants/design';
import { useAppTheme } from '@/hooks/use-app-theme';
import { hideFeedbackDialog, useFeedbackDialogStore } from '@/store/feedbackDialogStore';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Text, View } from 'react-native';

const VARIANT_CONFIG = {
  success: { icon: 'checkmark-circle-outline', color: Palette.emerald },
  error: { icon: 'warning-outline', color: Palette.red },
  info: { icon: 'information-circle-outline', color: Palette.blue },
  warning: { icon: 'alert-circle-outline', color: Palette.orange },
} as const;

export function FeedbackDialog() {
  const theme = useAppTheme();
  const visible = useFeedbackDialogStore((state) => state.visible);
  const title = useFeedbackDialogStore((state) => state.title);
  const message = useFeedbackDialogStore((state) => state.message);
  const variant = useFeedbackDialogStore((state) => state.variant);
  const primaryLabel = useFeedbackDialogStore((state) => state.primaryLabel);
  const secondaryLabel = useFeedbackDialogStore((state) => state.secondaryLabel);
  const onPrimary = useFeedbackDialogStore((state) => state.onPrimary);
  const onSecondary = useFeedbackDialogStore((state) => state.onSecondary);
  const translateY = useRef(new Animated.Value(24)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(0.92)).current;
  const [shouldHide, setShouldHide] = useState(false);

  const config = VARIANT_CONFIG[variant ?? 'info'];
  const isSuccess = variant === 'success';
  const pulse = useRef(new Animated.Value(1)).current;
  const splashAnims = useRef(Array.from({ length: 5 }, () => new Animated.Value(0))).current;

  useEffect(() => {
    if (!visible) {
      return;
    }

    translateY.setValue(28);
    opacity.setValue(0);
    iconScale.setValue(0.82);
    setShouldHide(false);

    Animated.parallel([
      Animated.sequence([
        Animated.spring(iconScale, {
          toValue: 1.12,
          damping: 10,
          stiffness: 220,
          mass: 0.7,
          useNativeDriver: true,
        }),
        Animated.spring(iconScale, {
          toValue: 1,
          damping: 12,
          stiffness: 210,
          mass: 0.7,
          useNativeDriver: true,
        }),
      ]),
      Animated.spring(translateY, {
        toValue: 0,
        damping: 14,
        stiffness: 170,
        mass: 0.85,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();

    if (isSuccess) {
      // larger pulse
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.18, duration: 800, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();

      // splashes: animate a few dots outwards (bigger, longer)
      splashAnims.forEach((anim, i) => {
        const delay = 140 + i * 100;
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 900, useNativeDriver: true }),
        ]).start();
      });
    }

    let autoCloseTimer: ReturnType<typeof setTimeout> | undefined;
    if (variant === 'success') {
      autoCloseTimer = setTimeout(() => {
        setShouldHide(true);
      }, 1800);
    }

    return () => {
      if (autoCloseTimer) {
        clearTimeout(autoCloseTimer);
      }
    };
  }, [iconScale, opacity, primaryLabel, secondaryLabel, translateY, variant, visible]);

  useEffect(() => {
    if (!shouldHide) {
      return;
    }

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 24,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      hideFeedbackDialog();
      setShouldHide(false);
    });
  }, [opacity, shouldHide, translateY]);

  function closeAnd(run?: () => void) {
    hideFeedbackDialog();
    run?.();
  }

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={() => {}}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(15, 23, 42, 0.62)',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
        }}
      >
        <View style={{ width: '100%', maxWidth: 360 }}>
          <Animated.View style={{ opacity, transform: [{ translateY }] }}>
            {isSuccess ? (
              <View style={{ alignItems: 'center', gap: 12 }}>
                <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                  <Animated.View
                    style={{
                      width: 118,
                      height: 118,
                      borderRadius: 64,
                      backgroundColor: `${config.color}18`,
                      alignItems: 'center',
                      justifyContent: 'center',
                      transform: [{ scale: pulse }],
                    }}
                  />

                  {/* splashes */}
                  {splashAnims.map((anim, i) => {
                    const angle = (i / splashAnims.length) * Math.PI * 2;
                    const cosA = Math.cos(angle);
                    const sinA = Math.sin(angle);
                    const translate = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 56 + i * 8] });
                    const splashStyle = {
                      position: 'absolute' as const,
                      width: 12,
                      height: 12,
                      borderRadius: 8,
                      backgroundColor: `${config.color}EE`,
                      opacity: anim,
                      transform: [
                        { translateX: Animated.multiply(translate as any, cosA) as any },
                        { translateY: Animated.multiply(translate as any, sinA) as any },
                        { scale: anim },
                      ],
                    };
                    return <Animated.View key={i} style={splashStyle} />;
                  })}

                  <Animated.View
                    style={{
                      position: 'absolute',
                      width: 72,
                      height: 72,
                      borderRadius: 40,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: theme.surfaceElevated,
                      transform: [{ scale: iconScale }],
                    }}
                  >
                    <AppIcon name={config.icon} color={config.color} size={36} />
                  </Animated.View>
                </View>

                <View style={{ alignItems: 'center', maxWidth: 320 }}>
                  <Text style={{ color: theme.text, fontSize: 20, fontWeight: '900' }}>{title}</Text>
                  <Text style={{ color: theme.muted, fontSize: 13, lineHeight: 18, marginTop: 6, textAlign: 'center' }}>{message}</Text>
                </View>
              </View>
            ) : (
              <Card style={{ padding: 20, gap: 16, backgroundColor: theme.surfaceElevated }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Animated.View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 16,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: `${config.color}18`,
                      borderWidth: 1,
                      borderColor: `${config.color}30`,
                      transform: [{ scale: iconScale }],
                    }}
                  >
                    <AppIcon name={config.icon} color={config.color} size={24} />
                  </Animated.View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.text, fontSize: 20, fontWeight: '900' }}>{title}</Text>
                    <Text style={{ color: theme.muted, fontSize: 13, lineHeight: 18, marginTop: 2 }}>{message}</Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
                  {secondaryLabel ? (
                    <Button
                      label={secondaryLabel}
                      secondary
                      compact
                      onPress={() => closeAnd(onSecondary)}
                      style={{ minWidth: 96 }}
                    />
                  ) : null}
                  <Button
                    label={primaryLabel ?? 'OK'}
                    compact
                    onPress={() => closeAnd(onPrimary)}
                    style={{ minWidth: 96, backgroundColor: config.color }}
                  />
                </View>
              </Card>
            )}
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}
