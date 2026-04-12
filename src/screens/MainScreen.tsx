import React, { useMemo, useState } from "react";
import { Keyboard, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useSettings } from "../contexts/SettingsContext";
import { ConversationWorkspaceScreen } from "./ConversationWorkspaceScreen";
import { SettingsScreen } from "./SettingsScreen";
import { ThreadsScreen } from "./ThreadsScreen";

type HomeTab = "chat" | "threads" | "settings";

const TAB_ITEMS: Array<{ id: HomeTab; title: string; subtitle: string }> = [
  { id: "chat", title: "Диалог", subtitle: "Текущий чат" },
  { id: "threads", title: "Чаты", subtitle: "История" },
  { id: "settings", title: "Настройки", subtitle: "Тема и данные" }
];

export function MainScreen() {
  const { theme } = useSettings();
  const [activeTab, setActiveTab] = useState<HomeTab>("chat");
  const styles = useMemo(() => createStyles(theme.colors), [theme.colors]);

  return (
    <SafeAreaView style={styles.safe} edges={["left", "right", "bottom"]}>
      <View style={styles.content}>
        {activeTab === "chat" ? null : activeTab === "threads" ? (
          <ThreadsScreen onOpenChat={() => setActiveTab("chat")} />
        ) : (
          <SettingsScreen />
        )}
        {activeTab === "chat" ? <ConversationWorkspaceScreen /> : null}
      </View>

      <View style={styles.tabBar}>
        {TAB_ITEMS.map((tab) => {
          const active = tab.id === activeTab;

          return (
            <Pressable
              key={tab.id}
              onPress={() => {
                Keyboard.dismiss();
                setActiveTab(tab.id);
              }}
              style={[styles.tabButton, active && styles.tabButtonActive]}
            >
              <Text style={[styles.tabTitle, active && styles.tabTitleActive]}>{tab.title}</Text>
              <Text style={[styles.tabSubtitle, active && styles.tabSubtitleActive]}>
                {tab.subtitle}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: ReturnType<typeof useSettings>["theme"]["colors"]) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.background
    },
    content: {
      flex: 1
    },
    tabBar: {
      flexDirection: "row",
      gap: 10,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 10,
      backgroundColor: colors.tabBar,
      borderTopWidth: 1,
      borderTopColor: colors.border
    },
    tabButton: {
      flex: 1,
      minHeight: 58,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: "center"
    },
    tabButtonActive: {
      backgroundColor: colors.primarySoft,
      borderColor: colors.primary
    },
    tabTitle: {
      fontSize: 14,
      fontWeight: "800",
      color: colors.tabInactive
    },
    tabTitleActive: {
      color: colors.primary
    },
    tabSubtitle: {
      marginTop: 2,
      fontSize: 11,
      color: colors.textTertiary
    },
    tabSubtitleActive: {
      color: colors.primary
    }
  });
