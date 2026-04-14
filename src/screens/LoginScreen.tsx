import React, { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppTextField } from "../components/AppTextField";
import { PrimaryButton } from "../components/PrimaryButton";
import { useAuth } from "../contexts/AuthSyncContext";
import { RootStackParamList } from "../navigation/AppNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

export function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Проверьте поля", "Введите email и пароль");
      return;
    }

    try {
      setLoading(true);
      await login({ email, password });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не удалось войти";
      Alert.alert("Ошибка входа", message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.safe}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.container}>
        <View style={styles.hero}>
          <Text style={styles.kicker}>Neuro Chat</Text>
          <Text style={styles.title}>Чат с AI, который можно настроить под ваш стиль общения</Text>
          <Text style={styles.subtitle}>
            Авторизация, история переписки и режимы общения уже готовы. Реальный AI API
            можно будет подключить позже без переделки интерфейса.
          </Text>
        </View>

        <View style={styles.card}>
          <AppTextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="you@example.com"
          />
          <AppTextField
            label="Пароль"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Введите пароль"
          />
          <PrimaryButton title="Войти" onPress={handleLogin} loading={loading} />
          <PrimaryButton
            title="Создать аккаунт"
            onPress={() => navigation.navigate("Register")}
            variant="ghost"
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1
  },
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    gap: 24
  },
  hero: {
    gap: 12
  },
  kicker: {
    fontSize: 14,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    color: "#A15C35",
    fontWeight: "700"
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "800",
    color: "#241F1A"
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: "#6B6257"
  },
  card: {
    backgroundColor: "#FDF9F3",
    borderRadius: 28,
    padding: 18,
    gap: 16,
    borderWidth: 1,
    borderColor: "#E7D7C8"
  }
});
