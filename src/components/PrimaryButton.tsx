import React, { useMemo } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";

import { useSettings } from "../contexts/SettingsContext";

type Props = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "solid" | "ghost" | "danger";
};

export function PrimaryButton({
  title,
  onPress,
  disabled,
  loading,
  variant = "solid"
}: Props) {
  const { theme } = useSettings();
  const styles = useMemo(() => createStyles(theme.colors), [theme.colors]);
  const ghost = variant === "ghost";
  const danger = variant === "danger";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        ghost ? styles.ghostButton : danger ? styles.dangerButton : styles.solidButton,
        (disabled || loading) && styles.disabled,
        pressed && !disabled ? styles.pressed : null
      ]}
    >
      {loading ? (
        <ActivityIndicator color={ghost ? theme.colors.primary : theme.colors.primaryContrast} />
      ) : (
        <Text
          style={[
            styles.text,
            ghost ? styles.ghostText : danger ? styles.dangerText : styles.solidText
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const createStyles = (colors: ReturnType<typeof useSettings>["theme"]["colors"]) =>
  StyleSheet.create({
    button: {
      minHeight: 54,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center"
    },
    solidButton: {
      backgroundColor: colors.primary
    },
    ghostButton: {
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.borderStrong
    },
    dangerButton: {
      backgroundColor: colors.danger
    },
    solidText: {
      color: colors.primaryContrast
    },
    ghostText: {
      color: colors.primary
    },
    dangerText: {
      color: colors.primaryContrast
    },
    text: {
      fontSize: 16,
      fontWeight: "700"
    },
    disabled: {
      opacity: 0.7
    },
    pressed: {
      transform: [{ scale: 0.99 }]
    }
  });
