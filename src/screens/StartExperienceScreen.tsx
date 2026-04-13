import React, { useMemo, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";

import { GradientScreen } from "../components/neuro/GradientScreen";
import { OutlinedTitle } from "../components/neuro/OutlinedTitle";
import { useSettings } from "../contexts/SettingsContext";
import { RootStackParamList } from "../navigation/AppNavigator";
import { getNeuroPalette } from "../theme/neuroFriend";

type Props = NativeStackScreenProps<RootStackParamList, "Start">;

export function StartExperienceScreen({ navigation }: Props) {
  const { theme } = useSettings();
  const palette = getNeuroPalette(theme);
  const styles = useMemo(() => createStyles(palette), [palette]);
  const opacity = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const [animating, setAnimating] = useState(false);

  function handleContinue() {
    if (animating) {
      return;
    }

    setAnimating(true);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 340,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.timing(translateX, {
        toValue: -18,
        duration: 340,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.timing(translateY, {
        toValue: -10,
        duration: 340,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      })
    ]).start(() => {
      navigation.navigate("Login");
      opacity.setValue(1);
      translateX.setValue(0);
      translateY.setValue(0);
      setAnimating(false);
    });
  }

  return (
    <GradientScreen>
      <SafeAreaView style={styles.safe}>
        <Animated.View
          style={[
            styles.content,
            {
              opacity,
              transform: [{ translateX }, { translateY }]
            }
          ]}
        >
          <View style={styles.titleBlock}>
            <OutlinedTitle text="Добро пожаловать!" size={34} />
          </View>

          <Text style={styles.brand}>NeuroFriend</Text>

          <View style={styles.footer}>
            <Text onPress={handleContinue} style={styles.arrowButton}>
              {"->"}
            </Text>
          </View>
        </Animated.View>
      </SafeAreaView>
    </GradientScreen>
  );
}

const createStyles = (palette: ReturnType<typeof getNeuroPalette>) =>
  StyleSheet.create({
    safe: {
      flex: 1
    },
    content: {
      flex: 1,
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 56
    },
    titleBlock: {
      marginTop: 60
    },
    brand: {
      fontSize: 34,
      fontWeight: "300",
      fontStyle: "italic",
      color: palette.panel
    },
    footer: {
      width: "100%",
      alignItems: "center",
      marginBottom: 18
    },
    arrowButton: {
      width: 78,
      height: 78,
      borderRadius: 40,
      borderWidth: 3,
      borderColor: palette.outline,
      backgroundColor: palette.panel,
      color: palette.ink,
      fontSize: 42,
      lineHeight: 72,
      textAlign: "center",
      shadowColor: palette.shadow,
      shadowOpacity: 1,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 12 },
      elevation: 9
    }
  });
