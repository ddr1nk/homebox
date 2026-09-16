<script lang="ts" setup>
  import { cn } from "~/lib/utils";

  const props = defineProps({
    cmp: {
      type: String,
      default: "div",
    },
    class: {
      type: String,
      default: "",
    },
  });

  const { isModern } = useInterfaceTheme();
  const cmpClass = computed(() =>
    cn("container mx-auto max-w-7xl px-4", isModern.value ? "my-6 sm:my-8 sm:px-6" : "my-4", props.class)
  );
</script>

<template>
  <component :is="cmp" :class="cmpClass">
    <slot />
  </component>
</template>
