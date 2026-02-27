<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="$t('conversations.title')" icon="i-lucide-message-square">
        <template #right>
          <GlobalControls />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex h-full">
        <!-- Conversation list -->
        <div
          class="border-r border-[var(--ui-border)] flex flex-col shrink-0 transition-all duration-200"
          :class="panelCollapsed ? 'w-[52px]' : 'w-[360px]'"
        >
          <!-- Panel header -->
          <div class="h-10 flex items-center shrink-0 border-b border-[var(--ui-border)]" :class="panelCollapsed ? 'justify-center px-1' : 'justify-between pl-3 pr-1'">
            <span v-if="!panelCollapsed" class="text-xs font-medium text-[var(--ui-text-dimmed)] truncate">{{ $t('conversations.title') }}</span>
            <UButton
              :icon="panelCollapsed ? 'i-lucide-chevrons-right' : 'i-lucide-chevrons-left'"
              variant="ghost"
              color="neutral"
              size="xs"
              @click="panelCollapsed = !panelCollapsed"
            />
          </div>

          <!-- Collapsed: only avatars -->
          <div v-if="panelCollapsed" class="flex-1 overflow-y-auto p-1.5 space-y-0.5">
            <NuxtLink
              v-for="conv in conversations"
              :key="conv.id"
              :to="`/conversations/${conv.id}`"
              class="flex justify-center py-2.5 rounded-lg transition-colors hover:bg-[var(--ui-bg-elevated)]"
            >
              <div class="relative">
                <UAvatar :alt="conv.contact?.name || '?'" size="sm" :color="avatarColor(conv.contact?.name || conv.id)" />
                <span
                  v-if="conv.unreadCount > 0"
                  class="absolute -top-1 -right-1 size-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold leading-none"
                >{{ conv.unreadCount > 9 ? '9+' : conv.unreadCount }}</span>
              </div>
            </NuxtLink>
          </div>

          <!-- Expanded: full list -->
          <template v-else>
            <div v-if="loading" class="flex-1 flex items-center justify-center">
              <UIcon name="i-lucide-loader-2" class="animate-spin size-5 text-[var(--ui-text-muted)]" />
            </div>

            <div v-else-if="conversations.length === 0" class="flex-1 flex flex-col items-center justify-center gap-2 text-[var(--ui-text-muted)]">
              <UIcon name="i-lucide-inbox" class="size-10" />
              <span class="text-sm">{{ $t("conversations.empty") }}</span>
            </div>

            <div v-else ref="convListEl" class="flex-1 overflow-y-auto p-1.5 space-y-0.5" @scroll="handleConvScroll">
              <NuxtLink
                v-for="conv in conversations"
                :key="conv.id"
                :to="`/conversations/${conv.id}`"
                class="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors hover:bg-[var(--ui-bg-elevated)]"
              >
                <UAvatar :alt="conv.contact?.name || '?'" size="md" :color="avatarColor(conv.contact?.name || conv.id)" />
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between gap-2">
                    <span class="font-medium text-sm truncate">{{ conv.contact?.name || (conv.contact?.phone ? phoneWithFlag(conv.contact.phone) : $t("conversations.unknown")) }}</span>
                    <div class="flex items-center gap-1.5 shrink-0">
                      <span class="text-[10px] text-[var(--ui-text-dimmed)]">{{ timeAgo(conv.lastMessageAt || conv.createdAt, locale) }}</span>
                      <span
                        v-if="conv.unreadCount > 0"
                        class="min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none px-1"
                      >{{ conv.unreadCount }}</span>
                    </div>
                  </div>
                  <div class="flex items-center justify-between gap-2 mt-1">
                    <span v-if="conv.contact?.phone && conv.contact?.name" class="text-xs text-[var(--ui-text-dimmed)] truncate">{{ phoneWithFlag(conv.contact.phone) }}</span>
                    <span v-else class="text-xs text-[var(--ui-text-dimmed)] truncate">{{ conv.channel?.name || conv.channel?.type }}</span>
                    <UBadge :color="statusColor(conv.status)" variant="subtle" size="xs" class="shrink-0">{{ conv.status }}</UBadge>
                  </div>
                </div>
              </NuxtLink>
              <div v-if="loadingMore" class="flex items-center justify-center py-3">
                <UIcon name="i-lucide-loader-2" class="animate-spin size-4 text-[var(--ui-text-muted)]" />
              </div>
            </div>
          </template>
        </div>

        <!-- Placeholder -->
        <div class="flex-1 flex flex-col items-center justify-center gap-3 text-[var(--ui-text-muted)]">
          <UIcon name="i-lucide-message-circle" class="size-12" />
          <span>{{ $t("conversations.select") }}</span>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
import type { Serialized, Message } from "@tercela/shared";
import { avatarColor } from "~/utils/avatar";
import { timeAgo } from "~/utils/time";
import { phoneWithFlag } from "~/utils/phone";

const { locale } = useI18n();
const { conversations, loading, loadingMore, hasMore, fetchConversations, loadMore } = useConversations();
const { on, subscribe } = useWebSocket();
const panelCollapsed = useCookie<boolean>("conv_panel_collapsed", { default: () => false });
const convListEl = ref<HTMLElement>();

function statusColor(status?: string) {
  if (status === "open") return "success" as const;
  if (status === "pending") return "warning" as const;
  return "neutral" as const;
}

function handleConvScroll() {
  const el = convListEl.value;
  if (!el || !hasMore.value || loadingMore.value) return;
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) {
    loadMore();
  }
}

onMounted(() => {
  fetchConversations();
  subscribe("conversations");
  on("conversation:updated", () => fetchConversations());
  on("message:new", (event) => {
    const msg = event.payload as Serialized<Message>;
    if (msg.direction === "inbound") {
      const conv = conversations.value.find((c) => c.id === msg.conversationId);
      if (conv) conv.unreadCount = (conv.unreadCount ?? 0) + 1;
    }
  });
  on("unread:updated", () => fetchConversations());
});
</script>
