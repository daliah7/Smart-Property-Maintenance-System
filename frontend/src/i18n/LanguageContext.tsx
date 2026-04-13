import { createContext, useContext, useState, type ReactNode } from "react";
import { translations, type Lang, type TranslationKey } from "./translations";

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey) => string;
  tf: (key: TranslationKey, params: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue>({} as LanguageContextValue);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("de");

  const t = (key: TranslationKey): string => translations[lang][key] as string;

  const tf = (key: TranslationKey, params: Record<string, string | number>): string => {
    let result = t(key);
    for (const [k, v] of Object.entries(params)) {
      result = result.replace(`{${k}}`, String(v));
    }
    return result;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, tf }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
