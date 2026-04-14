import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

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
    title: "Тёмная",
    subtitle: "Тёмный интерфейс для вечернего режима"
  }
];

export function SettingsScreen() {
  const { theme, themePreference, resolvedTheme, setThemePreference } = useSettings();
  const { currentUser, logout } = useAuth();
  const { threads } = useChat();
  const styles = useMemo(() => createStyles(theme.colors), [theme.colors]);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    try {
      setIsLoggingOut(true);
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.kicker}>Настройки</Text>
        <Text style={styles.title}>Управление приложением</Text>
        <Text style={styles.subtitle}>
          Здесь можно настроить внешний вид приложения и просмотреть состояние данных.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Тема</Text>
        <Text style={styles.sectionCaption}>Сейчас активна {resolvedTheme === "dark" ? "тёмная" : "светлая"} тема.</Text>
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
        <Text style={styles.sectionTitle}>Аккаунт</Text>
        <Text style={styles.infoRow}>Имя: {currentUser?.name ?? "Не указано"}</Text>
        <Text style={styles.infoRow}>Email: {currentUser?.email ?? "Не указан"}</Text>
        <Text style={styles.infoRow}>Сохранено чатов: {threads.length}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Следующий этап</Text>
        <Text style={styles.infoParagraph}>
          На следующем шаге можно подключить Ollama и модель `Qwen3:8b`. Для пользователей вне
          локальной сети лучше не открывать Ollama напрямую, а поставить отдельный backend или
          защищённый прокси с HTTPS, авторизацией и ограничением доступа.
        </Text>
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
    infoRow: {
      fontSize: 15,
      lineHeight: 22,
      color: colors.textSecondary
    },
    infoParagraph: {
      fontSize: 15,
      lineHeight: 23,
      color: colors.textSecondary
    }
  });
