import React, { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
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
import { useSettings } from "../contexts/SettingsContext";
import { RootStackParamList } from "../navigation/AppNavigator";
import { getNeuroPalette } from "../theme/neuroFriend";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

export function LoginWorkspaceScreen({ navigation }: Props) {
  const { login } = useAuth();
  const { theme } = useSettings();
  const palette = getNeuroPalette(theme);
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Проверьте поля", "Введите логин/email и пароль.");
      return;
    }

    try {
      setLoading(true);
      await login({ email, password });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не удалось войти.";
      Alert.alert("Ошибка входа", message);
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
              <View style={styles.panelInner}>
                <OutlinedTitle text="Вход" size={36} style={styles.titleWrap} />

                <View style={styles.fields}>
                  <NeuroField
                    label="Логин/email"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholder="Введите логин/email..."
                  />
                  <NeuroField
                    label="Пароль"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    placeholder="Введите пароль..."
                  />

                  <View style={styles.inlineRow}>
                    <Text style={styles.secondaryLink}>Забыли пароль?</Text>
                    <Pressable onPress={() => navigation.navigate("Register")}>
                      <Text style={styles.secondaryLink}>Регистрация</Text>
                    </Pressable>
                  </View>
                </View>

                <NeuroButton title="Войти" onPress={handleLogin} loading={loading} />
              </View>
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
      flex: 1,
      paddingHorizontal: 18,
      paddingTop: 30,
      paddingBottom: 20,
      justifyContent: "space-between"
    },
    titleWrap: {
      alignSelf: "center",
      marginTop: 4
    },
    fields: {
      gap: 14,
      marginTop: 18
    },
    inlineRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: 18
    },
    secondaryLink: {
      fontSize: 16,
      fontStyle: "italic",
      color: palette.inkSoft
    }
  });
