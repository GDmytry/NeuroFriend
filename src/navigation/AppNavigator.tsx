import React from "react";
import { ActivityIndicator, View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { useAuth } from "../contexts/AuthContext";
import { useSettings } from "../contexts/SettingsContext";
import { MainScreen } from "../screens/MainScreen";
import { SignInScreen } from "../screens/SignInScreen";
import { SignUpScreen } from "../screens/SignUpScreen";

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Main: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  const { currentUser, isReady } = useAuth();
  const { theme } = useSettings();

  if (!isReady) {
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
    <Stack.Navigator
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.text,
        headerTitleStyle: { color: theme.colors.text },
        contentStyle: { backgroundColor: theme.colors.background }
      }}
    >
      {currentUser ? (
        <Stack.Screen name="Main" component={MainScreen} options={{ headerShown: false }} />
      ) : (
        <>
          <Stack.Screen name="Login" component={SignInScreen} options={{ title: "Вход" }} />
          <Stack.Screen name="Register" component={SignUpScreen} options={{ title: "Регистрация" }} />
        </>
      )}
    </Stack.Navigator>
  );
}
