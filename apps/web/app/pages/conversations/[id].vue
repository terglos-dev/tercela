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
        <div class="w-[360px] border-r border-[var(--ui-border)] flex flex-col">
          <div class="flex-1 overflow-y-auto">
            <NuxtLink
              v-for="conv in conversations"
              :key="conv.id"
              :to="`/conversations/${conv.id}`"
              class="flex items-center gap-3 px-4 py-3 border-b border-[var(--ui-border)] transition-colors"
              :class="conv.id === conversationId ? 'bg-[var(--ui-bg-elevated)]' : 'hover:bg-[var(--ui-bg-elevated)]/50'"
            >
              <UAvatar :alt="conv.contact?.name || '?'" size="sm" icon="i-lucide-user" />
              <div class="flex-1 min-w-0">
                <div class="font-medium text-sm truncate">{{ conv.contact?.name || conv.contact?.phone || $t("conversations.unknown") }}</div>
                <div class="flex gap-1.5 mt-1">
                  <UBadge color="info" variant="subtle" size="xs">{{ conv.channel?.type }}</UBadge>
                </div>
              </div>
            </NuxtLink>
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

const route = useRoute();
const { t, locale } = useI18n();
const conversationId = computed(() => route.params.id as string);

const { conversations, fetchConversations, updateConversation } = useConversations();
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
