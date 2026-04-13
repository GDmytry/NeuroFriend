import React, { useMemo } from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";

import { useSettings } from "../../contexts/SettingsContext";
import { getNeuroPalette } from "../../theme/neuroFriend";

type Props = {
  text: string;
  size?: number;
  italic?: boolean;
  align?: "left" | "center";
  style?: ViewStyle;
};

export function OutlinedTitle({
  text,
  size = 28,
  italic = true,
  align = "center",
  style
}: Props) {
  const { theme } = useSettings();
  const palette = getNeuroPalette(theme);
  const textStyle = useMemo(
    () => ({
      fontSize: size,
      lineHeight: Math.round(size * 1.08),
      fontStyle: italic ? ("italic" as const) : ("normal" as const),
      textAlign: align,
      color: palette.panel,
      fontWeight: "900" as const
    }),
    [align, italic, palette.panel, size]
  );

  return (
    <View style={style}>
      <Text style={[styles.shadowText, textStyle, { color: palette.outline, left: -1, top: -1 }]}>
        {text}
      </Text>
      <Text style={[styles.shadowText, textStyle, { color: palette.outline, left: 1, top: -1 }]}>
        {text}
      </Text>
      <Text style={[styles.shadowText, textStyle, { color: palette.outline, left: -1, top: 1 }]}>
        {text}
      </Text>
      <Text style={[styles.shadowText, textStyle, { color: palette.outline, left: 1, top: 1 }]}>
        {text}
      </Text>
      <Text style={[textStyle, styles.mainText]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  mainText: {
    position: "relative"
  },
  shadowText: {
    position: "absolute",
    right: 0
  }
});
