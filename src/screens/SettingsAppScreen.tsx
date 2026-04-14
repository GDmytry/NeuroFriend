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
import { useAuth } from "../contexts/AuthSyncContext";
import { useChat } from "../contexts/ChatSyncRuntimeContext";
import { useSettings } from "../contexts/SettingsContext";
import { RootStackParamList } from "../navigation/AppNavigator";
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
  const { theme, themePreference, setThemePreference } = useSettings();
  const { currentUser, logout, updateAssistantName } = useAuth();
  const { threads } = useChat();
  const palette = getNeuroPalette(theme);
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [assistantName, setAssistantName] = useState(currentUser?.assistantName ?? "");
  const [savingAssistant, setSavingAssistant] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    setAssistantName(currentUser?.assistantName ?? "");
  }, [currentUser?.assistantName]);

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

                <View style={styles.metaCard}>
                  <Text style={styles.metaText}>
                    Пользователь: {currentUser?.name ?? "Не указан"}
                  </Text>
                  <Text style={styles.metaText}>Email: {currentUser?.email ?? "Не указан"}</Text>
                  <Text style={styles.metaText}>Сохранено чатов: {threads.length}</Text>
                </View>

                <View style={styles.bottomActions}>
                  <NeuroButton title="Назад" onPress={() => navigation.goBack()} />
                  <NeuroButton
                    title="Выйти из аккаунта"
                    onPress={() => void handleLogout()}
                    loading={loggingOut}
                  />
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
