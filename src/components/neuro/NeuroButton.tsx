import React, { useMemo } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from "react-native";

import { useSettings } from "../../contexts/SettingsContext";
import { getNeuroPalette } from "../../theme/neuroFriend";
import { OutlinedTitle } from "./OutlinedTitle";

type Props = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  compact?: boolean;
  style?: ViewStyle;
};

export function NeuroButton({ title, onPress, disabled, loading, compact, style }: Props) {
  const { theme } = useSettings();
  const palette = getNeuroPalette(theme);
  const styles = useMemo(() => createStyles(palette), [palette]);

  return (
    <Pressable
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        compact ? styles.compact : styles.regular,
        disabled ? styles.disabled : null,
        pressed && !disabled ? styles.pressed : null,
        style
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.ink} />
      ) : (
        <OutlinedTitle text={title} size={compact ? 17 : 20} style={styles.titleWrap} />
      )}
    </Pressable>
  );
}

const createStyles = (palette: ReturnType<typeof getNeuroPalette>) =>
  StyleSheet.create({
    button: {
      borderRadius: 32,
      borderWidth: 3,
      borderColor: palette.outline,
      backgroundColor: palette.panel,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: palette.shadow,
      shadowOpacity: 1,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 10 },
      elevation: 6
    },
    regular: {
      minHeight: 62,
      paddingHorizontal: 18
    },
    compact: {
      minHeight: 52,
      paddingHorizontal: 16
    },
    disabled: {
      opacity: 0.65
    },
    pressed: {
      transform: [{ scale: 0.985 }]
    },
    titleWrap: {
      alignSelf: "center"
    }
  });
