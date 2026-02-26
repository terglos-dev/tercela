<template>
  <div class="flex items-center gap-3 px-4 py-3 border-b border-[var(--ui-border)]">
    <UAvatar :alt="name || '?'" size="sm" icon="i-lucide-user" />
    <div class="flex-1 min-w-0">
      <div class="font-medium text-sm truncate">{{ name || "Desconhecido" }}</div>
      <div class="text-xs text-[var(--ui-text-muted)]">{{ phone || "—" }}</div>
    </div>
    <UBadge color="info" variant="subtle" size="xs">{{ channelType }}</UBadge>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  name: string | null;
  phone: string | null;
  channelType: string;
}>();
</script>
