import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";

export type ColorTheme = "emerald" | "indigo" | "rose" | "amber";

export const colorThemes: Array<{
  value: ColorTheme;
  label: string;
  swatch: string;
}> = [
  { value: "emerald", label: "Emerald", swatch: "#059669" },
  { value: "indigo", label: "Indigo", swatch: "#4f46e5" },
  { value: "rose", label: "Rose", swatch: "#e11d48" },
  { value: "amber", label: "Amber", swatch: "#d97706" }
];

type ThemeContextValue = {
  theme: ColorTheme;
  setTheme: (theme: ColorTheme) => void;
  themes: typeof colorThemes;
};

const THEME_STORAGE_KEY = "app_color_theme";
const DEFAULT_THEME: ColorTheme = "emerald";
const colorThemeValues = new Set<ColorTheme>(
  colorThemes.map((theme) => theme.value)
);

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isColorTheme(value: string | null): value is ColorTheme {
  return value !== null && colorThemeValues.has(value as ColorTheme);
}

function getStoredTheme(): ColorTheme {
  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isColorTheme(storedTheme) ? storedTheme : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

function persistTheme(theme: ColorTheme): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Theme selection is still applied for this session when storage is unavailable.
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ColorTheme>(() => getStoredTheme());

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    persistTheme(theme);
  }, [theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme,
      themes: colorThemes
    }),
    [theme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);

  if (!value) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return value;
}
