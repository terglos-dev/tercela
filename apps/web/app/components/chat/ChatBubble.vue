<template>
  <div
    class="flex"
    :class="direction === 'outbound' ? 'justify-end' : 'justify-start'"
  >
    <div
      class="max-w-[70%] px-4 py-2.5 rounded-2xl text-sm"
      :class="direction === 'outbound'
        ? 'bg-[var(--ui-color-primary-500)] text-white rounded-br-md'
        : 'bg-[var(--ui-bg-elevated)] rounded-bl-md'"
    >
      <div class="break-words">{{ content }}</div>
      <div class="text-[10px] mt-1 text-right opacity-60">{{ formattedTime }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  content: string;
  direction: "inbound" | "outbound";
  createdAt: string;
}>();

const { locale } = useI18n();

const formattedTime = computed(() =>
  new Date(props.createdAt).toLocaleTimeString(locale.value, { hour: "2-digit", minute: "2-digit" })
);
</script>
