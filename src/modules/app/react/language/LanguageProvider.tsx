import React, { createContext, useState } from "react";
import { useDependencies } from "@app/react/useDependencies";
import { Translations } from "./translations/Translations.type";
import { en } from "./translations/en";
import { es } from "./translations/es";

export type Language = "EN" | "ES";

export interface LanguageContextValue {
  language: Language;
  setLanguage(lang: Language): void;
  strings: Translations;
}

export const LanguageContext = createContext<LanguageContextValue | null>(null);

const DICTIONARIES: Record<Language, Translations> = { EN: en, ES: es };
const LANGUAGE_STORAGE_KEY = "language.selected";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { keyValueStore } = useDependencies();
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = keyValueStore.getString(LANGUAGE_STORAGE_KEY);
    return stored === "EN" || stored === "ES" ? stored : "EN";
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    keyValueStore.setString(LANGUAGE_STORAGE_KEY, lang);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, strings: DICTIONARIES[language] }}>
      {children}
    </LanguageContext.Provider>
  );
}
