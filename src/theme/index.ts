import { DarkTheme, DefaultTheme, Theme } from "@react-navigation/native";

export type AppThemeMode = "light" | "dark";

export type AppColors = {
  background: string;
  backgroundMuted: string;
  surface: string;
  surfaceElevated: string;
  surfaceMuted: string;
  border: string;
  borderStrong: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  primary: string;
  primarySoft: string;
  primaryContrast: string;
  danger: string;
  dangerSoft: string;
  tabBar: string;
  tabInactive: string;
  inputBackground: string;
  inputPlaceholder: string;
  shadow: string;
};

export type AppTheme = {
  mode: AppThemeMode;
  dark: boolean;
  colors: AppColors;
  navigationTheme: Theme;
  statusBarStyle: "light" | "dark";
};

const lightColors: AppColors = {
  background: "#F5F1E8",
  backgroundMuted: "#ECE5D8",
  surface: "#FFFCF7",
  surfaceElevated: "#FFFFFF",
  surfaceMuted: "#F4EBDD",
  border: "#E4D6C6",
  borderStrong: "#CCB79D",
  text: "#211C17",
  textSecondary: "#6B6257",
  textTertiary: "#8A7F73",
  primary: "#B96D40",
  primarySoft: "#F4E1D0",
  primaryContrast: "#FFF9F2",
  danger: "#B84E3C",
  dangerSoft: "#F7DDD8",
  tabBar: "#FFF8F0",
  tabInactive: "#8F7B69",
  inputBackground: "#FFFDF9",
  inputPlaceholder: "#8A7F73",
  shadow: "rgba(34, 26, 20, 0.08)"
};

const darkColors: AppColors = {
  background: "#12100E",
  backgroundMuted: "#1A1714",
  surface: "#1F1B18",
  surfaceElevated: "#27211D",
  surfaceMuted: "#2D2622",
  border: "#3B322C",
  borderStrong: "#52453B",
  text: "#F6EFE8",
  textSecondary: "#C7B8AA",
  textTertiary: "#9E8E81",
  primary: "#E0A16F",
  primarySoft: "#4A3426",
  primaryContrast: "#1D1209",
  danger: "#E98C7C",
  dangerSoft: "#4D2C27",
  tabBar: "#171310",
  tabInactive: "#8B7C6D",
  inputBackground: "#1A1714",
  inputPlaceholder: "#7E7368",
  shadow: "rgba(0, 0, 0, 0.28)"
};

export function getAppTheme(mode: AppThemeMode): AppTheme {
  const dark = mode === "dark";
  const colors = dark ? darkColors : lightColors;
  const baseTheme = dark ? DarkTheme : DefaultTheme;

  return {
    mode,
    dark,
    colors,
    statusBarStyle: dark ? "light" : "dark",
    navigationTheme: {
      ...baseTheme,
      colors: {
        ...baseTheme.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.surface,
        text: colors.text,
        border: colors.border,
        notification: colors.primary
      }
    }
  };
}
