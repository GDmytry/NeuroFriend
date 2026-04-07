import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { ChatMessage } from "../types";
import { formatTime } from "../utils/date";

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.author === "user";

  return (
    <View style={[styles.wrapper, isUser ? styles.wrapperUser : styles.wrapperAssistant]}>
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
        <Text style={[styles.text, isUser ? styles.userText : styles.assistantText]}>
          {message.text}
        </Text>
        <Text style={[styles.time, isUser ? styles.userTime : styles.assistantTime]}>
          {formatTime(message.createdAt)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: "#B96D40",
    borderBottomRightRadius: 8
  },
  assistantBubble: {
    backgroundColor: "#FFFDF9",
    borderBottomLeftRadius: 8,
    borderWidth: 1,
    borderColor: "#E7D8C8"
  },
  text: {
    fontSize: 15,
    lineHeight: 22
  },
  userText: {
    color: "#FFF"
  },
  assistantText: {
    color: "#2A241E"
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
    color: "#8A7F73"
  }
});
