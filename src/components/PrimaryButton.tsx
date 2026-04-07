import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";

type Props = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "solid" | "ghost";
};

export function PrimaryButton({
  title,
  onPress,
  disabled,
  loading,
  variant = "solid"
}: Props) {
  const ghost = variant === "ghost";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        ghost ? styles.ghostButton : styles.solidButton,
        (disabled || loading) && styles.disabled,
        pressed && !disabled ? styles.pressed : null
      ]}
    >
      {loading ? (
        <ActivityIndicator color={ghost ? "#B96D40" : "#FFF"} />
      ) : (
        <Text style={[styles.text, ghost ? styles.ghostText : styles.solidText]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center"
  },
  solidButton: {
    backgroundColor: "#B96D40"
  },
  ghostButton: {
    backgroundColor: "#F3E4D5",
    borderWidth: 1,
    borderColor: "#D8C2AE"
  },
  solidText: {
    color: "#FFF"
  },
  ghostText: {
    color: "#7D4A29"
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
