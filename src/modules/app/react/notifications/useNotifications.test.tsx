import React from "react";
import { render, act } from "@testing-library/react-native";
import { Text } from "react-native";
import { NotificationsProvider } from "./NotificationsProvider";
import { useNotifications } from "./useNotifications";

function Probe() {
  const { log, push } = useNotifications();
  return (
    <>
      <Text testID="count">{log.length}</Text>
      <Text testID="pushBtn" onPress={() => push({ icon: "✓", title: "Synced", body: "All caught up" })}>
        push
      </Text>
    </>
  );
}

describe("NotificationsProvider / useNotifications", () => {
  it("starts with an empty log and grows on push", () => {
    const { getByTestId } = render(
      <NotificationsProvider>
        <Probe />
      </NotificationsProvider>
    );
    expect(getByTestId("count").props.children).toBe(0);

    act(() => {
      getByTestId("pushBtn").props.onPress();
    });

    expect(getByTestId("count").props.children).toBe(1);
  });
});
