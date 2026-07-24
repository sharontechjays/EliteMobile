import React from "react";
import { Stack, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { DependenciesProvider } from "@app/react/DependenciesProvider";
import { buildDevDependencies } from "@app/dependencies/dependencies.dev";
import { LanguageProvider } from "@app/react/language/LanguageProvider";
import { TimerProvider } from "@app/react/timer/TimerProvider";
import { NotificationsProvider } from "@app/react/notifications/NotificationsProvider";
import { MealReminderProvider } from "@app/react/mealReminders/MealReminderProvider";
import { TopBar } from "@/ui/components/organisms/TopBar";
import { createQueryClient } from "@app/react/queryClient/queryClient";
import { setupOnlineManager } from "@app/react/queryClient/setupOnlineManager";
import { keyValueStoreAsAsyncStorage } from "@app/react/queryClient/KeyValueStoreAsyncStorage";

const dependencies = buildDevDependencies();
const queryClient = createQueryClient();
const queryPersister = createAsyncStoragePersister({
  storage: keyValueStoreAsAsyncStorage(dependencies.keyValueStore),
  key: "reactQuery.cache",
});
setupOnlineManager();

function GlobalChrome() {
  const pathname = usePathname();
  const isSplash = pathname === "/";
  const isSignIn = pathname === "/sign-in";

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="device-registration" />
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="notes" options={{ presentation: "card" }} />
        <Stack.Screen name="ticket-detail" options={{ presentation: "card" }} />
        <Stack.Screen name="travel" options={{ presentation: "card" }} />
        <Stack.Screen name="sync-queue" options={{ presentation: "card" }} />
        <Stack.Screen name="attestation" options={{ presentation: "card" }} />
        <Stack.Screen name="profile" options={{ presentation: "card" }} />
        <Stack.Screen name="api-integration-example" options={{ presentation: "card" }} />
      </Stack>
      {isSplash ? null : <TopBar showSyncPill={!isSignIn} />}
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{ persister: queryPersister }}
          onSuccess={() => {
            // Mutations paused while offline (see queryClient.ts's own note on
            // networkMode: "online") are restored from the persisted cache in a paused
            // state, but restoring them doesn't automatically retry them — this explicitly
            // resumes any that are still pending once the cache has been rehydrated,
            // covering the case where the app was killed while offline with a queued
            // mutation and only reopened after connectivity came back.
            queryClient.resumePausedMutations();
          }}
        >
          <DependenciesProvider dependencies={dependencies}>
            <LanguageProvider>
              <TimerProvider>
                <NotificationsProvider>
                  <MealReminderProvider>
                    <StatusBar style="dark" />
                    <GlobalChrome />
                  </MealReminderProvider>
                </NotificationsProvider>
              </TimerProvider>
            </LanguageProvider>
          </DependenciesProvider>
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
