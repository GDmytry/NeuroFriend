import React, { useEffect, useMemo, useState } from "react";
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
import { useAuth } from "../contexts/AuthContext";
import { useChat } from "../contexts/ChatContext";
import { NeuralMode } from "../types";

export function ChatScreen() {
  const { currentUser, logout, updatePreferredMode } = useAuth();
  const {
    threads,
    isReady,
    selectedMode,
    setSelectedMode,
    sendMessage,
    getThreadById,
    deleteThread
  } = useChat();
  const [activeThreadId, setActiveThreadId] = useState<string | undefined>(threads[0]?.id);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const activeThread = activeThreadId ? getThreadById(activeThreadId) : undefined;
  const messages = activeThread?.messages ?? [];

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (activeThreadId && threads.some((thread) => thread.id === activeThreadId)) {
      return;
    }

    setActiveThreadId(threads[0]?.id);
  }, [activeThreadId, isReady, threads]);

  const welcomeText = useMemo(() => {
    if (!currentUser) {
      return "";
    }

    return `${currentUser.name}, выберите режим и начните разговор. История диалогов сохранится на устройстве и останется доступной после следующего запуска.`;
  }, [currentUser]);

  const runtimeNotice =
    appConfig.hasRemoteAi && !appConfig.useMockAi
      ? "Подключён внешний AI API."
      : "Сейчас включён локальный демо-режим ответов. Реальный AI можно подключить позже через app.json.";

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
      const threadId = await sendMessage({
        threadId: activeThreadId,
        text: draft,
        mode: selectedMode
      });
      setActiveThreadId(threadId);
      setDraft("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не удалось отправить сообщение";
      Alert.alert("Ошибка", message);
    } finally {
      setSending(false);
    }
  }

  async function handleDeleteThread(threadId: string) {
    await deleteThread(threadId);
    if (activeThreadId === threadId) {
      const nextThread = threads.filter((thread) => thread.id !== threadId)[0];
      setActiveThreadId(nextThread?.id);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.safe}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.container}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.hello}>Привет, {currentUser?.name}</Text>
            <Text style={styles.caption}>
              Готовый прототип AI-чата с локальным хранением и подготовленным слоем под API
            </Text>
          </View>
          <Pressable onPress={logout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Выйти</Text>
          </Pressable>
        </View>

        <View style={styles.runtimeNotice}>
          <Text style={styles.runtimeNoticeTitle}>Статус AI-слоя</Text>
          <Text style={styles.runtimeNoticeText}>{runtimeNotice}</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.threadRow}
        >
          <Pressable
            onPress={() => setActiveThreadId(undefined)}
            style={[styles.threadChip, !activeThreadId && styles.activeThreadChip]}
          >
            <Text style={[styles.threadChipText, !activeThreadId && styles.activeThreadChipText]}>
              Новый чат
            </Text>
          </Pressable>
          {threads.map((thread) => (
            <Pressable
              key={thread.id}
              onPress={() => {
                setActiveThreadId(thread.id);
                setSelectedMode(thread.mode);
              }}
              onLongPress={() =>
                Alert.alert("Удалить диалог?", thread.title, [
                  { text: "Отмена", style: "cancel" },
                  {
                    text: "Удалить",
                    style: "destructive",
                    onPress: () => handleDeleteThread(thread.id)
                  }
                ])
              }
              style={[styles.threadChip, activeThreadId === thread.id && styles.activeThreadChip]}
            >
              <Text
                style={[
                  styles.threadChipText,
                  activeThreadId === thread.id && styles.activeThreadChipText
                ]}
              >
                {thread.title}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.modePanel}>
          <Text style={styles.sectionTitle}>Режим нейросети</Text>
          <ModeSelector value={selectedMode} onChange={(mode) => void handleModeChange(mode)} />
        </View>

        <View style={styles.chatCard}>
          {messages.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Новый разговор</Text>
              <Text style={styles.emptyText}>{welcomeText}</Text>
            </View>
          ) : (
            <FlatList
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <MessageBubble message={item} />}
              contentContainerStyle={styles.messageList}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>

        <View style={styles.composer}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            multiline
            placeholder="Напишите сообщение..."
            placeholderTextColor="#8A7F73"
            style={styles.input}
          />
          <PrimaryButton title="Отправить" onPress={handleSend} loading={sending} />
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
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
    gap: 14
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12
  },
  hello: {
    fontSize: 24,
    fontWeight: "800",
    color: "#241F1A"
  },
  caption: {
    marginTop: 4,
    fontSize: 13,
    color: "#6B6257",
    maxWidth: 240
  },
  logoutButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#F3E4D5"
  },
  logoutText: {
    color: "#7D4A29",
    fontWeight: "700"
  },
  runtimeNotice: {
    backgroundColor: "#FDF9F3",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E7D7C8",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 4
  },
  runtimeNoticeTitle: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: "#A15C35"
  },
  runtimeNoticeText: {
    fontSize: 13,
    lineHeight: 19,
    color: "#6B6257"
  },
  threadRow: {
    gap: 8,
    paddingRight: 12
  },
  threadChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#FFFDF9",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E7D8C8"
  },
  activeThreadChip: {
    backgroundColor: "#B96D40",
    borderColor: "#B96D40"
  },
  threadChipText: {
    color: "#5E5348",
    fontWeight: "600"
  },
  activeThreadChipText: {
    color: "#FFF"
  },
  modePanel: {
    gap: 10
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#332C25"
  },
  chatCard: {
    flex: 1,
    minHeight: 240,
    backgroundColor: "#FDF9F3",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#E7D7C8",
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
    color: "#241F1A"
  },
  emptyText: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: "#6B6257",
    textAlign: "center"
  },
  messageList: {
    padding: 16
  },
  composer: {
    gap: 12
  },
  input: {
    minHeight: 96,
    maxHeight: 160,
    backgroundColor: "#FFFDF9",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#D8C2AE",
    paddingHorizontal: 16,
    paddingVertical: 14,
    textAlignVertical: "top",
    fontSize: 16,
    color: "#1E1B18"
  }
});
