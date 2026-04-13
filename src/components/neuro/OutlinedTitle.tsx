import React, { useMemo } from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";

import { NEURO_OUTLINE_FONT } from "../../theme/fonts";

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
  const containerStyle = useMemo(
    () => ({
      alignSelf: align === "center" ? ("center" as const) : ("flex-start" as const)
    }),
    [align]
  );
  const textStyle = useMemo(
    () => ({
      fontSize: size,
      lineHeight: Math.round(size * 1.08),
      textAlign: align,
      color: "#FFFFFF",
      fontFamily: NEURO_OUTLINE_FONT,
      includeFontPadding: false as const
    }),
    [align, size]
  );
  const outlineLayers = useMemo(
    () => [
      { x: -3, y: 0 },
      { x: 3, y: 0 },
      { x: 0, y: -3 },
      { x: 0, y: 3 },
      { x: -2, y: -2 },
      { x: 2, y: -2 },
      { x: -2, y: 2 },
      { x: 2, y: 2 },
      { x: -3, y: -1 },
      { x: 3, y: -1 },
      { x: -3, y: 1 },
      { x: 3, y: 1 }
    ],
    []
  );

  return (
    <View style={[styles.wrapper, containerStyle, style]}>
      {outlineLayers.map((layer) => (
        <Text
          key={`${layer.x}:${layer.y}`}
          style={[
            styles.outlineText,
            textStyle,
            {
              color: "#000000",
              transform: [{ translateX: layer.x }, { translateY: layer.y }]
            }
          ]}
        >
          {text}
        </Text>
      ))}
      <Text style={[textStyle, styles.mainText]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
    paddingHorizontal: 3,
    paddingVertical: 3
  },
  mainText: {
    position: "relative",
    zIndex: 2
  },
  outlineText: {
    position: "absolute",
    top: 0,
    left: 0,
    zIndex: 1
  }
});
