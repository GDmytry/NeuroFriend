import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";

import { GradientScreen } from "../components/neuro/GradientScreen";
import { NeuroButton } from "../components/neuro/NeuroButton";
import { NeuroField } from "../components/neuro/NeuroField";
import { OutlinedTitle } from "../components/neuro/OutlinedTitle";
import { PaperPanel } from "../components/neuro/PaperPanel";
import { getAutoDetectedChatUrl, normalizeChatApiUrl } from "../config/app";
import { useAuth } from "../contexts/AuthSyncContext";
import { useChat } from "../contexts/ChatSyncRuntimeContext";
import { useSettings } from "../contexts/SettingsContext";
import { RootStackParamList } from "../navigation/AppNavigator";
import { checkServerHealth, ServerHealthStatus } from "../services/serverSyncApi";
import { getNeuroPalette } from "../theme/neuroFriend";
import { ThemePreference } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "Settings">;

const THEME_OPTIONS: Array<{
  id: ThemePreference;
  title: string;
}> = [
  { id: "system", title: "Системная" },
  { id: "dark", title: "Темная" },
  { id: "light", title: "Светлая" }
];

export function SettingsAppScreen({ navigation }: Props) {
  const {
    theme,
    themePreference,
    settings,
    setThemePreference,
    setRemoteAiConfig
  } = useSettings();
  const { currentUser, logout, updateAssistantName } = useAuth();
  const { threads } = useChat();
  const palette = getNeuroPalette(theme);
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [assistantName, setAssistantName] = useState(currentUser?.assistantName ?? "");
  const [remoteAiEnabled, setRemoteAiEnabled] = useState(settings.remoteAiEnabled);
  const [remoteAiUrl, setRemoteAiUrl] = useState(settings.remoteAiUrl);
  const [remoteAiKey, setRemoteAiKey] = useState(settings.remoteAiKey);
  const [remoteAiModel, setRemoteAiModel] = useState(settings.remoteAiModel ?? "");
  const [savingAssistant, setSavingAssistant] = useState(false);
  const [savingAi, setSavingAi] = useState(false);
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [healthStatus, setHealthStatus] = useState<ServerHealthStatus | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    setAssistantName(currentUser?.assistantName ?? "");
  }, [currentUser?.assistantName]);

  useEffect(() => {
    setRemoteAiEnabled(settings.remoteAiEnabled);
    setRemoteAiUrl(settings.remoteAiUrl);
    setRemoteAiKey(settings.remoteAiKey);
    setRemoteAiModel(settings.remoteAiModel ?? "");
  }, [settings.remoteAiEnabled, settings.remoteAiKey, settings.remoteAiModel, settings.remoteAiUrl]);

  useEffect(() => {
    if (settings.remoteAiUrl) {
      void runHealthCheck(settings.remoteAiUrl);
    }
  }, [settings.remoteAiUrl]);

  async function runHealthCheck(urlToTest?: string) {
    const targetUrl = (urlToTest ?? remoteAiUrl).trim();
    if (!targetUrl) {
      setHealthStatus(null);
      return;
    }

    try {
      setCheckingHealth(true);
      const status = await checkServerHealth(targetUrl);
      setHealthStatus(status);
    } finally {
      setCheckingHealth(false);
    }
  }

  async function handleSaveAssistantName() {
    if (!assistantName.trim()) {
      Alert.alert(
        "Нужно имя",
        "Введите имя нейросети, под которым она будет отвечать в чате."
      );
      return;
    }

    try {
      setSavingAssistant(true);
      await updateAssistantName(assistantName);
      Alert.alert("Сохранено", "Новое имя нейросети сохранено.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Не удалось обновить имя нейросети.";
      Alert.alert("Ошибка", message);
    } finally {
      setSavingAssistant(false);
    }
  }

  async function handleSaveAiConfig() {
    const normalizedUrl = normalizeChatApiUrl(remoteAiUrl);

    if (remoteAiEnabled && !normalizedUrl) {
      Alert.alert(
        "Нужен адрес",
        "Укажите адрес локального моста (например http://localhost:3001/chat или http://192.168.1.10:3001/chat)."
      );
      return;
    }

    try {
      setSavingAi(true);
      const urlToSave = normalizedUrl || remoteAiUrl.trim();
      setRemoteAiUrl(urlToSave);
      await setRemoteAiConfig({
        remoteAiEnabled,
        remoteAiUrl: urlToSave,
        remoteAiKey,
        remoteAiModel
      });
      if (remoteAiEnabled && urlToSave) {
        await runHealthCheck(urlToSave);
      }
      Alert.alert("Сохранено", "Параметры подключения к локальной LLM обновлены.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Не удалось сохранить параметры AI.";
      Alert.alert("Ошибка", message);
    } finally {
      setSavingAi(false);
    }
  }

  function handleAutoDetectUrl() {
    const detected = getAutoDetectedChatUrl();
    setRemoteAiUrl(detected);
    void runHealthCheck(detected);
  }

  async function handleLogout() {
    try {
      setLoggingOut(true);
      await logout();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <GradientScreen>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={styles.keyboard}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.container}>
            <PaperPanel style={styles.panel}>
              <ScrollView
                contentContainerStyle={styles.panelContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <OutlinedTitle text="Настройки" size={34} style={styles.titleWrap} />

                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Выбор темы</Text>
                  {THEME_OPTIONS.map((option) => {
                    const active = option.id === themePreference;

                    return (
                      <Pressable
                        key={option.id}
                        onPress={() => void setThemePreference(option.id)}
                        style={[styles.optionButton, active && styles.optionButtonActive]}
                      >
                        <Text
                          style={[
                            styles.optionButtonText,
                            active && styles.optionButtonTextActive
                          ]}
                        >
                          {option.title}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {currentUser ? (
                  <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Имя нейросети</Text>
                    <NeuroField
                      value={assistantName}
                      onChangeText={setAssistantName}
                      placeholder="Введите имя вашего собеседника"
                    />
                    <NeuroButton
                      title="Сохранить имя"
                      onPress={() => void handleSaveAssistantName()}
                      loading={savingAssistant}
                      compact
                    />
                  </View>
                ) : null}

                <View style={styles.technicalBlock}>
                  <Text style={styles.technicalTitle}>Подключение локальной LLM</Text>
                  <Text style={styles.technicalHint}>
                    Поддерживаются Ollama, LM Studio, llama.cpp, vLLM, MLX и любой OpenAI-совместимый сервер через локальный мост (порт 3001).
                  </Text>

                  <View style={styles.technicalToggleRow}>
                    <Pressable
                      onPress={() => setRemoteAiEnabled(true)}
                      style={[
                        styles.toggleChip,
                        remoteAiEnabled && styles.toggleChipActive
                      ]}
                    >
                      <Text
                        style={[
                          styles.toggleChipText,
                          remoteAiEnabled && styles.toggleChipTextActive
                        ]}
                      >
                        Локальная LLM
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setRemoteAiEnabled(false)}
                      style={[
                        styles.toggleChip,
                        !remoteAiEnabled && styles.toggleChipActive
                      ]}
                    >
                      <Text
                        style={[
                          styles.toggleChipText,
                          !remoteAiEnabled && styles.toggleChipTextActive
                        ]}
                      >
                        Офлайн (Mock)
                      </Text>
                    </Pressable>
                  </View>

                  <NeuroField
                    label="Адрес локального моста (AI URL)"
                    value={remoteAiUrl}
                    onChangeText={setRemoteAiUrl}
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder="http://localhost:3001/chat"
                  />
                  <NeuroField
                    label="Токен (опционально)"
                    value={remoteAiKey}
                    onChangeText={setRemoteAiKey}
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder="Оставьте пустым, если CHAT_SERVER_API_KEY не задан"
                  />

                  {healthStatus?.installedModels && healthStatus.installedModels.length > 0 ? (
                    <View style={styles.modelsSection}>
                      <Text style={styles.modelsLabel}>Модель на компьютере</Text>
                      <View style={styles.modelsWrap}>
                        <Pressable
                          onPress={() => setRemoteAiModel("")}
                          style={[
                            styles.modelChip,
                            !remoteAiModel && styles.modelChipActive
                          ]}
                        >
                          <Text
                            style={[
                              styles.modelChipText,
                              !remoteAiModel && styles.modelChipTextActive
                            ]}
                          >
                            Авто ({healthStatus.activeModel || healthStatus.ollamaModel || "по умолчанию"})
                          </Text>
                        </Pressable>
                        {healthStatus.installedModels.map((modelName) => {
                          const selected = remoteAiModel === modelName;
                          return (
                            <Pressable
                              key={modelName}
                              onPress={() => setRemoteAiModel(modelName)}
                              style={[
                                styles.modelChip,
                                selected && styles.modelChipActive
                              ]}
                            >
                              <Text
                                style={[
                                  styles.modelChipText,
                                  selected && styles.modelChipTextActive
                                ]}
                              >
                                {modelName}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  ) : null}

                  {healthStatus ? (
                    <View style={styles.healthBox}>
                      <Text style={styles.healthText}>
                        {healthStatus.reachable
                          ? healthStatus.ok
                            ? `Подключено (${healthStatus.providerLabel || "LLM"}) • Модель: ${remoteAiModel || healthStatus.activeModel || healthStatus.ollamaModel || "авто"}`
                            : `Мост доступен, но LLM не готова: ${healthStatus.error ?? ""}`
                          : `Статус: ${healthStatus.error ?? "Мост недоступен"}`}
                      </Text>
                      {healthStatus.publicChatUrl ? (
                        <Text selectable style={styles.healthText}>
                          {`Публичный HTTPS для телефона:\n${healthStatus.publicChatUrl}`}
                        </Text>
                      ) : null}
                      {healthStatus.lanChatUrls?.length ? (
                        <Text selectable style={styles.healthText}>
                          {`Wi-Fi адрес для телефона:\n${healthStatus.lanChatUrls[0]}`}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}

                  <NeuroButton
                    title="Сохранить подключение"
                    onPress={() => void handleSaveAiConfig()}
                    loading={savingAi}
                    compact
                  />
                  <NeuroButton
                    title="Проверить подключение"
                    onPress={() => void runHealthCheck()}
                    loading={checkingHealth}
                    compact
                  />
                  <NeuroButton
                    title="Автоопределить адрес"
                    onPress={handleAutoDetectUrl}
                    compact
                  />
                </View>

                {currentUser ? (
                  <View style={styles.metaCard}>
                    <Text style={styles.metaText}>
                      Пользователь: {currentUser.name}
                    </Text>
                    <Text style={styles.metaText}>Email: {currentUser.email}</Text>
                    <Text style={styles.metaText}>Сохранено чатов: {threads.length}</Text>
                  </View>
                ) : null}

                <View style={styles.bottomActions}>
                  <NeuroButton title="Назад" onPress={() => navigation.goBack()} />
                  {currentUser ? (
                    <NeuroButton
                      title="Выйти из аккаунта"
                      onPress={() => void handleLogout()}
                      loading={loggingOut}
                    />
                  ) : null}
                </View>
              </ScrollView>
            </PaperPanel>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GradientScreen>
  );
}

const createStyles = (palette: ReturnType<typeof getNeuroPalette>) =>
  StyleSheet.create({
    safe: {
      flex: 1
    },
    keyboard: {
      flex: 1,
      minHeight: 0
    },
    container: {
      flex: 1,
      paddingHorizontal: 20,
      paddingVertical: 26
    },
    panel: {
      flex: 1,
      minHeight: 0
    },
    panelContent: {
      paddingHorizontal: 18,
      paddingTop: 24,
      paddingBottom: 34,
      gap: 18
    },
    titleWrap: {
      alignSelf: "center",
      marginBottom: 4
    },
    section: {
      gap: 12
    },
    sectionLabel: {
      marginLeft: 18,
      fontSize: 16,
      fontStyle: "italic",
      color: palette.inkSoft
    },
    optionButton: {
      minHeight: 58,
      borderRadius: 30,
      borderWidth: 3,
      borderColor: palette.outline,
      backgroundColor: palette.panelMuted,
      justifyContent: "center",
      paddingHorizontal: 18
    },
    optionButtonActive: {
      backgroundColor: palette.panel
    },
    optionButtonText: {
      fontSize: 20,
      fontStyle: "italic",
      color: palette.inkSoft
    },
    optionButtonTextActive: {
      color: palette.ink,
      fontWeight: "700"
    },
    technicalBlock: {
      borderRadius: 30,
      borderWidth: 3,
      borderColor: palette.outline,
      backgroundColor: palette.panelMuted,
      paddingHorizontal: 14,
      paddingVertical: 16,
      gap: 12
    },
    technicalTitle: {
      fontSize: 18,
      fontWeight: "800",
      color: palette.ink
    },
    technicalHint: {
      fontSize: 13,
      lineHeight: 18,
      color: palette.inkSoft,
      fontStyle: "italic"
    },
    technicalToggleRow: {
      flexDirection: "row",
      gap: 10
    },
    toggleChip: {
      flex: 1,
      minHeight: 46,
      borderRadius: 24,
      borderWidth: 2,
      borderColor: palette.outline,
      backgroundColor: palette.panel,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 10
    },
    toggleChipActive: {
      backgroundColor: palette.gradientTop
    },
    toggleChipText: {
      fontSize: 14,
      fontWeight: "700",
      color: palette.inkSoft
    },
    toggleChipTextActive: {
      color: "#111111"
    },
    modelsSection: {
      gap: 8
    },
    modelsLabel: {
      fontSize: 13,
      fontWeight: "700",
      color: palette.inkSoft,
      marginLeft: 6
    },
    modelsWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8
    },
    modelChip: {
      borderRadius: 18,
      borderWidth: 2,
      borderColor: palette.outline,
      backgroundColor: palette.panel,
      paddingHorizontal: 12,
      paddingVertical: 8
    },
    modelChipActive: {
      backgroundColor: palette.gradientTop
    },
    modelChipText: {
      fontSize: 13,
      fontWeight: "600",
      color: palette.inkSoft
    },
    modelChipTextActive: {
      color: "#111111",
      fontWeight: "700"
    },
    healthBox: {
      borderRadius: 18,
      borderWidth: 2,
      borderColor: palette.outline,
      backgroundColor: palette.panel,
      paddingHorizontal: 12,
      paddingVertical: 10
    },
    healthText: {
      fontSize: 13,
      lineHeight: 18,
      color: palette.ink,
      fontStyle: "italic"
    },
    metaCard: {
      borderRadius: 28,
      borderWidth: 3,
      borderColor: palette.outline,
      backgroundColor: palette.panelMuted,
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 6
    },
    metaText: {
      fontSize: 14,
      color: palette.inkSoft,
      fontStyle: "italic"
    },
    bottomActions: {
      gap: 12,
      marginTop: 10,
      paddingBottom: 8
    }
  });
