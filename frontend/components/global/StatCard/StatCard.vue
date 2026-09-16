<template>
  <Card
    class="flex flex-col"
    :class="
      isModern
        ? 'gap-3 bg-card p-5 text-card-foreground'
        : 'items-center bg-secondary p-3 text-secondary-foreground shadow'
    "
  >
    <CardHeader class="p-0">
      <CardTitle class="text-sm font-medium" :class="{ 'text-muted-foreground': isModern }">{{ title }}</CardTitle>
    </CardHeader>
    <CardContent class="p-0" :class="isModern ? 'text-3xl font-semibold tracking-tight' : 'text-2xl font-bold'">
      <Currency v-if="type === 'currency'" :amount="value" />
      <template v-if="type === 'number'">{{ value }}</template>
    </CardContent>
    <CardFooter v-if="subtitle">{{ subtitle }}</CardFooter>
  </Card>
</template>

<script setup lang="ts">
  import Currency from "../Currency.vue";
  import type { StatsFormat } from "./types";
  import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
  const { isModern } = useInterfaceTheme();

  type Props = {
    title: string;
    value: number;
    subtitle?: string;
    type?: StatsFormat;
  };

  withDefaults(defineProps<Props>(), {
    type: "number",
    subtitle: undefined,
  });
</script>

<style></style>
