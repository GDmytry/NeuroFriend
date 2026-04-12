import React, { useMemo, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppTextField } from "../components/AppTextField";
import { PrimaryButton } from "../components/PrimaryButton";
import { useAuth } from "../contexts/AuthContext";
import { useSettings } from "../contexts/SettingsContext";
import { RootStackParamList } from "../navigation/AppNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

export function SignInScreen({ navigation }: Props) {
  const { login } = useAuth();
  const { theme } = useSettings();
  const styles = useMemo(() => createStyles(theme.colors), [theme.colors]);
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
            Авторизация, история переписки, вкладки чатов и переключение темы уже готовы.
            Следующим шагом можно будет подключить реальную модель.
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

const createStyles = (colors: ReturnType<typeof useSettings>["theme"]["colors"]) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.background
    },
    container: {
      flex: 1,
      padding: 20,
      justifyContent: "center",
      gap: 24,
      backgroundColor: colors.background
    },
    hero: {
      gap: 12
    },
    kicker: {
      fontSize: 14,
      textTransform: "uppercase",
      letterSpacing: 1.2,
      color: colors.primary,
      fontWeight: "700"
    },
    title: {
      fontSize: 30,
      lineHeight: 36,
      fontWeight: "800",
      color: colors.text
    },
    subtitle: {
      fontSize: 15,
      lineHeight: 22,
      color: colors.textSecondary
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 28,
      padding: 18,
      gap: 16,
      borderWidth: 1,
      borderColor: colors.border
    }
  });
