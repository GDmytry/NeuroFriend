import React from "react";
import { DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AppNavigator } from "./src/navigation/AppNavigator";
import { AppProviders } from "./src/providers/AppProviders";

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: "#F7F3EC",
    card: "#FFFDF9",
    border: "#E7D7C8",
    text: "#241F1A",
    primary: "#B96D40",
    notification: "#B96D40"
  }
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProviders>
        <NavigationContainer theme={navigationTheme}>
          <StatusBar style="dark" />
          <AppNavigator />
        </NavigationContainer>
      </AppProviders>
    </SafeAreaProvider>
  );
}
