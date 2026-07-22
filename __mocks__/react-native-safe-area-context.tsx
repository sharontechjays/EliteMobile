// Manual Jest mock for react-native-safe-area-context.
//
// The package ships its own official test mock at `react-native-safe-area-context/jest/mock.tsx`,
// but it's a single `export default {...}` object. Wiring that up via `moduleNameMapper` (so it
// replaces the whole package for every test, without each test file needing its own
// `jest.mock(...)` call) breaks Babel's named-import interop: consumers write
// `import { useSafeAreaInsets } from "react-native-safe-area-context"`, which compiles to a
// property read on the module namespace, not on its `.default`. This file re-implements the same
// fallback behavior as the library's mock (zeroed insets/frame, usable with or without a
// `<SafeAreaProvider>` ancestor) as plain named exports so that interop resolves correctly.
import React, { createContext, useContext } from "react";
import { View, ViewProps } from "react-native";
import type { EdgeInsets, Metrics, Rect } from "react-native-safe-area-context";

const MOCK_INSETS: EdgeInsets = { top: 0, left: 0, right: 0, bottom: 0 };
const MOCK_FRAME: Rect = { x: 0, y: 0, width: 320, height: 640 };
const MOCK_METRICS: Metrics = { insets: MOCK_INSETS, frame: MOCK_FRAME };

export const SafeAreaInsetsContext = createContext<EdgeInsets | null>(MOCK_INSETS);
export const SafeAreaFrameContext = createContext<Rect | null>(MOCK_FRAME);

export const initialWindowMetrics = MOCK_METRICS;

export function useSafeAreaInsets(): EdgeInsets {
  return useContext(SafeAreaInsetsContext) ?? MOCK_INSETS;
}

export function useSafeAreaFrame(): Rect {
  return useContext(SafeAreaFrameContext) ?? MOCK_FRAME;
}

interface SafeAreaProviderProps {
  children?: React.ReactNode;
  initialMetrics?: Metrics | null;
}

export function SafeAreaProvider({ children, initialMetrics }: SafeAreaProviderProps) {
  return (
    <SafeAreaFrameContext.Provider value={initialMetrics?.frame ?? MOCK_FRAME}>
      <SafeAreaInsetsContext.Provider value={initialMetrics?.insets ?? MOCK_INSETS}>
        {children}
      </SafeAreaInsetsContext.Provider>
    </SafeAreaFrameContext.Provider>
  );
}

export function SafeAreaConsumer({ children }: { children: (insets: EdgeInsets) => React.ReactNode }) {
  return <>{children(useSafeAreaInsets())}</>;
}

export function SafeAreaView({ children, ...rest }: ViewProps) {
  return <View {...rest}>{children}</View>;
}
