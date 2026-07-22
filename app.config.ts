import { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "Elite Mobile",
  slug: "elite-mobile",
  scheme: "elitemobile",
  version: "0.1.0",
  orientation: "portrait",
  userInterfaceStyle: "light",
  ios: {
    bundleIdentifier: "com.eliteteams.mobile",
    supportsTablet: false,
    infoPlist: {
      NSLocalNetworkUsageDescription:
        "Elite Mobile connects to your computer's local development server to load the app while developing.",
      NSBonjourServices: ["_dev._tcp"],
    },
  },
  android: {
    package: "com.eliteteams.mobile",
  },
  plugins: ["expo-asset", "expo-router", "expo-secure-store", "./plugins/withFmtConstevalFix"],
};

export default config;
