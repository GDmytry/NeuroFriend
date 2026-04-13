import React, { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";

import { GradientScreen } from "../components/neuro/GradientScreen";
import { NeuroButton } from "../components/neuro/NeuroButton";
import { NeuroField } from "../components/neuro/NeuroField";
import { OutlinedTitle } from "../components/neuro/OutlinedTitle";
import { PaperPanel } from "../components/neuro/PaperPanel";
import { useAuth } from "../contexts/AuthContext";
import { useSettings } from "../contexts/SettingsContext";
import { RootStackParamList } from "../navigation/AppNavigator";
import { getNeuroPalette } from "../theme/neuroFriend";

type Props = NativeStackScreenProps<RootStackParamList, "Register">;

export function RegistrationWorkspaceScreen({ navigation }: Props) {
  const { register } = useAuth();
  const { theme } = useSettings();
  const palette = getNeuroPalette(theme);
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [assistantName, setAssistantName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!name.trim() || !email.trim() || !password.trim() || !assistantName.trim()) {
      Alert.alert("Проверьте поля", "Заполните имя, email, пароль и имя нейросети.");
      return;
    }

    try {
      setLoading(true);
      await register({
        name,
        email,
        password,
        assistantName,
        preferredMode: "friend"
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не удалось зарегистрироваться.";
      Alert.alert("Ошибка регистрации", message);
    } finally {
      setLoading(false);
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
                contentContainerStyle={styles.panelInner}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <OutlinedTitle text="Регистрация" size={34} style={styles.titleWrap} />

                <View style={styles.fields}>
                  <NeuroField
                    label="Введите ваше имя"
                    value={name}
                    onChangeText={setName}
                    placeholder="Ваше имя"
                  />
                  <NeuroField
                    label="Email"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholder="Введите email..."
                  />
                  <NeuroField
                    label="Пароль"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    placeholder="Введите пароль..."
                  />
                  <NeuroField
                    label="Имя вашего друга"
                    value={assistantName}
                    onChangeText={setAssistantName}
                    placeholder="Введите имя вашего собеседника"
                  />
                </View>

                <View style={styles.actions}>
                  <NeuroButton
                    title="Зарегистрироваться"
                    onPress={handleRegister}
                    loading={loading}
                  />
                  <NeuroButton
                    title="Назад"
                    onPress={() => navigation.goBack()}
                    compact
                    style={styles.backButton}
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
      flex: 1
    },
    container: {
      flex: 1,
      paddingHorizontal: 20,
      paddingVertical: 28
    },
    panel: {
      flex: 1
    },
    panelInner: {
      paddingHorizontal: 18,
      paddingTop: 26,
      paddingBottom: 20,
      gap: 20,
      minHeight: "100%"
    },
    titleWrap: {
      alignSelf: "center"
    },
    fields: {
      gap: 14,
      marginTop: 10
    },
    actions: {
      gap: 12,
      marginTop: "auto",
      paddingTop: 16
    },
    backButton: {
      alignSelf: "stretch"
    }
  });
