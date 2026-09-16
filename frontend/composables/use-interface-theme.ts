export function useInterfaceTheme() {
  const preferences = useViewPreferences();
  // Older settings and unknown values always retain the existing interface.
  const interfaceTheme = computed(() => (preferences.value.interfaceTheme === "modern" ? "modern" : "classic"));
  const isModern = computed(() => interfaceTheme.value === "modern");

  return { interfaceTheme, isModern };
}
