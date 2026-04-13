import React, { useMemo } from "react";
import { StyleSheet, View, ViewProps } from "react-native";

import { useSettings } from "../../contexts/SettingsContext";
import { getNeuroPalette } from "../../theme/neuroFriend";

type Props = ViewProps & {
  children: React.ReactNode;
};

export function PaperPanel({ children, style, ...props }: Props) {
  const { theme } = useSettings();
  const palette = getNeuroPalette(theme);
  const styles = useMemo(() => createStyles(palette), [palette]);

  return (
    <View {...props} style={[styles.panel, style]}>
      {children}
    </View>
  );
}

const createStyles = (palette: ReturnType<typeof getNeuroPalette>) =>
  StyleSheet.create({
    panel: {
      borderRadius: 42,
      borderWidth: 3,
      borderColor: palette.outline,
      backgroundColor: palette.panel,
      shadowColor: palette.shadow,
      shadowOpacity: 1,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 14 },
      elevation: 9
    }
  });
