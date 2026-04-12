import React, { useMemo } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "../components/PrimaryButton";
import { MODE_OPTIONS } from "../constants/modes";
import { useChat } from "../contexts/ChatRuntimeContext";
import { useSettings } from "../contexts/SettingsContext";
import { ChatThread } from "../types";
import { formatThreadTimestamp } from "../utils/date";

const MODE_LABELS = Object.fromEntries(MODE_OPTIONS.map((mode) => [mode.id, mode.title]));

type Props = {
  onOpenChat: () => void;
};

export function ThreadsScreen({ onOpenChat }: Props) {
  const { theme } = useSettings();
  const { threads, activeThreadId, selectThread, startNewChat, deleteThread } = useChat();
  const styles = useMemo(() => createStyles(theme.colors), [theme.colors]);

  function handleOpenThread(threadId: string) {
    selectThread(threadId);
    onOpenChat();
  }

  function handleCreateThread() {
    startNewChat();
    onOpenChat();
  }

  async function handleDeleteThread(threadId: string) {
    await deleteThread(threadId);
  }

  function renderThread({ item }: { item: ChatThread }) {
    const isActive = item.id === activeThreadId;
    const preview = item.messages[item.messages.length - 1]?.text ?? "Диалог ещё пустой";

    return (
      <Pressable
        onPress={() => handleOpenThread(item.id)}
        onLongPress={() =>
          Alert.alert("Удалить чат?", item.title, [
            { text: "Отмена", style: "cancel" },
            {
              text: "Удалить",
              style: "destructive",
              onPress: () => void handleDeleteThread(item.id)
            }
          ])
        }
        style={[styles.threadCard, isActive && styles.threadCardActive]}
      >
        <View style={styles.threadTopRow}>
          <View style={styles.threadTextWrap}>
            <Text style={[styles.threadTitle, isActive && styles.threadTitleActive]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.threadTime}>{formatThreadTimestamp(item.updatedAt)}</Text>
          </View>
          {isActive ? <Text style={styles.activeBadge}>Открыт</Text> : null}
        </View>

        <Text style={styles.threadPreview} numberOfLines={2}>
          {preview}
        </Text>

        <View style={styles.threadMetaRow}>
          <Text style={styles.threadMeta}>{MODE_LABELS[item.mode]}</Text>
          <Text style={styles.threadMeta}>{item.messages.length} сообщений</Text>
        </View>
      </Pressable>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.kicker}>Чаты</Text>
        <Text style={styles.title}>История переписки</Text>
        <Text style={styles.subtitle}>
          Здесь можно переключаться между диалогами. Для удаления чата удерживайте карточку.
        </Text>
      </View>

      <View style={styles.actionRow}>
        <PrimaryButton title="Новый чат" onPress={handleCreateThread} />
      </View>

      <View style={styles.listCard}>
        {threads.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>История пока пуста</Text>
            <Text style={styles.emptyText}>
              Создайте первый диалог, и он появится здесь для быстрого переключения.
            </Text>
          </View>
        ) : (
          <FlatList
            data={threads}
            keyExtractor={(item) => item.id}
            renderItem={renderThread}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useSettings>["theme"]["colors"]) =>
  StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 12,
      gap: 14,
      backgroundColor: colors.background
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
    actionRow: {
      gap: 10
    },
    listCard: {
      flex: 1,
      borderRadius: 28,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden"
    },
    listContent: {
      padding: 14,
      gap: 12
    },
    threadCard: {
      borderRadius: 22,
      padding: 16,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 10
    },
    threadCardActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft
    },
    threadTopRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 12
    },
    threadTextWrap: {
      flex: 1,
      gap: 4
    },
    threadTitle: {
      fontSize: 16,
      fontWeight: "800",
      color: colors.text
    },
    threadTitleActive: {
      color: colors.primary
    },
    threadTime: {
      fontSize: 12,
      color: colors.textTertiary
    },
    activeBadge: {
      alignSelf: "flex-start",
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
      fontSize: 11,
      fontWeight: "800",
      color: colors.primary,
      backgroundColor: colors.surface
    },
    threadPreview: {
      fontSize: 14,
      lineHeight: 21,
      color: colors.textSecondary
    },
    threadMetaRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 12
    },
    threadMeta: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.textTertiary
    },
    emptyState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 24
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: "800",
      color: colors.text
    },
    emptyText: {
      marginTop: 8,
      textAlign: "center",
      fontSize: 15,
      lineHeight: 22,
      color: colors.textSecondary
    }
  });
