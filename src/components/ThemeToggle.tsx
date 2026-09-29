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

    // The document bootstrap resolves saved/system preferences before paint.
    const initialTheme = document.documentElement.dataset.theme;
    if (initialTheme === THEME_MODE.LIGHT || initialTheme === THEME_MODE.DARK) {
      return initialTheme;
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

    try {
      localStorage.setItem("theme", targetTheme);
    } catch {
      // Theme switching still works when storage is unavailable.
    }
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
