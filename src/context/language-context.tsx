"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { translations, type Locale, type TranslationKey } from "@/lib/i18n";

interface LanguageContextType {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  locale: "tr",
  setLocale: () => {},
  t: (key) => translations.tr[key],
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("tr");

  useEffect(() => {
    const saved = localStorage.getItem("carstrack:locale");
    const validLocale = saved === "tr" || saved === "en" ? saved : null;
    if (validLocale) {
      // Read external storage on mount — legitimate use of setState in effect
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocaleState(validLocale);
    }
  }, []);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    localStorage.setItem("carstrack:locale", l);
  };

  const t = (key: TranslationKey): string => translations[locale][key];

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
