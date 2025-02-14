import { useEffect, useState } from "react";

const ThemeToggle = () => {
  const [theme, setTheme] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedTheme = localStorage.getItem("theme");
      const preferredTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";
      const currentTheme = storedTheme || preferredTheme;

      document.documentElement.setAttribute("data-theme", currentTheme);
      setTheme(currentTheme);
    }
  }, []);

  const toggleTheme = () => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const targetTheme = currentTheme === "light" ? "dark" : "light";

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
        {theme === "dark" ? <span>🌙</span> : <span>☀️</span>}
      </span>
    </button>
  );
};

export default ThemeToggle;
