import React, { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";

import { AppTextField } from "../components/AppTextField";
import { ModeSelector } from "../components/ModeSelector";
import { PrimaryButton } from "../components/PrimaryButton";
import { useAuth } from "../contexts/AuthContext";
import { useChat } from "../contexts/ChatRuntimeContext";
import { useSettings } from "../contexts/SettingsContext";

export function SignUpScreen() {
  const { register } = useAuth();
  const { selectedMode, setSelectedMode } = useChat();
  const { theme } = useSettings();
  const styles = useMemo(() => createStyles(theme.colors), [theme.colors]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert("Проверьте поля", "Заполните имя, email и пароль");
      return;
    }

    try {
      setLoading(true);
      await register({ name, email, password, preferredMode: selectedMode });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не удалось зарегистрироваться";
      Alert.alert("Ошибка регистрации", message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.safe}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Создайте аккаунт</Text>
          <Text style={styles.subtitle}>
            Можно сразу выбрать стиль общения для первого диалога. Позже его можно менять в чате и
            в настройках.
          </Text>
        </View>

        <View style={styles.card}>
          <AppTextField
            label="Имя"
            value={name}
            onChangeText={setName}
            placeholder="Как к вам обращаться"
          />
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
            placeholder="Минимум 6 символов"
          />

          <View style={styles.modeBlock}>
            <Text style={styles.modeLabel}>Стиль общения</Text>
            <ModeSelector value={selectedMode} onChange={setSelectedMode} />
          </View>

          <PrimaryButton title="Зарегистрироваться" onPress={handleRegister} loading={loading} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: ReturnType<typeof useSettings>["theme"]["colors"]) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.background
    },
    content: {
      padding: 20,
      gap: 24,
      backgroundColor: colors.background
    },
    header: {
      gap: 10,
      marginTop: 10
    },
    title: {
      fontSize: 28,
      lineHeight: 34,
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
    },
    modeBlock: {
      gap: 12
    },
    modeLabel: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.textSecondary
    }
  });
