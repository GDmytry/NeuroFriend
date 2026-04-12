import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useSettings } from "../contexts/SettingsContext";
import { ChatMessage } from "../types";
import { formatTime } from "../utils/date";

export function MessageBubble({ message }: { message: ChatMessage }) {
  const { theme } = useSettings();
  const styles = useMemo(() => createStyles(theme.colors), [theme.colors]);
  const isUser = message.author === "user";
  const attachments = message.attachments ?? [];

  return (
    <View style={[styles.wrapper, isUser ? styles.wrapperUser : styles.wrapperAssistant]}>
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
        <Text style={[styles.text, isUser ? styles.userText : styles.assistantText]}>
          {message.text}
        </Text>
        {attachments.length > 0 ? (
          <View style={styles.attachmentList}>
            {attachments.map((attachment) => (
              <View
                key={attachment.id}
                style={[styles.attachmentChip, isUser ? styles.userAttachment : styles.assistantAttachment]}
              >
                <Text
                  numberOfLines={1}
                  style={[styles.attachmentName, isUser ? styles.userText : styles.assistantText]}
                >
                  {attachment.name}
                </Text>
                <Text
                  style={[
                    styles.attachmentMeta,
                    isUser ? styles.userAttachmentMeta : styles.assistantAttachmentMeta
                  ]}
                >
                  {formatAttachmentSize(attachment.size)}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
        <Text style={[styles.time, isUser ? styles.userTime : styles.assistantTime]}>
          {formatTime(message.createdAt)}
        </Text>
      </View>
    </View>
  );
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
    wrapper: {
      marginBottom: 12,
      flexDirection: "row"
    },
    wrapperUser: {
      justifyContent: "flex-end"
    },
    wrapperAssistant: {
      justifyContent: "flex-start"
    },
    bubble: {
      maxWidth: "86%",
      borderRadius: 22,
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 10
    },
    userBubble: {
      backgroundColor: colors.primary,
      borderBottomRightRadius: 8
    },
    assistantBubble: {
      backgroundColor: colors.surfaceElevated,
      borderBottomLeftRadius: 8,
      borderWidth: 1,
      borderColor: colors.border
    },
    text: {
      fontSize: 15,
      lineHeight: 22
    },
    attachmentList: {
      marginTop: 10,
      gap: 8
    },
    attachmentChip: {
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderWidth: 1
    },
    userAttachment: {
      backgroundColor: "rgba(255,255,255,0.12)",
      borderColor: "rgba(255,255,255,0.22)"
    },
    assistantAttachment: {
      backgroundColor: colors.surface,
      borderColor: colors.borderStrong
    },
    attachmentName: {
      fontSize: 13,
      fontWeight: "700"
    },
    attachmentMeta: {
      marginTop: 3,
      fontSize: 11
    },
    userAttachmentMeta: {
      color: "rgba(255,255,255,0.75)"
    },
    assistantAttachmentMeta: {
      color: colors.textTertiary
    },
    userText: {
      color: colors.primaryContrast
    },
    assistantText: {
      color: colors.text
    },
    time: {
      marginTop: 8,
      fontSize: 11,
      textAlign: "right"
    },
    userTime: {
      color: "rgba(255,255,255,0.8)"
    },
    assistantTime: {
      color: colors.textTertiary
    }
  });
