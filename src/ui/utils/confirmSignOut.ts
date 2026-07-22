import { Alert } from "react-native";

interface ConfirmSignOutStrings {
  title: string;
  body: string;
  cancel: string;
  destructive: string;
}

// A plain utility function (not a hook/component), so it can't call useLanguage() itself —
// the caller passes the already-resolved strings for the current language.
export function confirmSignOut(onConfirm: () => void, strings: ConfirmSignOutStrings) {
  Alert.alert(strings.title, strings.body, [
    { text: strings.cancel, style: "cancel" },
    { text: strings.destructive, style: "destructive", onPress: onConfirm },
  ]);
}
