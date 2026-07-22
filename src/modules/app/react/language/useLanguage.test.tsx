import React from "react";
import { render, act } from "@testing-library/react-native";
import { Text } from "react-native";
import { DependenciesProvider } from "@app/react/DependenciesProvider";
import { Dependencies } from "@app/dependencies/Dependencies.type";
import { LanguageProvider } from "./LanguageProvider";
import { useLanguage } from "./useLanguage";

class FakeKeyValueStore {
  private map = new Map<string, string>();
  getString(key: string) {
    return this.map.get(key) ?? null;
  }
  setString(key: string, value: string) {
    this.map.set(key, value);
  }
}

function buildTestDeps(keyValueStore: FakeKeyValueStore): Dependencies {
  return { keyValueStore } as unknown as Dependencies;
}

function wrapperWith(keyValueStore: FakeKeyValueStore) {
  return ({ children }: { children: React.ReactNode }) => (
    <DependenciesProvider dependencies={buildTestDeps(keyValueStore)}>
      <LanguageProvider>{children}</LanguageProvider>
    </DependenciesProvider>
  );
}

function Probe() {
  const { language, setLanguage, strings } = useLanguage();
  return (
    <>
      <Text testID="lang">{language}</Text>
      <Text testID="signInTitle">{strings.signIn.title}</Text>
      <Text testID="toEs" onPress={() => setLanguage("ES")}>
        es
      </Text>
    </>
  );
}

describe("LanguageProvider / useLanguage", () => {
  it("defaults to EN", () => {
    const { getByTestId } = render(<Probe />, { wrapper: wrapperWith(new FakeKeyValueStore()) });
    expect(getByTestId("lang").props.children).toBe("EN");
    expect(getByTestId("signInTitle").props.children).toBe("Sign in");
  });

  it("switches to ES when setLanguage is called, and strings switch with it", () => {
    const { getByTestId } = render(<Probe />, { wrapper: wrapperWith(new FakeKeyValueStore()) });
    act(() => {
      getByTestId("toEs").props.onPress();
    });
    expect(getByTestId("lang").props.children).toBe("ES");
    expect(getByTestId("signInTitle").props.children).toBe("Iniciar sesión");
  });

  it("persists the selected language across a simulated app restart", () => {
    const store = new FakeKeyValueStore();
    const first = render(<Probe />, { wrapper: wrapperWith(store) });
    act(() => {
      first.getByTestId("toEs").props.onPress();
    });
    first.unmount();

    const second = render(<Probe />, { wrapper: wrapperWith(store) });
    expect(second.getByTestId("lang").props.children).toBe("ES");
  });
});
