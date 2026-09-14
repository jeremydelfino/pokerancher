import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/**
 * Time-of-day theme. Only the world switches — sky, hills, pen dioramas and the
 * dark UI chrome. The cream panels and ink outlines stay put, the way a game's
 * HUD doesn't change colour when the sun comes up.
 */

export type Theme = "night" | "dawn" | "day";

export const THEMES: readonly Theme[] = ["night", "dawn", "day"];

export const THEME_LABEL: Record<Theme, string> = {
  night: "Nuit",
  dawn: "Lever du soleil",
  day: "Plein soleil",
};

export const THEME_HINT: Record<Theme, string> = {
  night: "Ciel violet, lucioles et étoiles",
  dawn: "Bleu froid en haut, or à l'horizon",
  day: "Bleu clair, prairies vertes et rayons",
};

const STORAGE_KEY = "pokerancher:theme";

interface ThemeValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeValue | null>(null);

function isTheme(value: unknown): value is Theme {
  return THEMES.includes(value as Theme);
}

function readStoredTheme(): Theme {
  // Private browsing can make localStorage throw outright, not just return null.
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isTheme(saved)) return saved;
  } catch {
    /* fall through to the default */
  }
  return "night";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(readStoredTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* the choice just won't survive a reload */
    }
  }, [theme]);

  const value = useMemo(() => ({ theme, setTheme }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used within ThemeProvider");
  return value;
}
