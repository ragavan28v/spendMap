import { AppIcon } from '@/components/ui/app-icon';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Palette } from '@/constants/design';
import { useAppTheme } from '@/hooks/use-app-theme';
import { hideFeedbackDialog, useFeedbackDialogStore } from '@/store/feedbackDialogStore';
import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, Text, View } from 'react-native';

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

  const config = VARIANT_CONFIG[variant];

  useEffect(() => {
    if (!visible) {
      return;
    }

    translateY.setValue(28);
    opacity.setValue(0);
    iconScale.setValue(0.82);
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
  }, [iconScale, opacity, translateY, visible]);

  function closeAnd(run?: () => void) {
    hideFeedbackDialog();
    run?.();
  }

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={() => hideFeedbackDialog()}>
      <Pressable
        onPress={() => hideFeedbackDialog()}
        style={{
          flex: 1,
          backgroundColor: 'rgba(15, 23, 42, 0.62)',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
        }}
      >
        <Pressable onPress={() => undefined} style={{ width: '100%', maxWidth: 360 }}>
          <Animated.View style={{ opacity, transform: [{ translateY }] }}>
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
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
