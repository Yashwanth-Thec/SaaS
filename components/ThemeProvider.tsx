"use client";
import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";

const ThemeContext = createContext<{
  theme:      Theme;
  toggleTheme: () => void;
}>({
  theme:       "dark",
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");

  // On mount: read saved preference or system preference
  useEffect(() => {
    const saved = localStorage.getItem("theme") as Theme | null;
    const preferred = saved
      ?? (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    applyTheme(preferred);
    setTheme(preferred);
  }, []);

  function applyTheme(t: Theme) {
    const html = document.documentElement;
    if (t === "light") {
      html.classList.add("light");
    } else {
      html.classList.remove("light");
    }
  }

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    applyTheme(next);
    setTheme(next);
    localStorage.setItem("theme", next);
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
