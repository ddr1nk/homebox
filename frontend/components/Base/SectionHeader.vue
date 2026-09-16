<template>
  <div :class="isModern ? 'space-y-2' : 'pb-3'">
    <CardTitle class="flex items-center" :class="{ 'text-lg leading-6': isModern }">
      <slot />
    </CardTitle>
    <slot name="subtitle" />
    <CardDescription v-if="$slots.description">
      <slot name="description" />
    </CardDescription>
    <div v-if="$slots.after">
      <slot name="after" />
    </div>
  </div>
</template>

<script lang="ts" setup>
  import { CardDescription, CardTitle } from "@/components/ui/card";
  const { isModern } = useInterfaceTheme();
</script>
