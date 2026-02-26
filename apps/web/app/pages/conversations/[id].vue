<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="currentConversation?.contact?.name || $t('chat.conversation')" icon="i-lucide-message-square">
        <template #right>
          <USelect
            :model-value="currentConversation?.status"
            :items="statusOptions"
            size="sm"
            class="w-32"
            @update:model-value="handleStatusChange"
          />
          <GlobalControls />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex h-full">
        <!-- Sidebar list -->
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

          <div class="flex-1 overflow-y-auto p-1.5 space-y-0.5">
            <!-- Collapsed: only avatars -->
            <template v-if="panelCollapsed">
              <NuxtLink
                v-for="conv in conversations"
                :key="conv.id"
                :to="`/conversations/${conv.id}`"
                class="flex justify-center py-2.5 rounded-lg transition-colors relative"
                :class="conv.id === conversationId
                  ? 'bg-[var(--ui-color-primary-50)] dark:bg-[var(--ui-color-primary-950)]'
                  : 'hover:bg-[var(--ui-bg-elevated)]'"
              >
                <div v-if="conv.id === conversationId" class="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-[var(--ui-color-primary-500)]" />
                <UAvatar :alt="conv.contact?.name || '?'" size="sm" :color="avatarColor(conv.contact?.name || conv.id)" />
              </NuxtLink>
            </template>

            <!-- Expanded: full list -->
            <template v-else>
              <NuxtLink
                v-for="conv in conversations"
                :key="conv.id"
                :to="`/conversations/${conv.id}`"
                class="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors relative"
                :class="conv.id === conversationId
                  ? 'bg-[var(--ui-color-primary-50)] dark:bg-[var(--ui-color-primary-950)]'
                  : 'hover:bg-[var(--ui-bg-elevated)]'"
              >
                <div v-if="conv.id === conversationId" class="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-[var(--ui-color-primary-500)]" />
                <UAvatar :alt="conv.contact?.name || '?'" size="md" :color="avatarColor(conv.contact?.name || conv.id)" />
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between gap-2">
                    <span class="font-medium text-sm truncate">{{ conv.contact?.name || conv.contact?.phone || $t("conversations.unknown") }}</span>
                    <span class="text-[10px] text-[var(--ui-text-dimmed)] shrink-0">{{ timeAgo(conv.lastMessageAt || conv.createdAt) }}</span>
                  </div>
                  <div class="flex items-center justify-between gap-2 mt-1">
                    <span v-if="conv.contact?.phone && conv.contact?.name" class="text-xs text-[var(--ui-text-dimmed)] truncate">{{ conv.contact.phone }}</span>
                    <span v-else class="text-xs text-[var(--ui-text-dimmed)] truncate">{{ conv.channel?.name || conv.channel?.type }}</span>
                    <UBadge :color="statusColor(conv.status)" variant="subtle" size="xs" class="shrink-0">{{ conv.status }}</UBadge>
                  </div>
                </div>
              </NuxtLink>
            </template>
          </div>
        </div>

        <!-- Chat -->
        <div class="flex-1 flex flex-col">
          <div ref="messagesContainer" class="flex-1 overflow-y-auto p-5 space-y-3" @scroll="handleScroll">
            <div v-if="loadingMore" class="flex items-center justify-center py-2">
              <UIcon name="i-lucide-loader-2" class="animate-spin size-4 text-[var(--ui-text-muted)]" />
            </div>

            <div v-if="messagesLoading" class="flex items-center justify-center h-full">
              <UIcon name="i-lucide-loader-2" class="animate-spin size-5 text-[var(--ui-text-muted)]" />
            </div>

            <div v-else-if="messages.length === 0" class="flex flex-col items-center justify-center h-full gap-2 text-[var(--ui-text-muted)]">
              <UIcon name="i-lucide-message-circle" class="size-10" />
              <span class="text-sm">{{ $t("chat.noMessages") }}</span>
            </div>

            <template v-else>
              <div
                v-for="msg in messages"
                :key="msg.id"
                class="flex"
                :class="msg.direction === 'outbound' ? 'justify-end' : 'justify-start'"
              >
                <div
                  class="max-w-[70%] px-4 py-2.5 rounded-2xl text-sm"
                  :class="msg.direction === 'outbound'
                    ? 'bg-[var(--ui-color-primary-500)] text-white rounded-br-md'
                    : 'bg-[var(--ui-bg-elevated)] rounded-bl-md'"
                >
                  <div class="break-words">{{ msg.content }}</div>
                  <div class="text-[10px] mt-1 text-right opacity-60">
                    {{ formatTime(msg.createdAt) }}
                  </div>
                </div>
              </div>
            </template>
          </div>

          <!-- Input -->
          <div class="border-t border-[var(--ui-border)] p-3 flex gap-2">
            <UInput
              v-model="newMessage"
              :placeholder="$t('chat.placeholder')"
              class="flex-1"
              :disabled="sending"
              @keydown.enter.exact.prevent="handleSend"
            />
            <UButton
              icon="i-lucide-send"
              :disabled="!newMessage.trim() || sending"
              :loading="sending"
              @click="handleSend"
            />
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
import type { Serialized, Message } from "@tercela/shared";
import { avatarColor } from "~/utils/avatar";

