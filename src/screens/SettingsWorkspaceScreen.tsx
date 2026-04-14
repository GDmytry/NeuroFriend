import React, { useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";

import { AppTextField } from "../components/AppTextField";
import { PrimaryButton } from "../components/PrimaryButton";
import { useAuth } from "../contexts/AuthSyncContext";
import { useChat } from "../contexts/ChatSyncRuntimeContext";
import { useSettings } from "../contexts/SettingsContext";
import { ThemePreference } from "../types";

const THEME_OPTIONS: Array<{
  id: ThemePreference;
  title: string;
  subtitle: string;
}> = [
  {
    id: "system",
    title: "Системная",
    subtitle: "Приложение повторяет тему устройства"
  },
  {
    id: "light",
    title: "Светлая",
    subtitle: "Светлый интерфейс для дневного режима"
  },
  {
    id: "dark",
    title: "Темная",
    subtitle: "Темный интерфейс для вечернего режима"
  }
];

export function SettingsWorkspaceScreen() {
  const {
    theme,
    settings,
    themePreference,
    resolvedTheme,
    setThemePreference,
    setRemoteAiConfig
  } = useSettings();
  const { currentUser, logout } = useAuth();
  const { threads } = useChat();
  const styles = useMemo(() => createStyles(theme.colors), [theme.colors]);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSavingAi, setIsSavingAi] = useState(false);
  const [remoteAiEnabled, setRemoteAiEnabled] = useState(settings.remoteAiEnabled);
  const [remoteAiUrl, setRemoteAiUrl] = useState(settings.remoteAiUrl);
  const [remoteAiKey, setRemoteAiKey] = useState(settings.remoteAiKey);

  useEffect(() => {
    setRemoteAiEnabled(settings.remoteAiEnabled);
    setRemoteAiUrl(settings.remoteAiUrl);
    setRemoteAiKey(settings.remoteAiKey);
  }, [settings.remoteAiEnabled, settings.remoteAiKey, settings.remoteAiUrl]);

  async function handleLogout() {
    try {
      setIsLoggingOut(true);
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  }

  async function handleSaveAiConfig() {
    if (remoteAiEnabled && !remoteAiUrl.trim()) {
      Alert.alert("Нужен адрес", "Укажите https-адрес вида https://example.com/chat");
      return;
    }

    if (remoteAiEnabled && !/^https:\/\//i.test(remoteAiUrl.trim())) {
      Alert.alert(
        "Нужен HTTPS",
        "Для iPhone standalone-сборки лучше использовать именно https-адрес публичного туннеля."
      );
      return;
    }

    try {
      setIsSavingAi(true);
      await setRemoteAiConfig({
        remoteAiEnabled,
        remoteAiUrl,
        remoteAiKey
      });
      Alert.alert("Сохранено", "Настройки внешнего AI обновлены.");
    } finally {
      setIsSavingAi(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.kicker}>Настройки</Text>
        <Text style={styles.title}>Управление приложением</Text>
        <Text style={styles.subtitle}>
          Здесь можно настроить внешний вид приложения, аккаунт и адрес AI-сервера.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Тема</Text>
        <Text style={styles.sectionCaption}>
          Сейчас активна {resolvedTheme === "dark" ? "темная" : "светлая"} тема.
        </Text>
        <View style={styles.optionList}>
          {THEME_OPTIONS.map((option) => {
            const active = option.id === themePreference;

            return (
              <View key={option.id} style={[styles.optionCard, active && styles.optionCardActive]}>
                <View style={styles.optionText}>
                  <Text style={[styles.optionTitle, active && styles.optionTitleActive]}>
                    {option.title}
                  </Text>
                  <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
                </View>
                <PrimaryButton
                  title={active ? "Выбрано" : "Выбрать"}
                  onPress={() => void setThemePreference(option.id)}
                  variant={active ? "ghost" : "solid"}
                />
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>AI-сервер</Text>
        <Text style={styles.sectionCaption}>
          Для доступа вне локальной сети укажите публичный `https://.../chat` адрес вашего туннеля.
        </Text>

        <View style={styles.toggleRow}>
          <PrimaryButton
            title={remoteAiEnabled ? "Внешний AI включен" : "Включить внешний AI"}
            onPress={() => setRemoteAiEnabled(true)}
            variant={remoteAiEnabled ? "ghost" : "solid"}
          />
          <PrimaryButton
            title={!remoteAiEnabled ? "Mock-режим включен" : "Выключить внешний AI"}
            onPress={() => setRemoteAiEnabled(false)}
            variant={!remoteAiEnabled ? "ghost" : "solid"}
          />
        </View>

        <AppTextField
          label="AI URL"
          value={remoteAiUrl}
          onChangeText={setRemoteAiUrl}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="https://your-domain.example/chat"
        />

        <AppTextField
          label="Bearer token"
          value={remoteAiKey}
          onChangeText={setRemoteAiKey}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Ваш CHAT_SERVER_API_KEY"
        />

        <PrimaryButton
          title="Сохранить AI-настройки"
          onPress={() => void handleSaveAiConfig()}
          loading={isSavingAi}
        />

        <Text style={styles.infoParagraph}>
          Текущий режим: {settings.remoteAiEnabled ? "внешний AI" : "mock"}.
        </Text>
        <Text style={styles.infoParagraph}>Текущий адрес: {settings.remoteAiUrl || "не задан"}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Аккаунт</Text>
        <Text style={styles.infoRow}>Имя: {currentUser?.name ?? "Не указано"}</Text>
        <Text style={styles.infoRow}>Email: {currentUser?.email ?? "Не указан"}</Text>
        <Text style={styles.infoRow}>Сохранено чатов: {threads.length}</Text>
      </View>

      <PrimaryButton
        title="Выйти из аккаунта"
        onPress={handleLogout}
        loading={isLoggingOut}
        variant="danger"
      />
    </ScrollView>
  );
}

const createStyles = (colors: ReturnType<typeof useSettings>["theme"]["colors"]) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background
    },
    content: {
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 18,
      gap: 14
    },
    header: {
      gap: 8
    },
    kicker: {
      fontSize: 12,
      fontWeight: "800",
      textTransform: "uppercase",
      letterSpacing: 0.9,
      color: colors.primary
    },
    title: {
      fontSize: 28,
      fontWeight: "800",
      color: colors.text
    },
    subtitle: {
      fontSize: 15,
      lineHeight: 22,
      color: colors.textSecondary
    },
    card: {
      borderRadius: 28,
      padding: 18,
      gap: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "800",
      color: colors.text
    },
    sectionCaption: {
      fontSize: 14,
      lineHeight: 20,
      color: colors.textSecondary
    },
    optionList: {
      gap: 10
    },
    optionCard: {
      borderRadius: 22,
      padding: 14,
      gap: 12,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border
    },
    optionCardActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft
    },
    optionText: {
      gap: 4
    },
    optionTitle: {
      fontSize: 16,
      fontWeight: "800",
      color: colors.text
    },
    optionTitleActive: {
      color: colors.primary
    },
    optionSubtitle: {
      fontSize: 13,
      lineHeight: 19,
      color: colors.textSecondary
    },
    toggleRow: {
      gap: 10
    },
    infoRow: {
      fontSize: 15,
      lineHeight: 22,
      color: colors.textSecondary
    },
    infoParagraph: {
      fontSize: 14,
      lineHeight: 21,
      color: colors.textSecondary
    }
  });
