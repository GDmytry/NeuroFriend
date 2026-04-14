import React, { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import { appConfig } from "../config/app";
import { MessageBubble } from "../components/MessageBubble";
import { ModeSelector } from "../components/ModeSelector";
import { PrimaryButton } from "../components/PrimaryButton";
import { useAuth } from "../contexts/AuthSyncContext";
import { useChat } from "../contexts/ChatSyncRuntimeContext";
import { useSettings } from "../contexts/SettingsContext";
import { NeuralMode } from "../types";
import { formatThreadTimestamp } from "../utils/date";

export function ConversationScreen() {
  const { currentUser, updatePreferredMode } = useAuth();
  const { theme } = useSettings();
  const { activeThread, selectedMode, setSelectedMode, sendMessage, startNewChat } = useChat();
  const styles = useMemo(() => createStyles(theme.colors), [theme.colors]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const messages = activeThread?.messages ?? [];
  const welcomeText = currentUser
    ? `${currentUser.name}, выберите режим и начните разговор. История каждого чата сохранится, а переключаться между диалогами можно во вкладке "Чаты".`
    : "";
  const runtimeNotice =
    appConfig.hasRemoteAi && !appConfig.useMockAi
      ? "Подключён внешний AI API. Следующим шагом можно привязать Ollama через backend."
      : "Сейчас включён локальный демо-режим ответов. Дальше можно подключить Ollama/Qwen через отдельный серверный слой.";

  async function handleModeChange(mode: NeuralMode) {
    setSelectedMode(mode);
    await updatePreferredMode(mode);
  }

  async function handleSend() {
    if (!draft.trim()) {
      return;
    }

    try {
      setSending(true);
      await sendMessage({
        threadId: activeThread?.id,
        text: draft,
        mode: selectedMode
      });
      setDraft("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не удалось отправить сообщение";
      Alert.alert("Ошибка", message);
    } finally {
      setSending(false);
    }
  }

  function handleStartNewChat() {
    startNewChat();
    setDraft("");
  }

  return (
    <KeyboardAvoidingView
      style={styles.safe}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <View style={styles.heroTextWrap}>
                <Text style={styles.kicker}>Диалог</Text>
                <Text style={styles.title}>{activeThread?.title ?? "Новый разговор"}</Text>
                <Text style={styles.subtitle}>
                  {activeThread
                    ? `Обновлён: ${formatThreadTimestamp(activeThread.updatedAt)}`
                    : "Создайте новый диалог и выберите стиль общения перед первым сообщением."}
                </Text>
              </View>

              <Pressable onPress={handleStartNewChat} style={styles.inlineAction}>
                <Text style={styles.inlineActionText}>Новый чат</Text>
              </Pressable>
            </View>

            <View style={styles.heroMetaRow}>
              <Text style={styles.heroMeta}>
                {activeThread ? `${activeThread.messages.length} сообщений` : "Чат ещё не начат"}
              </Text>
              <Text style={styles.heroMeta}>Режим можно менять в любой момент</Text>
            </View>
          </View>

          <View style={styles.runtimeNotice}>
            <Text style={styles.runtimeNoticeTitle}>Статус AI-слоя</Text>
            <Text style={styles.runtimeNoticeText}>{runtimeNotice}</Text>
          </View>

          <View style={styles.modePanel}>
            <Text style={styles.sectionTitle}>Режим нейросети</Text>
            <ModeSelector value={selectedMode} onChange={(mode) => void handleModeChange(mode)} />
          </View>

          <View style={styles.chatCard}>
            {messages.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>Чат готов к старту</Text>
                <Text style={styles.emptyText}>{welcomeText}</Text>
              </View>
            ) : (
              <FlatList
                data={messages}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <MessageBubble message={item} />}
                contentContainerStyle={styles.messageList}
                scrollEnabled={false}
              />
            )}
          </View>
        </ScrollView>

        <View style={styles.composer}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            multiline
            placeholder="Напишите сообщение..."
            placeholderTextColor={theme.colors.inputPlaceholder}
            style={styles.input}
          />
          <PrimaryButton title="Отправить" onPress={handleSend} loading={sending} />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: ReturnType<typeof useSettings>["theme"]["colors"]) =>
  StyleSheet.create({
    safe: {
      flex: 1
    },
    container: {
      flex: 1,
      backgroundColor: colors.background
    },
    scrollArea: {
      flex: 1
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 14,
      gap: 14
    },
    heroCard: {
      borderRadius: 28,
      padding: 18,
      gap: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border
    },
    heroTopRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 12
    },
    heroTextWrap: {
      flex: 1,
      gap: 6
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
      lineHeight: 32,
      fontWeight: "800",
      color: colors.text
    },
    subtitle: {
      fontSize: 14,
      lineHeight: 20,
      color: colors.textSecondary
    },
    inlineAction: {
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 10,
      backgroundColor: colors.primarySoft,
      borderWidth: 1,
      borderColor: colors.borderStrong
    },
    inlineActionText: {
      fontSize: 13,
      fontWeight: "800",
      color: colors.primary
    },
    heroMetaRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 12
    },
    heroMeta: {
      flex: 1,
      fontSize: 12,
      lineHeight: 18,
      color: colors.textTertiary
    },
    runtimeNotice: {
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 4,
      backgroundColor: colors.surfaceMuted
    },
    runtimeNoticeTitle: {
      fontSize: 12,
      fontWeight: "800",
      textTransform: "uppercase",
      letterSpacing: 0.8,
      color: colors.primary
    },
    runtimeNoticeText: {
      fontSize: 13,
      lineHeight: 19,
      color: colors.textSecondary
    },
    modePanel: {
      gap: 10
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "800",
      color: colors.text
    },
    chatCard: {
      minHeight: 240,
      backgroundColor: colors.surface,
      borderRadius: 28,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden"
    },
    emptyState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 24
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: "800",
      color: colors.text
    },
    emptyText: {
      marginTop: 8,
      fontSize: 15,
      lineHeight: 22,
      color: colors.textSecondary,
      textAlign: "center"
    },
    messageList: {
      padding: 16
    },
    composer: {
      gap: 12,
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 10,
      backgroundColor: colors.background
    },
    input: {
      minHeight: 96,
      maxHeight: 160,
      backgroundColor: colors.inputBackground,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      paddingHorizontal: 16,
      paddingVertical: 14,
      textAlignVertical: "top",
      fontSize: 16,
      color: colors.text
    }
  });
