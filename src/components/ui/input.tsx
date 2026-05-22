import { Palette, Radius } from '@/constants/design';
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
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrapper}>
        {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
        placeholderTextColor={Palette.muted}
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
  label: {
    color: Palette.muted,
    fontSize: 14,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.62)',
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  prefix: {
    color: Palette.text,
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: Palette.text,
    minHeight: 48,
    paddingVertical: 12,
  },
});
