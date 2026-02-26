<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Conversations" icon="i-lucide-message-square">
        <template #right>
          <UColorModeButton />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex h-full">
        <!-- Conversation list -->
        <div class="w-[360px] border-r border-[var(--ui-border)] flex flex-col">
          <div v-if="loading" class="flex-1 flex items-center justify-center">
            <UIcon name="i-lucide-loader-2" class="animate-spin size-5 text-[var(--ui-text-muted)]" />
          </div>

          <div v-else-if="conversations.length === 0" class="flex-1 flex flex-col items-center justify-center gap-2 text-[var(--ui-text-muted)]">
            <UIcon name="i-lucide-inbox" class="size-10" />
            <span class="text-sm">No conversations</span>
          </div>

          <div v-else class="flex-1 overflow-y-auto">
            <NuxtLink
              v-for="conv in conversations"
              :key="conv.id"
              :to="`/conversations/${conv.id}`"
              class="flex items-center gap-3 px-4 py-3 border-b border-[var(--ui-border)] hover:bg-[var(--ui-bg-elevated)] transition-colors"
            >
              <UAvatar :alt="conv.contact?.name || '?'" size="sm" icon="i-lucide-user" />
              <div class="flex-1 min-w-0">
                <div class="font-medium text-sm truncate">{{ conv.contact?.name || conv.contact?.phone || "Unknown" }}</div>
                <div class="flex gap-1.5 mt-1">
                  <UBadge color="info" variant="subtle" size="xs" :icon="channelIcon(conv.channel?.type)">
                    {{ conv.channel?.type }}
                  </UBadge>
                  <UBadge :color="statusColor(conv.status)" variant="subtle" size="xs">
                    {{ conv.status }}
                  </UBadge>
                </div>
              </div>
            </NuxtLink>
          </div>
        </div>

        <!-- Placeholder -->
        <div class="flex-1 flex flex-col items-center justify-center gap-3 text-[var(--ui-text-muted)]">
          <UIcon name="i-lucide-message-circle" class="size-12" />
          <span>Select a conversation</span>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
const { conversations, loading, fetchConversations } = useConversations();
const { on, subscribe } = useWebSocket();

function channelIcon(type?: string) {
  if (type === "whatsapp") return "i-lucide-message-circle";
  if (type === "instagram") return "i-lucide-instagram";
  return "i-lucide-globe";
}

function statusColor(status?: string) {
  if (status === "open") return "success" as const;
  if (status === "pending") return "warning" as const;
  return "neutral" as const;
}

onMounted(() => {
  fetchConversations();
  subscribe("conversations");
  on("conversation:updated", () => fetchConversations());
});
</script>
