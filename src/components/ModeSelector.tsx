import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useSettings } from "../contexts/SettingsContext";
import { MODE_OPTIONS } from "../constants/modes";
import { NeuralMode } from "../types";

type Props = {
  value: NeuralMode;
  onChange: (mode: NeuralMode) => void;
};

export function ModeSelector({ value, onChange }: Props) {
  const { theme } = useSettings();
  const styles = useMemo(() => createStyles(theme.colors), [theme.colors]);

  return (
    <View style={styles.container}>
      {MODE_OPTIONS.map((mode) => {
        const active = mode.id === value;

        return (
          <Pressable
            key={mode.id}
            onPress={() => onChange(mode.id)}
            style={[styles.card, active && styles.activeCard]}
          >
            <Text style={[styles.title, active && styles.activeTitle]}>{mode.title}</Text>
            <Text style={[styles.subtitle, active && styles.activeSubtitle]}>
              {mode.subtitle}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useSettings>["theme"]["colors"]) =>
  StyleSheet.create({
    container: {
      gap: 10
    },
    card: {
      borderRadius: 20,
      padding: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border
    },
    activeCard: {
      backgroundColor: colors.primarySoft,
      borderColor: colors.primary
    },
    title: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text
    },
    subtitle: {
      marginTop: 4,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18
    },
    activeTitle: {
      color: colors.primary
    },
    activeSubtitle: {
      color: colors.primary
    }
  });
