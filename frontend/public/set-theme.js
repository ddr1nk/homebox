try {
  const preferences = JSON.parse(localStorage.getItem("homebox/preferences/location")) || {};
  const theme = preferences.theme;
  document.documentElement.setAttribute("data-interface-theme", preferences.interfaceTheme === "modern" ? "modern" : "classic");
  if (theme) {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.classList.add("theme-" + theme);
  }
} catch (e) {
  console.error("Failed to set theme", e);
}
