import { Radius } from '@/constants/design';
import { useAppTheme } from '@/hooks/use-app-theme';
import React from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

interface InputProps extends Pick<TextInputProps, 'multiline' | 'numberOfLines'> {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
  prefix?: string;
}

export function Input({ label, value, onChangeText, placeholder, keyboardType, prefix }: InputProps) {
  const theme = useAppTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.muted }]}>{label}</Text>
      <View style={[styles.inputWrapper, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
        {prefix ? <Text style={[styles.prefix, { color: theme.text }]}>{prefix}</Text> : null}
        <TextInput
          style={[styles.input, { color: theme.text }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.muted}
          keyboardType={keyboardType}
          accessibilityLabel={label}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  label: { fontSize: 14 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  prefix: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    minHeight: 48,
    paddingVertical: 12,
  },
});
