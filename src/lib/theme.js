const THEME_KEY = "ember-bbq-theme";

export function getStoredTheme() {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark") {
      return stored;
    }
  } catch {
    // Ignore storage failures; fall back to the default dark theme.
  }
  return "dark";
}

export function getCurrentTheme() {
  const activeTheme = document.documentElement.getAttribute("data-theme");
  if (activeTheme === "light" || activeTheme === "dark") {
    return activeTheme;
  }
  return getStoredTheme();
}

function setThemeSwitching(active) {
  document.documentElement.classList.toggle("theme-switching", active);
}

export function applyTheme(theme) {
  const resolvedTheme = theme === "light" ? "light" : "dark";
  const root = document.documentElement;

  setThemeSwitching(true);
  root.setAttribute("data-theme", resolvedTheme);
  root.style.colorScheme = resolvedTheme;

  try {
    localStorage.setItem(THEME_KEY, resolvedTheme);
  } catch {
    // Theme still applies for the current session.
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      setThemeSwitching(false);
    });
  });

  return resolvedTheme;
}

export function toggleTheme() {
  const nextTheme = getCurrentTheme() === "dark" ? "light" : "dark";
  return applyTheme(nextTheme);
}