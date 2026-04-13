import React from "react";
import { ActivityIndicator, View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { useAuth } from "../contexts/AuthContext";
import { useSettings } from "../contexts/SettingsContext";
import { ChatExperienceScreen } from "../screens/ChatExperienceScreen";
import { LoginWorkspaceScreen } from "../screens/LoginWorkspaceScreen";
import { RegistrationWorkspaceScreen } from "../screens/RegistrationWorkspaceScreen";
import { SettingsExperienceScreen } from "../screens/SettingsExperienceScreen";
import { StartExperienceScreen } from "../screens/StartExperienceScreen";

export type RootStackParamList = {
  Start: undefined;
  Login: undefined;
  Register: undefined;
  Main: undefined;
  Settings: undefined;
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
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
        animation: "slide_from_right"
      }}
    >
      {currentUser ? (
        <>
          <Stack.Screen name="Main" component={ChatExperienceScreen} />
          <Stack.Screen
            name="Settings"
            component={SettingsExperienceScreen}
            options={{ animation: "fade_from_bottom" }}
          />
        </>
      ) : (
        <>
          <Stack.Screen
            name="Start"
            component={StartExperienceScreen}
            options={{ animation: "fade" }}
          />
          <Stack.Screen
            name="Login"
            component={LoginWorkspaceScreen}
            options={{ animation: "fade_from_bottom" }}
          />
          <Stack.Screen
            name="Register"
            component={RegistrationWorkspaceScreen}
            options={{ animation: "slide_from_right" }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
