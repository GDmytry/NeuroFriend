import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";

import { GradientScreen } from "../components/neuro/GradientScreen";
import { NeuroButton } from "../components/neuro/NeuroButton";
import { NeuroMessageBubble } from "../components/neuro/NeuroMessageBubble";
import { OutlinedTitle } from "../components/neuro/OutlinedTitle";
import { PaperPanel } from "../components/neuro/PaperPanel";
import { useAuth } from "../contexts/AuthContext";
import { useChat } from "../contexts/ChatRuntimeContext";
import { useSettings } from "../contexts/SettingsContext";
import { RootStackParamList } from "../navigation/AppNavigator";
import { pickTextAttachments } from "../services/attachmentRuntimeService";
import { getNeuroPalette } from "../theme/neuroFriend";
import { ChatAttachment, ChatMessage, NeuralMode } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "Main">;

export function ChatWorkspaceScreen({ navigation }: Props) {
  const { currentUser, updatePreferredMode } = useAuth();
  const {
    threads,
    activeThread,
    selectedMode,
    setSelectedMode,
    selectThread,
    startNewChat,
    sendMessage,
    deleteThread,
    renameThread
  } = useChat();
  const { theme } = useSettings();
  const palette = getNeuroPalette(theme);
  const styles = useMemo(() => createStyles(palette), [palette]);
  const { width } = useWindowDimensions();
  const drawerWidth = Math.min(width * 0.58, 320);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);
  const [drawerMounted, setDrawerMounted] = useState(false);
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [pendingPreview, setPendingPreview] = useState<ChatMessage | null>(null);
  const messagesScrollRef = useRef<ScrollView | null>(null);
  const drawerProgress = useRef(new Animated.Value(0)).current;
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

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

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          drawerMounted &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) &&
          gestureState.dx < -8,
        onPanResponderMove: (_, gestureState) => {
          const nextValue = clamp(1 + gestureState.dx / drawerWidth, 0, 1);
          drawerProgress.setValue(nextValue);
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx < -drawerWidth * 0.22 || gestureState.vx < -0.45) {
            closeDrawer();
            return;
          }

          openDrawer();
        }
      }),
    [drawerMounted, drawerProgress, drawerWidth]
  );

  const messages = activeThread?.messages ?? [];
  const visibleMessages = pendingPreview ? [...messages, pendingPreview] : messages;
  const assistantName = currentUser?.assistantName?.trim() || "NeuroFriend";
  const drawerTranslateX = drawerProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [-drawerWidth - 18, 0]
  });
  const dimmerOpacity = drawerProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1]
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      messagesScrollRef.current?.scrollToEnd({ animated: true });
    }, 40);

    return () => clearTimeout(timer);
  }, [sending, visibleMessages.length]);

  function openDrawer() {
    Keyboard.dismiss();
    setDrawerMounted(true);
    Animated.spring(drawerProgress, {
      toValue: 1,
      useNativeDriver: true,
      damping: 20,
      stiffness: 170,
      mass: 0.95
    }).start();
  }

  function closeDrawer() {
    Keyboard.dismiss();
    Animated.timing(drawerProgress, {
      toValue: 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start(({ finished }) => {
      if (finished && isMountedRef.current) {
        setDrawerMounted(false);
        setEditingThreadId(null);
        setEditingTitle("");
      }
    });
  }

  async function handlePickAttachment() {
    try {
      Keyboard.dismiss();
      const pickedAttachments = await pickTextAttachments();

      if (!pickedAttachments.length || !isMountedRef.current) {
        return;
      }

      setPendingAttachments((current) => mergeAttachments(current, pickedAttachments));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не удалось прикрепить файл.";
      Alert.alert("Файл не добавлен", message);
    }
  }

  async function handleSend() {
    const trimmedDraft = draft.trim();

    if (!trimmedDraft && pendingAttachments.length === 0) {
      return;
    }

    const previewMessage: ChatMessage = {
      id: `pending-${Date.now()}`,
      author: "user",
      text: trimmedDraft || (pendingAttachments.length === 1
        ? `Файл: ${pendingAttachments[0].name}`
        : `Прикреплено файлов: ${pendingAttachments.length}`),
      attachments: pendingAttachments,
      createdAt: new Date().toISOString()
    };

    try {
      setSending(true);
      setPendingPreview(previewMessage);
      await sendMessage({
        threadId: activeThread?.id,
        text: draft,
        mode: selectedMode,
        attachments: pendingAttachments
      });

      if (isMountedRef.current) {
        setDraft("");
        setPendingAttachments([]);
        setPendingPreview(null);
      }
    } catch (error) {
      if (!isMountedRef.current) {
        return;
      }

      setPendingPreview(null);
      const message = error instanceof Error ? error.message : "Не удалось отправить сообщение.";
      Alert.alert("Ошибка", message);
    } finally {
      if (isMountedRef.current) {
        setSending(false);
      }
    }
  }

  async function handleModeSelect(mode: NeuralMode) {
    setSelectedMode(mode);
    await updatePreferredMode(mode);
    closeDrawer();
  }

  function handleNewChat() {
    startNewChat();
    setDraft("");
    setPendingAttachments([]);
    setPendingPreview(null);
    closeDrawer();
  }

  async function handleDeleteThread(threadId: string) {
    await deleteThread(threadId);
    closeDrawer();
  }

  async function handleSaveRenamedThread() {
    if (!editingThreadId) {
      return;
    }

    try {
      await renameThread(editingThreadId, editingTitle);
      setEditingThreadId(null);
      setEditingTitle("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не удалось переименовать чат.";
      Alert.alert("Ошибка", message);
    }
  }

  function renderThreadRow(threadId: string, title: string, active: boolean) {
    if (editingThreadId === threadId) {
      return (
        <View key={threadId} style={styles.threadEditor}>
          <TextInput
            value={editingTitle}
            onChangeText={setEditingTitle}
            placeholder="Название чата"
            placeholderTextColor={palette.inkSoft}
            style={styles.threadEditorInput}
          />
          <View style={styles.threadEditorActions}>
            <Pressable onPress={() => void handleSaveRenamedThread()} style={styles.iconChip}>
              <Text style={styles.iconChipText}>OK</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setEditingThreadId(null);
                setEditingTitle("");
              }}
              style={styles.iconChip}
            >
              <Text style={styles.iconChipText}>X</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    return (
      <View key={threadId} style={[styles.threadRow, active && styles.threadRowActive]}>
        <Pressable
          style={styles.threadTitleWrap}
          onPress={() => {
            selectThread(threadId);
            closeDrawer();
          }}
        >
          <Text style={[styles.threadTitle, active && styles.threadTitleActive]} numberOfLines={1}>
            {title}
          </Text>
        </Pressable>

        <View style={styles.threadActions}>
          <Pressable
            onPress={() => {
              setEditingThreadId(threadId);
              setEditingTitle(title);
            }}
            style={styles.iconChip}
          >
            <Text style={styles.iconChipText}>E</Text>
          </Pressable>
          <Pressable onPress={() => void handleDeleteThread(threadId)} style={styles.iconChip}>
            <Text style={styles.iconChipText}>X</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <GradientScreen>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={styles.keyboard}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.container}>
            <PaperPanel style={styles.headerCard}>
              <OutlinedTitle text="Чат" size={34} style={styles.headerTitleWrap} />
            </PaperPanel>

            <Pressable style={styles.menuButton} onPress={drawerMounted ? closeDrawer : openDrawer}>
              <View style={styles.menuBars}>
                <View style={styles.menuBar} />
                <View style={styles.menuBar} />
                <View style={styles.menuBar} />
              </View>
            </Pressable>

            <PaperPanel style={styles.chatCard}>
              <ScrollView
                ref={messagesScrollRef}
                style={styles.messagesScroll}
                contentContainerStyle={styles.messagesContent}
                keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
                keyboardShouldPersistTaps="handled"
                onScrollBeginDrag={Keyboard.dismiss}
              >
                {visibleMessages.length === 0 ? (
                  <View style={styles.emptyWrap}>
                    <Text style={styles.emptyTitle}>Привет!</Text>
                    <Text style={styles.emptySubtitle}>
                      {assistantName} ждет вашего сообщения. Новый чат, режимы и история доступны в
                      боковом меню.
                    </Text>
                  </View>
                ) : (
                  visibleMessages.map((message) => (
                    <NeuroMessageBubble
                      key={message.id}
                      message={message}
                      assistantName={assistantName}
                    />
                  ))
                )}

                {sending ? (
                  <View style={styles.loadingWrap}>
                    <Text style={styles.loadingLabel}>{assistantName}</Text>
                    <View style={styles.loadingBubble}>
                      <Text style={styles.loadingDots}>...</Text>
                    </View>
                  </View>
                ) : null}
              </ScrollView>

              <View style={styles.composerWrap}>
                <View style={styles.composerTopRow}>
                  <Pressable onPress={() => void handlePickAttachment()} style={styles.fileButton}>
                    <Text style={styles.fileButtonText}>Добавить файл</Text>
                  </Pressable>
                  {keyboardVisible ? (
                    <Pressable onPress={Keyboard.dismiss}>
                      <Text style={styles.dismissText}>Скрыть клавиатуру</Text>
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
                        <Text style={styles.pendingAttachmentName} numberOfLines={1}>
                          {attachment.name}
                        </Text>
                        <Pressable
                          onPress={() =>
                            setPendingAttachments((current) =>
                              current.filter((item) => item.id !== attachment.id)
                            )
                          }
                        >
                          <Text style={styles.pendingAttachmentRemove}>X</Text>
                        </Pressable>
                      </View>
                    ))}
                  </ScrollView>
                ) : null}

                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  multiline
                  style={styles.input}
                  placeholder="Введите сообщение"
                  placeholderTextColor={palette.inkSoft}
                />

                <NeuroButton
                  title="Отправить"
                  onPress={handleSend}
                  loading={sending}
                  disabled={sending || (!draft.trim() && pendingAttachments.length === 0)}
                />
              </View>
            </PaperPanel>

            {drawerMounted ? (
              <View style={StyleSheet.absoluteFill}>
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.dimmer,
                    {
                      opacity: dimmerOpacity
                    }
                  ]}
                />
                <Pressable style={styles.dimmerTapZone} onPress={closeDrawer} />
                <Animated.View
                  {...panResponder.panHandlers}
                  style={[
                    styles.drawerWrap,
                    {
                      width: drawerWidth,
                      transform: [{ translateX: drawerTranslateX }]
                    }
                  ]}
                >
                  <PaperPanel style={styles.drawerPanel}>
                    <ScrollView
                      style={styles.drawerScroll}
                      contentContainerStyle={styles.drawerContent}
                      showsVerticalScrollIndicator={false}
                    >
                      <Pressable onPress={closeDrawer} style={styles.drawerButton}>
                        <Text style={styles.drawerButtonText}>К чату</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          closeDrawer();
                          navigation.navigate("Settings");
                        }}
                        style={styles.drawerButton}
                      >
                        <Text style={styles.drawerButtonText}>Настройки</Text>
                      </Pressable>
                      <Pressable onPress={handleNewChat} style={styles.drawerButton}>
                        <Text style={styles.drawerButtonText}>Новый чат</Text>
                      </Pressable>

                      <Text style={styles.drawerLabel}>Режим чата:</Text>
                      {MODE_OPTIONS.map((mode) => (
                        <Pressable
                          key={mode.id}
                          onPress={() => void handleModeSelect(mode.id)}
                          style={[
                            styles.drawerButton,
                            selectedMode === mode.id && styles.drawerButtonActive
                          ]}
                        >
                          <Text style={styles.drawerButtonText}>{mode.label}</Text>
                        </Pressable>
                      ))}

                      <Text style={styles.drawerLabel}>Список чатов:</Text>
                      <View style={styles.threadList}>
                        {threads.length === 0 ? (
                          <Text style={styles.emptyThreadList}>Чатов пока нет</Text>
                        ) : (
                          threads.map((thread) =>
                            renderThreadRow(thread.id, thread.title, thread.id === activeThread?.id)
                          )
                        )}
                      </View>

                      <View style={styles.accountPill}>
                        <Text style={styles.accountName}>{currentUser?.name ?? "Пользователь"}</Text>
                        <Text style={styles.accountEmail}>{currentUser?.email ?? ""}</Text>
                      </View>
                    </ScrollView>
                  </PaperPanel>
                </Animated.View>
              </View>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GradientScreen>
  );
}

