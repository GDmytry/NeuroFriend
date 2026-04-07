import React from "react";
import { ActivityIndicator, View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { useAuth } from "../contexts/AuthContext";
import { ChatScreen } from "../screens/ChatScreen";
import { LoginScreen } from "../screens/LoginScreen";
import { RegisterScreen } from "../screens/RegisterScreen";

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Chat: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  const { currentUser, isReady } = useAuth();

  if (!isReady) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#F7F3EC"
        }}
      >
        <ActivityIndicator size="large" color="#B96D40" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: "#FFFDF9" },
        headerTintColor: "#1E1B18",
        contentStyle: { backgroundColor: "#F7F3EC" }
      }}
    >
      {currentUser ? (
        <Stack.Screen
          name="Chat"
          component={ChatScreen}
          options={{ title: "Neuro Chat", headerBackVisible: false }}
        />
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} options={{ title: "Вход" }} />
          <Stack.Screen
            name="Register"
            component={RegisterScreen}
            options={{ title: "Регистрация" }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
