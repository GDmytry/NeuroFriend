import React from "react";
import { StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";

type Props = TextInputProps & {
  label: string;
  error?: string;
};

export function AppTextField({ label, error, style, ...props }: Props) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor="#8A7F73"
        style={[styles.input, style]}
        {...props}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 8
  },
  label: {
    fontSize: 14,
    color: "#4E4339",
    fontWeight: "600"
  },
  input: {
    minHeight: 54,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#D8C2AE",
    backgroundColor: "#FFFDF9",
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#1E1B18"
  },
  error: {
    fontSize: 13,
    color: "#A1462F"
  }
});