const route = useRoute();
const { t, locale } = useI18n();
const conversationId = computed(() => route.params.id as string);

const { conversations, fetchConversations, updateConversation } = useConversations();
const panelCollapsed = useCookie<boolean>("conv_panel_collapsed", { default: () => false });
const { messages, loading: messagesLoading, loadingMore, hasMore, fetchMessages, loadMore, sendMessage } = useMessages();
const { on, subscribe, unsubscribe } = useWebSocket();
const toast = useToast();

const newMessage = ref("");
const sending = ref(false);
const messagesContainer = ref<HTMLElement>();

const statusOptions = ["open", "pending", "closed"];

const currentConversation = computed(() =>
  conversations.value.find((c) => c.id === conversationId.value)
);

function formatTime(date: string) {
  return new Date(date).toLocaleTimeString(locale.value, { hour: "2-digit", minute: "2-digit" });
}

function statusColor(status?: string) {
  if (status === "open") return "success" as const;
  if (status === "pending") return "warning" as const;
  return "neutral" as const;
}

function timeAgo(date: string) {
  const now = Date.now();
  const diff = now - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t("time.now");
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(date).toLocaleDateString(locale.value, { day: "numeric", month: "short" });
}

async function handleSend() {
  if (!newMessage.value.trim()) return;
  sending.value = true;
  try {
    await sendMessage(conversationId.value, newMessage.value);
    newMessage.value = "";
    scrollToBottom();
  } catch {
    toast.add({ title: t("chat.sendFailed"), color: "error", icon: "i-lucide-alert-circle" });
  } finally {
    sending.value = false;
  }
}

async function handleStatusChange(status: string) {
  await updateConversation(conversationId.value, { status });
  toast.add({ title: t("chat.statusChanged", { status }), icon: "i-lucide-check", color: "success" });
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
}

async function handleScroll() {
  const el = messagesContainer.value;
  if (!el || el.scrollTop > 100 || !hasMore.value || loadingMore.value) return;

  const prevHeight = el.scrollHeight;
  await loadMore(conversationId.value);
  nextTick(() => {
    if (el) {
      el.scrollTop = el.scrollHeight - prevHeight;
    }
  });
}

watch(conversationId, (id) => {
  if (id) {
    fetchMessages(id);
    subscribe(`conversation:${id}`);
  }
}, { immediate: true });

onMounted(() => {
  fetchConversations();
  on("message:new", (event) => {
    const msg = event.payload as Serialized<Message>;
    if (msg.conversationId === conversationId.value && !messages.value.some((m) => m.id === msg.id)) {
      messages.value.push(msg);
      scrollToBottom();
    }
  });
});

onUnmounted(() => {
  unsubscribe(`conversation:${conversationId.value}`);
});
</script>
