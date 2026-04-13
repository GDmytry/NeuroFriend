import React from "react";
import { ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useSettings } from "./src/contexts/SettingsContext";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { AppProviders } from "./src/providers/AppProviders";
import { NEURO_OUTLINE_FONT } from "./src/theme/fonts";

function AppContent() {
  const { isReady, theme } = useSettings();
  const [fontsLoaded] = useFonts({
    [NEURO_OUTLINE_FONT]: require("./assets/fonts/Gilroy-BoldItalic.ttf")
  });

  if (!isReady || !fontsLoaded) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: theme.colors.background
        }}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={theme.navigationTheme}>
      <StatusBar style={theme.statusBarStyle} />
      <AppNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProviders>
        <AppContent />
      </AppProviders>
    </SafeAreaProvider>
  );
}
