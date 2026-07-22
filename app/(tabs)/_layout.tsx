import React from "react";
import { DynamicColorIOS, Platform } from "react-native";
import { NativeTabs, Icon, Label } from "expo-router/unstable-native-tabs";
import { colors } from "@/ui/theme/colors";

// DynamicColorIOS is iOS-only and throws on other platforms — both branches here already
// resolve to the same plain color, so the dynamic wrapper adds nothing functionally and only
// needs to exist where it's actually supported.
const labelColor = Platform.OS === "ios" ? DynamicColorIOS({ light: colors.faint, dark: colors.faint }) : colors.faint;
const tintColorValue = Platform.OS === "ios" ? DynamicColorIOS({ light: colors.accent, dark: colors.accent }) : colors.accent;

export default function TabsLayout() {
  return (
    <NativeTabs labelStyle={{ color: labelColor }} tintColor={tintColorValue}>
      <NativeTabs.Trigger name="home">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>Home</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="tickets">
        <Icon sf={{ default: "list.bullet.circle", selected: "list.bullet.circle.fill" }} />
        <Label>Jobs</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="roster">
        <Icon sf={{ default: "person.2", selected: "person.2.fill" }} />
        <Label>Crew</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="timesheet">
        <Icon sf={{ default: "clock", selected: "clock.fill" }} />
        <Label>Sheet</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
