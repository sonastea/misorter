import { useEffect, useEffectEvent, useState } from "react";

const THEME_MODE = {
  LIGHT: "light",
  DARK: "dark",
} as const;

type ThemeMode = (typeof THEME_MODE)[keyof typeof THEME_MODE];

const ThemeToggle = () => {
  const [theme, setTheme] = useState<ThemeMode | "">("");
  const onUpdatingTheme = useEffectEvent((_theme: ThemeMode) => {
    setTheme(_theme);
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedTheme = localStorage.getItem("theme");
      const preferredTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? THEME_MODE.DARK
        : THEME_MODE.LIGHT;
      const currentTheme = (storedTheme as ThemeMode) || preferredTheme;

      document.documentElement.setAttribute("data-theme", currentTheme);
      onUpdatingTheme(currentTheme);
    }
  }, []);

  const toggleTheme = () => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const targetTheme =
      currentTheme === THEME_MODE.LIGHT ? THEME_MODE.DARK : THEME_MODE.LIGHT;

    document.documentElement.setAttribute("data-theme", targetTheme);
    localStorage.setItem("theme", targetTheme);
    setTheme(targetTheme);
  };

  return (
    <button
      className="toggle group"
      type="button"
      onClick={() => toggleTheme()}
      title={`Switch between light and dark mode (currently ${theme} mode)`}
    >
      <span className="toggleIcon group-hover:bg-once-hover">
        {theme === THEME_MODE.DARK ? <span>🌙</span> : <span>☀️</span>}
      </span>
    </button>
  );
};

export default ThemeToggle;
