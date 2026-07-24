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
  plugins: [
    "expo-asset",
    "expo-router",
    "expo-secure-store",
    "expo-video",
    [
      "expo-image-picker",
      {
        cameraPermission: "Elite Mobile uses the camera to attach photos and videos to a ticket.",
        microphonePermission: "Elite Mobile uses the microphone to record audio in ticket videos.",
      },
    ],
    [
      "expo-location",
      {
        locationWhenInUsePermission:
          "Elite Mobile uses your location to confirm punches and track travel/geofence arrival.",
      },
    ],
    "./plugins/withFmtConstevalFix",
    "./plugins/withoutPushEntitlement",
  ],
};

export default config;
