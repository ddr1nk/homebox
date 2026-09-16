<script setup lang="ts">
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
  import { Label } from "@/components/ui/label";

  const preferences = useViewPreferences();
  const { interfaceTheme } = useInterfaceTheme();
</script>

<template>
  <div class="mb-6 space-y-2">
    <Label for="interface-theme">{{ $t("profile.interface_theme") }}</Label>
    <Select
      :model-value="interfaceTheme"
      @update:model-value="value => (preferences.interfaceTheme = value === 'modern' ? 'modern' : 'classic')"
    >
      <SelectTrigger id="interface-theme" class="w-full sm:w-72" aria-describedby="interface-theme-description">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="classic">{{ $t("profile.interface_theme_classic") }}</SelectItem>
        <SelectItem value="modern">{{ $t("profile.interface_theme_modern") }}</SelectItem>
      </SelectContent>
    </Select>
    <p id="interface-theme-description" class="text-sm text-muted-foreground">
      {{ $t("profile.interface_theme_description") }}
    </p>
  </div>
</template>
