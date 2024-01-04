import { useEffect, useState } from "react";

const ThemeToggle = () => {
  const [theme, setTheme] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const currentTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";
      document.documentElement.setAttribute("data-theme", currentTheme);
      setTheme(currentTheme);
    }
  }, []);

  const toggleTheme = () => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    let targetTheme = "light";

    if (currentTheme === "light") {
      targetTheme = "dark";
    }

    document.documentElement.setAttribute("data-theme", targetTheme);
    localStorage.setItem("theme", targetTheme);
    setTheme(targetTheme);
  };

  return (
    <button
      className="toggle"
      type="button"
      onClick={() => toggleTheme()}
      title={`Switch between light and dark mode (currently ${theme} mode)`}
    >
      <span className="toggleIcon">
        {theme === "dark" ? <span>🌙</span> : <span>☀️</span>}
      </span>
    </button>
  );
};

export default ThemeToggle;
