<template>
  <h3 class="mb-3 flex items-center gap-2 text-lg" :class="isModern ? 'font-semibold tracking-tight' : 'pl-1'">
    <slot />
  </h3>
</template>

<script setup lang="ts">
  const { isModern } = useInterfaceTheme();
</script>