const MODE_OPTIONS: Array<{ id: NeuralMode; label: string }> = [
  { id: "friend", label: "Друг" },
  { id: "coach", label: "Коуч" },
  { id: "psychologist", label: "Психолог" }
];

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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

const createStyles = (palette: ReturnType<typeof getNeuroPalette>) =>
  StyleSheet.create({
    safe: {
      flex: 1
    },
    keyboard: {
      flex: 1
    },
    container: {
      flex: 1,
      paddingHorizontal: 20,
      paddingBottom: 14
    },
    headerCard: {
      minHeight: 108,
      marginTop: 12,
      justifyContent: "center"
    },
    headerTitleWrap: {
      alignSelf: "center"
    },
    menuButton: {
      position: "absolute",
      left: 10,
      top: 126,
      width: 50,
      height: 50,
      borderRadius: 25,
      borderWidth: 3,
      borderColor: palette.outline,
      backgroundColor: palette.panel,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: palette.shadow,
      shadowOpacity: 1,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 8 },
      elevation: 7,
      zIndex: 3
    },
    menuBars: {
      gap: 4
    },
    menuBar: {
      width: 20,
      height: 3,
      borderRadius: 999,
      backgroundColor: palette.ink
    },
    chatCard: {
      flex: 1,
      marginTop: 26,
      paddingHorizontal: 16,
      paddingTop: 18,
      paddingBottom: 14
    },
    messagesScroll: {
      flex: 1
    },
    messagesContent: {
      paddingTop: 8,
      paddingBottom: 20,
      minHeight: "100%",
      justifyContent: "flex-end"
    },
    emptyWrap: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingBottom: 80
    },
    emptyTitle: {
      fontSize: 22,
      fontWeight: "800",
      color: palette.ink
    },
    emptySubtitle: {
      marginTop: 12,
      fontSize: 17,
      lineHeight: 24,
      textAlign: "center",
      color: palette.inkSoft,
      fontStyle: "italic"
    },
    loadingWrap: {
      alignSelf: "flex-start",
      marginBottom: 12
    },
    loadingLabel: {
      marginLeft: 14,
      marginBottom: 6,
      fontSize: 13,
      fontStyle: "italic",
      color: palette.inkSoft
    },
    loadingBubble: {
      borderRadius: 28,
      borderWidth: 3,
      borderColor: palette.outline,
      backgroundColor: palette.panel,
      paddingHorizontal: 18,
      paddingVertical: 12
    },
    loadingDots: {
      fontSize: 22,
      color: palette.ink
    },
    composerWrap: {
      gap: 10
    },
    composerTopRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center"
    },
    fileButton: {
      alignSelf: "flex-start",
      borderRadius: 28,
      borderWidth: 3,
      borderColor: palette.outline,
      backgroundColor: palette.panel,
      paddingHorizontal: 16,
      paddingVertical: 10
    },
    fileButtonText: {
      fontSize: 14,
      fontWeight: "700",
      color: palette.ink
    },
    dismissText: {
      fontSize: 13,
      fontStyle: "italic",
      color: palette.inkSoft
    },
    pendingAttachmentRow: {
      gap: 8
    },
    pendingAttachmentCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      borderRadius: 18,
      borderWidth: 2,
      borderColor: palette.outline,
      backgroundColor: palette.panel,
      paddingHorizontal: 12,
      paddingVertical: 8
    },
    pendingAttachmentName: {
      maxWidth: 160,
      fontSize: 13,
      fontWeight: "700",
      color: palette.ink
    },
    pendingAttachmentRemove: {
      fontSize: 12,
      fontWeight: "800",
      color: palette.inkSoft
    },
    input: {
      minHeight: 58,
      maxHeight: 130,
      borderRadius: 30,
      borderWidth: 3,
      borderColor: palette.outline,
      backgroundColor: palette.panel,
      paddingHorizontal: 18,
      paddingVertical: 16,
      fontSize: 18,
      color: palette.ink,
      fontStyle: "italic",
      textAlignVertical: "center"
    },
    dimmer: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: palette.dimmer
    },
    dimmerTapZone: {
      ...StyleSheet.absoluteFillObject
    },
    drawerWrap: {
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      paddingLeft: 10,
      paddingTop: 18,
      paddingBottom: 18
    },
    drawerPanel: {
      flex: 1
    },
    drawerScroll: {
      flex: 1
    },
    drawerContent: {
      paddingHorizontal: 12,
      paddingTop: 14,
      paddingBottom: 16,
      gap: 12,
      minHeight: "100%"
    },
    drawerButton: {
      borderRadius: 26,
      borderWidth: 3,
      borderColor: palette.outline,
      backgroundColor: palette.panel,
      minHeight: 54,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 12
    },
    drawerButtonActive: {
      backgroundColor: palette.panelMuted
    },
    drawerButtonText: {
      fontSize: 19,
      fontWeight: "800",
      fontStyle: "italic",
      color: palette.ink
    },
    drawerLabel: {
      marginTop: 4,
      fontSize: 15,
      fontWeight: "700",
      fontStyle: "italic",
      color: palette.ink
    },
    threadList: {
      gap: 8
    },
    emptyThreadList: {
      fontSize: 14,
      color: palette.inkSoft,
      fontStyle: "italic"
    },
    threadRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8
    },
    threadRowActive: {
      opacity: 1
    },
    threadTitleWrap: {
      flex: 1,
      paddingVertical: 6
    },
    threadTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: palette.ink
    },
    threadTitleActive: {
      textDecorationLine: "underline"
    },
    threadActions: {
      flexDirection: "row",
      gap: 6
    },
    iconChip: {
      minWidth: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: palette.outline,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 6
    },
    iconChipText: {
      fontSize: 11,
      fontWeight: "800",
      color: palette.ink
    },
    threadEditor: {
      gap: 8
    },
    threadEditorInput: {
      minHeight: 42,
      borderRadius: 18,
      borderWidth: 2,
      borderColor: palette.outline,
      paddingHorizontal: 12,
      color: palette.ink,
      fontSize: 14
    },
    threadEditorActions: {
      flexDirection: "row",
      gap: 8
    },
    accountPill: {
      marginTop: "auto",
      borderRadius: 24,
      borderWidth: 3,
      borderColor: palette.outline,
      backgroundColor: palette.panel,
      paddingHorizontal: 12,
      paddingVertical: 12
    },
    accountName: {
      fontSize: 14,
      fontWeight: "800",
      color: palette.ink
    },
    accountEmail: {
      marginTop: 4,
      fontSize: 12,
      color: palette.inkSoft
    }
  });
