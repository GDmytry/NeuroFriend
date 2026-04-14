import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  InputAccessoryView,
  Keyboard,
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
import { pickTextAttachments } from "../services/attachmentRuntimeService";
import { ChatAttachment, NeuralMode } from "../types";
import { formatThreadTimestamp } from "../utils/date";

const IOS_KEYBOARD_ACCESSORY_ID = "conversation-composer-accessory";

export function ConversationWorkspaceScreen() {
  const { currentUser, updatePreferredMode } = useAuth();
  const { theme } = useSettings();
  const { activeThread, selectedMode, setSelectedMode, sendMessage, startNewChat } = useChat();
  const styles = useMemo(() => createStyles(theme.colors), [theme.colors]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSubscription = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSubscription = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const messages = activeThread?.messages ?? [];
  const canSend = draft.trim().length > 0 || pendingAttachments.length > 0;
  const welcomeText = currentUser
    ? `${currentUser.name}, выберите режим и начните разговор. История каждого чата сохранится, а переключаться между диалогами можно во вкладке "Чаты".`
    : "";
  const runtimeNotice =
    appConfig.hasRemoteAi && !appConfig.useMockAi
      ? "Подключен внешний AI API. Сообщения идут через ваш Node-мост, а текстовые файлы можно прикреплять прямо к запросу."
      : "Сейчас включен локальный демо-режим ответов. Дальше можно подключить Ollama/Qwen через отдельный серверный слой.";

  async function handleModeChange(mode: NeuralMode) {
    setSelectedMode(mode);
    await updatePreferredMode(mode);
  }

  async function handlePickAttachment() {
    try {
      Keyboard.dismiss();
      const pickedAttachments = await pickTextAttachments();

      if (!pickedAttachments.length) {
        return;
      }

      setPendingAttachments((current) => mergeAttachments(current, pickedAttachments));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не удалось прикрепить файл";
      Alert.alert("Файл не добавлен", message);
    }
  }

  async function handleSend() {
    if (!canSend) {
      return;
    }

    try {
      setSending(true);
      await sendMessage({
        threadId: activeThread?.id,
        text: draft,
        mode: selectedMode,
        attachments: pendingAttachments
      });
      setDraft("");
      setPendingAttachments([]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не удалось отправить сообщение";
      Alert.alert("Ошибка", message);
    } finally {
      setSending(false);
    }
  }

  function handleStartNewChat() {
    Keyboard.dismiss();
    startNewChat();
    setDraft("");
    setPendingAttachments([]);
  }

  function handleRemoveAttachment(attachmentId: string) {
    setPendingAttachments((current) =>
      current.filter((attachment) => attachment.id !== attachmentId)
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.safe}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 6 : 0}
    >
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          onScrollBeginDrag={Keyboard.dismiss}
        >
          <View style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <View style={styles.heroTextWrap}>
                <Text style={styles.kicker}>Диалог</Text>
                <Text style={styles.title}>{activeThread?.title ?? "Новый разговор"}</Text>
                <Text style={styles.subtitle}>
                  {activeThread
                    ? `Обновлен: ${formatThreadTimestamp(activeThread.updatedAt)}`
                    : "Создайте новый диалог и выберите стиль общения перед первым сообщением."}
                </Text>
              </View>

              <Pressable onPress={handleStartNewChat} style={styles.inlineAction}>
                <Text style={styles.inlineActionText}>Новый чат</Text>
              </Pressable>
            </View>

            <View style={styles.heroMetaRow}>
              <Text style={styles.heroMeta}>
                {activeThread ? `${activeThread.messages.length} сообщений` : "Чат еще не начат"}
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
          <View style={styles.composerTools}>
            <Pressable onPress={() => void handlePickAttachment()} style={styles.toolButton}>
              <Text style={styles.toolButtonText}>Добавить файл</Text>
            </Pressable>

            {keyboardVisible ? (
              <Pressable onPress={Keyboard.dismiss} style={styles.toolButton}>
                <Text style={styles.toolButtonText}>Скрыть клавиатуру</Text>
              </Pressable>
            ) : null}
          </View>

          {pendingAttachments.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pendingAttachmentRow}
            >
              {pendingAttachments.map((attachment) => (
                <View key={attachment.id} style={styles.pendingAttachmentCard}>
                  <View style={styles.pendingAttachmentCopy}>
                    <Text numberOfLines={1} style={styles.pendingAttachmentName}>
                      {attachment.name}
                    </Text>
                    <Text style={styles.pendingAttachmentMeta}>
                      {formatAttachmentSize(attachment.size)} · {attachment.mimeType}
                    </Text>
                  </View>

                  <Pressable
                    onPress={() => handleRemoveAttachment(attachment.id)}
                    style={styles.removeAttachmentButton}
                  >
                    <Text style={styles.removeAttachmentText}>Убрать</Text>
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          ) : null}

          <TextInput
            value={draft}
            onChangeText={setDraft}
            multiline
            blurOnSubmit={false}
            autoCapitalize="sentences"
            placeholder="Напишите сообщение или прикрепите текстовый файл..."
            placeholderTextColor={theme.colors.inputPlaceholder}
            style={styles.input}
            inputAccessoryViewID={Platform.OS === "ios" ? IOS_KEYBOARD_ACCESSORY_ID : undefined}
          />
          <PrimaryButton
            title="Отправить"
            onPress={handleSend}
            loading={sending}
            disabled={!canSend}
          />
        </View>
      </View>

      {Platform.OS === "ios" ? (
        <InputAccessoryView nativeID={IOS_KEYBOARD_ACCESSORY_ID}>
          <View style={styles.keyboardAccessory}>
            <Pressable onPress={Keyboard.dismiss} style={styles.keyboardAccessoryButton}>
              <Text style={styles.keyboardAccessoryText}>Скрыть клавиатуру</Text>
            </Pressable>
          </View>
        </InputAccessoryView>
      ) : null}
    </KeyboardAvoidingView>
  );
}

function mergeAttachments(current: ChatAttachment[], incoming: ChatAttachment[]) {
  const map = new Map<string, ChatAttachment>();

  for (const attachment of current) {
    map.set(buildAttachmentKey(attachment), attachment);
  }

  for (const attachment of incoming) {
    map.set(buildAttachmentKey(attachment), attachment);
  }

  return [...map.values()];
}

function buildAttachmentKey(attachment: ChatAttachment) {
  return `${attachment.name}:${attachment.uri}:${attachment.size}`;
}

function formatAttachmentSize(size: number) {
  if (!size || size < 1024) {
    return `${Math.max(size, 0)} Б`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} КБ`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} МБ`;
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
    composerTools: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10
    },
    toolButton: {
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 10,
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.borderStrong
    },
    toolButtonText: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.primary
    },
    pendingAttachmentRow: {
      gap: 10,
      paddingRight: 8
    },
    pendingAttachmentCard: {
      width: 240,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 12,
      gap: 10
    },
    pendingAttachmentCopy: {
      gap: 3
    },
    pendingAttachmentName: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.text
    },
    pendingAttachmentMeta: {
      fontSize: 12,
      color: colors.textTertiary
    },
    removeAttachmentButton: {
      alignSelf: "flex-start",
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
      backgroundColor: colors.primarySoft
    },
    removeAttachmentText: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.primary
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
    },
    keyboardAccessory: {
      alignItems: "flex-end",
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: colors.surface
    },
    keyboardAccessoryButton: {
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 8,
      backgroundColor: colors.primarySoft
    },
    keyboardAccessoryText: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.primary
    }
  });
