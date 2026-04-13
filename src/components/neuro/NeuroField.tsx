import React, { useMemo } from "react";
import { StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";

import { useSettings } from "../../contexts/SettingsContext";
import { getNeuroPalette } from "../../theme/neuroFriend";

type Props = TextInputProps & {
  label?: string;
};

export function NeuroField({ label, style, ...props }: Props) {
  const { theme } = useSettings();
  const palette = getNeuroPalette(theme);
  const styles = useMemo(() => createStyles(palette), [palette]);

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={palette.inkSoft}
        style={[styles.input, style]}
        {...props}
      />
    </View>
  );
}

const createStyles = (palette: ReturnType<typeof getNeuroPalette>) =>
  StyleSheet.create({
    wrapper: {
      gap: 8
    },
    label: {
      marginLeft: 18,
      fontSize: 14,
      fontStyle: "italic",
      color: palette.inkSoft
    },
    input: {
      minHeight: 58,
      borderRadius: 30,
      borderWidth: 3,
      borderColor: palette.outline,
      backgroundColor: palette.panelMuted,
      paddingHorizontal: 18,
      fontSize: 18,
      fontStyle: "italic",
      color: palette.ink
    }
  });
