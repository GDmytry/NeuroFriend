import React from "react";
import { StyleSheet, View, ViewProps } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { useSettings } from "../../contexts/SettingsContext";
import { getNeuroPalette } from "../../theme/neuroFriend";

type Props = ViewProps & {
  children: React.ReactNode;
};

export function GradientScreen({ children, style, ...props }: Props) {
  const { theme } = useSettings();
  const palette = getNeuroPalette(theme);

  return (
    <LinearGradient
      colors={[palette.gradientTop, palette.gradientBottom]}
      start={{ x: 0.25, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={styles.gradient}
    >
      <View {...props} style={[styles.overlay, { backgroundColor: palette.screenOverlay }, style]}>
        {children}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1
  },
  overlay: {
    flex: 1
  }
});
