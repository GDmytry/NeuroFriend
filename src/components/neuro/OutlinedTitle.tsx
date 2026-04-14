import React, { useMemo } from "react";
import { Platform, StyleSheet, Text, View, ViewStyle } from "react-native";

import { useSettings } from "../../contexts/SettingsContext";
import { NEURO_OUTLINE_FONT } from "../../theme/fonts";
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
  const containerStyle = useMemo(
    () => ({
      alignSelf: align === "center" ? ("center" as const) : ("flex-start" as const)
    }),
    [align]
  );
  const textStyle = useMemo(
    () => ({
      fontSize: size,
      lineHeight: Math.round(size * (Platform.OS === "android" ? 1.2 : 1.12)),
      textAlign: align,
      color: theme.dark ? "#FFFFFF" : "#111111",
      fontFamily: NEURO_OUTLINE_FONT,
      includeFontPadding: false as const,
      fontStyle: italic ? ("italic" as const) : ("normal" as const)
    }),
    [align, italic, size, theme.dark]
  );

  return (
    <View style={[styles.wrapper, containerStyle, style]}>
      <Text
        allowFontScaling={false}
        numberOfLines={1}
        style={[textStyle, styles.mainText, { color: palette.ink }]}
      >
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
    paddingHorizontal: Platform.OS === "android" ? 8 : 6,
    paddingVertical: Platform.OS === "android" ? 8 : 6,
    justifyContent: "center",
    overflow: "visible"
  },
  mainText: {
    position: "relative"
  }
});
