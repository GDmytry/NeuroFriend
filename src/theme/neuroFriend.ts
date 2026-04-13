import { AppTheme } from ".";

export type NeuroPalette = {
  gradientTop: string;
  gradientBottom: string;
  screenOverlay: string;
  panel: string;
  panelMuted: string;
  ink: string;
  inkSoft: string;
  outline: string;
  shadow: string;
  bubbleUser: string;
  bubbleAssistant: string;
  bubbleText: string;
  dimmer: string;
};

export function getNeuroPalette(theme: AppTheme): NeuroPalette {
  if (theme.dark) {
    return {
      gradientTop: "#47301E",
      gradientBottom: "#241117",
      screenOverlay: "rgba(0, 0, 0, 0.18)",
      panel: "#111111",
      panelMuted: "#161616",
      ink: "#FFF7EF",
      inkSoft: "#CABEB0",
      outline: "#F8E9DA",
      shadow: "rgba(0, 0, 0, 0.45)",
      bubbleUser: "#171717",
      bubbleAssistant: "#1C1C1C",
      bubbleText: "#FFF7EF",
      dimmer: "rgba(0, 0, 0, 0.42)"
    };
  }

  return {
    gradientTop: "#FFD261",
    gradientBottom: "#F18BB7",
    screenOverlay: "rgba(255, 255, 255, 0.08)",
    panel: "#FFFFFF",
    panelMuted: "#FFFDF9",
    ink: "#111111",
    inkSoft: "#706860",
    outline: "#111111",
    shadow: "rgba(0, 0, 0, 0.18)",
    bubbleUser: "#FFFFFF",
    bubbleAssistant: "#FFFFFF",
    bubbleText: "#111111",
    dimmer: "rgba(0, 0, 0, 0.16)"
  };
}
