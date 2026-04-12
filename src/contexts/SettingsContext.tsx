import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";

import { storage } from "../services/storage";
import { AppSettings, ThemePreference } from "../types";
import { AppTheme, getAppTheme } from "../theme";

type SettingsContextValue = {
  isReady: boolean;
  settings: AppSettings;
  themePreference: ThemePreference;
  resolvedTheme: AppTheme["mode"];
  theme: AppTheme;
  setThemePreference: (value: ThemePreference) => Promise<void>;
};

const defaultSettings: AppSettings = {
  themePreference: "system"
};

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function bootstrap() {
      const storedSettings = await storage.getSettings();
      setSettings(storedSettings);
      setIsReady(true);
    }

    bootstrap();
  }, []);

  const resolvedTheme =
    settings.themePreference === "system"
      ? systemScheme === "dark"
        ? "dark"
        : "light"
      : settings.themePreference;

  const theme = useMemo(() => getAppTheme(resolvedTheme), [resolvedTheme]);

  const value = useMemo<SettingsContextValue>(
    () => ({
      isReady,
      settings,
      themePreference: settings.themePreference,
      resolvedTheme,
      theme,
      setThemePreference: async (value) => {
        const nextSettings: AppSettings = {
          ...settings,
          themePreference: value
        };

        setSettings(nextSettings);
        await storage.saveSettings(nextSettings);
      }
    }),
    [isReady, resolvedTheme, settings, theme]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const context = useContext(SettingsContext);

  if (!context) {
    throw new Error("useSettings must be used inside SettingsProvider");
  }

  return context;
}
