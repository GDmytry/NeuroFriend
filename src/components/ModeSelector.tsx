import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { MODE_OPTIONS } from "../constants/modes";
import { NeuralMode } from "../types";

type Props = {
  value: NeuralMode;
  onChange: (mode: NeuralMode) => void;
};

export function ModeSelector({ value, onChange }: Props) {
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

const styles = StyleSheet.create({
  container: {
    gap: 10
  },
  card: {
    borderRadius: 20,
    padding: 16,
    backgroundColor: "#FFFDF9",
    borderWidth: 1,
    borderColor: "#E6D4C4"
  },
  activeCard: {
    backgroundColor: "#F4E1D0",
    borderColor: "#B96D40"
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2A241E"
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: "#6C6257",
    lineHeight: 18
  },
  activeTitle: {
    color: "#7D4A29"
  },
  activeSubtitle: {
    color: "#7D4A29"
  }
});
