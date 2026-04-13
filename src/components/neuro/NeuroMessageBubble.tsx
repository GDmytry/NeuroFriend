import React, { useEffect, useMemo, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

import { useSettings } from "../../contexts/SettingsContext";
import { ChatMessage } from "../../types";
import { formatTime } from "../../utils/date";
import { getNeuroPalette } from "../../theme/neuroFriend";

type Props = {
  message: ChatMessage;
  assistantName: string;
};

export function NeuroMessageBubble({ message, assistantName }: Props) {
  const { theme } = useSettings();
  const palette = getNeuroPalette(theme);
  const styles = useMemo(() => createStyles(palette), [palette]);
  const isUser = message.author === "user";
  const attachments = message.attachments ?? [];
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true
      }),
      Animated.spring(translateY, {
        toValue: 0,
        damping: 18,
        stiffness: 180,
        mass: 0.9,
        useNativeDriver: true
      })
    ]).start();
  }, [opacity, translateY]);

  return (
    <Animated.View
      style={[
        styles.wrapper,
        isUser ? styles.wrapperUser : styles.wrapperAssistant,
        { opacity, transform: [{ translateY }] }
      ]}
    >
      {!isUser ? <Text style={styles.assistantLabel}>{assistantName}</Text> : null}
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
        <Text style={styles.messageText}>{message.text}</Text>
        {attachments.length > 0 ? (
          <View style={styles.attachmentList}>
            {attachments.map((attachment) => (
              <View key={attachment.id} style={styles.attachmentCard}>
                <Text numberOfLines={1} style={styles.attachmentTitle}>
                  {attachment.name}
                </Text>
                <Text style={styles.attachmentMeta}>{formatAttachmentSize(attachment.size)}</Text>
              </View>
            ))}
          </View>
        ) : null}
        <Text style={styles.time}>{formatTime(message.createdAt)}</Text>
      </View>
    </Animated.View>
  );
}

function formatAttachmentSize(size: number) {
  if (!size || size < 1024) {
    return `${Math.max(0, size)} B`;
  }

  return `${(size / 1024).toFixed(1)} KB`;
}

const createStyles = (palette: ReturnType<typeof getNeuroPalette>) =>
  StyleSheet.create({
    wrapper: {
      marginBottom: 14,
      maxWidth: "78%"
    },
    wrapperUser: {
      alignSelf: "flex-end"
    },
    wrapperAssistant: {
      alignSelf: "flex-start"
    },
    assistantLabel: {
      marginLeft: 14,
      marginBottom: 6,
      fontSize: 13,
      fontStyle: "italic",
      color: palette.inkSoft
    },
    bubble: {
      borderRadius: 28,
      borderWidth: 3,
      borderColor: palette.outline,
      paddingHorizontal: 16,
      paddingVertical: 14,
      shadowColor: palette.shadow,
      shadowOpacity: 0.85,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 8 },
      elevation: 6
    },
    userBubble: {
      backgroundColor: palette.bubbleUser
    },
    assistantBubble: {
      backgroundColor: palette.bubbleAssistant
    },
    messageText: {
      fontSize: 18,
      lineHeight: 24,
      color: palette.bubbleText,
      fontStyle: "italic"
    },
    attachmentList: {
      marginTop: 10,
      gap: 8
    },
    attachmentCard: {
      borderRadius: 18,
      borderWidth: 2,
      borderColor: palette.outline,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: palette.panelMuted
    },
    attachmentTitle: {
      fontSize: 13,
      fontWeight: "700",
      color: palette.ink
    },
    attachmentMeta: {
      marginTop: 4,
      fontSize: 11,
      color: palette.inkSoft
    },
    time: {
      marginTop: 8,
      fontSize: 11,
      color: palette.inkSoft,
      textAlign: "right"
    }
  });
