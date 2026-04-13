import React, { useState } from "react";
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

export function RegisterScreen() {
  const { register } = useAuth();
  const { selectedMode, setSelectedMode } = useChat();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [assistantName, setAssistantName] = useState("NeuroFriend");
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!name.trim() || !email.trim() || !password.trim() || !assistantName.trim()) {
      Alert.alert("Проверьте поля", "Заполните имя, email, пароль и имя нейросети");
      return;
    }

    try {
      setLoading(true);
      await register({
        name,
        email,
        password,
        preferredMode: selectedMode,
        assistantName
      });
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
            Можно сразу выбрать стиль общения для первого диалога и начать пользоваться
            приложением без дополнительной настройки.
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
          <AppTextField
            label="Имя нейросети"
            value={assistantName}
            onChangeText={setAssistantName}
            placeholder="Например, NeuroFriend"
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

const styles = StyleSheet.create({
  safe: {
    flex: 1
  },
  content: {
    padding: 20,
    gap: 24
  },
  header: {
    gap: 10,
    marginTop: 10
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
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
  },
  modeBlock: {
    gap: 12
  },
  modeLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4E4339"
  }
});
