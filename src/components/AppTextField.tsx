import React, { useMemo } from "react";
import { StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";

import { useSettings } from "../contexts/SettingsContext";

type Props = TextInputProps & {
  label: string;
  error?: string;
};

export function AppTextField({ label, error, style, ...props }: Props) {
  const { theme } = useSettings();
  const styles = useMemo(() => createStyles(theme.colors), [theme.colors]);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={theme.colors.inputPlaceholder}
        style={[styles.input, style]}
        {...props}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useSettings>["theme"]["colors"]) =>
  StyleSheet.create({
    wrapper: {
      gap: 8
    },
    label: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: "600"
    },
    input: {
      minHeight: 54,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      backgroundColor: colors.inputBackground,
      paddingHorizontal: 16,
      fontSize: 16,
      color: colors.text
    },
    error: {
      fontSize: 13,
      color: colors.danger
    }
  });
