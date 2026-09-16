import { useEffect, useState } from "react";

const THEME_MODE = {
  LIGHT: "light",
  DARK: "dark",
} as const;

type ThemeMode = (typeof THEME_MODE)[keyof typeof THEME_MODE];

const ThemeToggle = () => {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") {
      return THEME_MODE.LIGHT;
    }

    const storedTheme = localStorage.getItem("theme");
    if (storedTheme === THEME_MODE.LIGHT || storedTheme === THEME_MODE.DARK) {
      return storedTheme;
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? THEME_MODE.DARK
      : THEME_MODE.LIGHT;
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    const targetTheme =
      theme === THEME_MODE.LIGHT ? THEME_MODE.DARK : THEME_MODE.LIGHT;

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
