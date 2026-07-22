import { Platform } from "react-native";

// "SF Pro Display" / "Barlow Semi Condensed" on iOS system font stack; Roboto on Android.
export const fontDisplay = Platform.select({
  ios: "System",
  android: "sans-serif-condensed-medium",
  default: "System",
});

export const fontText = Platform.select({
  ios: "System",
  android: "sans-serif",
  default: "System",
});

export const fontMono = Platform.select({
  ios: "Menlo",
  android: "monospace",
  default: "monospace",
});

export const typography = {
  brandTitle: { fontFamily: fontDisplay, fontSize: 19, fontWeight: "800" as const, letterSpacing: 3 },
  brandSubtitle: { fontFamily: fontText, fontSize: 11.5, fontWeight: "600" as const, letterSpacing: 0.9 },
  largeDate: { fontFamily: fontDisplay, fontSize: 26, fontWeight: "800" as const },
  cardTitle: { fontFamily: fontText, fontSize: 14, fontWeight: "700" as const },
  body: { fontFamily: fontText, fontSize: 12.5, fontWeight: "500" as const },
  caption: { fontFamily: fontText, fontSize: 11.5, fontWeight: "600" as const },
  sectionLabel: { fontFamily: fontText, fontSize: 10.5, fontWeight: "800" as const, letterSpacing: 1.3 },
  buttonLabel: { fontFamily: fontDisplay, fontSize: 15, fontWeight: "800" as const, letterSpacing: 0.9 },
  buttonLabelSm: { fontFamily: fontDisplay, fontSize: 14, fontWeight: "800" as const, letterSpacing: 0.8 },
  tabLabel: { fontFamily: fontText, fontSize: 10.5, fontWeight: "700" as const, letterSpacing: 0.5 },
  monoTime: { fontFamily: fontMono, fontSize: 13, fontWeight: "600" as const },
};
