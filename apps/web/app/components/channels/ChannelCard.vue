<template>
  <div
    class="group relative flex flex-col rounded-xl border border-[var(--ui-border)] bg-[var(--ui-bg)] p-5 transition-all hover:shadow-md cursor-pointer"
    :class="ringClass"
    @click="$emit('navigate', channel)"
  >
    <!-- Header row: icon + name + health dot -->
    <div class="flex items-start gap-3">
      <div class="flex items-center justify-center size-10 rounded-lg shrink-0" :class="iconBgClass">
        <IconsIconWhatsApp v-if="channel.type === 'whatsapp'" class="size-5" :class="iconColorClass" />
        <IconsIconInstagram v-else-if="channel.type === 'instagram'" class="size-5" :class="iconColorClass" />
        <IconsIconWebchat v-else class="size-5" :class="iconColorClass" />
      </div>
      <div class="flex-1 min-w-0">
        <h3 class="text-sm font-semibold text-[var(--ui-text)] truncate">{{ channel.name }}</h3>
        <p v-if="verifiedName" class="text-xs text-[var(--ui-text-dimmed)] truncate">{{ verifiedName }}</p>
      </div>
      <UTooltip v-if="channel.type === 'whatsapp'" :text="healthTooltip">
        <span class="inline-block size-2.5 rounded-full shrink-0 mt-1.5" :class="healthDotClass" />
      </UTooltip>
    </div>

    <!-- Details -->
    <div class="mt-4 space-y-1.5 text-xs text-[var(--ui-text-muted)]">
      <div v-if="displayPhone" class="flex items-center gap-2">
        <UIcon name="i-lucide-phone" class="size-3.5 shrink-0" />
        <span class="truncate">{{ phoneWithFlag(displayPhone) }}</span>
      </div>
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-radio" class="size-3.5 shrink-0" />
        <UBadge :color="badgeColor" variant="subtle" size="xs">{{ channel.type }}</UBadge>
      </div>
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-calendar" class="size-3.5 shrink-0" />
        <span>{{ timeAgo(channel.createdAt) }}</span>
      </div>
    </div>

    <!-- Footer: toggle + delete -->
    <div class="mt-4 pt-3 border-t border-[var(--ui-border)] flex items-center justify-between" @click.stop>
      <div class="flex items-center gap-2">
        <USwitch
          :model-value="channel.isActive"
          :loading="toggling"
          size="sm"
          @update:model-value="$emit('toggle', channel)"
        />
        <span class="text-xs" :class="channel.isActive ? 'text-[var(--color-success)]' : 'text-[var(--ui-text-dimmed)]'">
          {{ channel.isActive ? $t('channels.active') : $t('channels.inactive') }}
        </span>
      </div>
      <UButton
        icon="i-lucide-trash-2"
        color="error"
        variant="ghost"
        size="xs"
        class="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
        @click="$emit('delete', channel)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ChannelListItem } from "~/types/api";
import { phoneWithFlag } from "~/utils/phone";
import { timeAgo } from "~/utils/time";

const props = defineProps<{
  channel: ChannelListItem;
  toggling: boolean;
  healthDotClass: string;
  healthTooltip: string;
}>();

defineEmits<{
  navigate: [channel: ChannelListItem];
  toggle: [channel: ChannelListItem];
  delete: [channel: ChannelListItem];
}>();

const displayPhone = computed(() => {
  return (props.channel.config as Record<string, string>)?.displayPhoneNumber || "";
});

const verifiedName = computed(() => {
  return (props.channel.config as Record<string, string>)?.verifiedName || "";
});

const styleMap: Record<string, { ring: string; bg: string; color: string; badge: "success" | "error" | "info" }> = {
  whatsapp: {
    ring: "hover:ring-2 hover:ring-green-500/20",
    bg: "bg-green-500/10",
    color: "text-green-600 dark:text-green-400",
    badge: "success",
  },
  instagram: {
    ring: "hover:ring-2 hover:ring-pink-500/20",
    bg: "bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-orange-500/10",
    color: "text-pink-600 dark:text-pink-400",
    badge: "error",
  },
  webchat: {
    ring: "hover:ring-2 hover:ring-blue-500/20",
    bg: "bg-blue-500/10",
    color: "text-blue-600 dark:text-blue-400",
    badge: "info",
  },
};

const defaults = styleMap.webchat;
const styles = computed(() => styleMap[props.channel.type] || defaults);

const ringClass = computed(() => styles.value.ring);
const iconBgClass = computed(() => styles.value.bg);
const iconColorClass = computed(() => styles.value.color);
const badgeColor = computed(() => styles.value.badge);
</script>
