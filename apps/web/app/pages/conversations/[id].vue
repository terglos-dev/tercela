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
                    <span class="font-medium text-sm truncate">{{ conv.contact?.name || (conv.contact?.phone ? phoneWithFlag(conv.contact.phone) : $t("conversations.unknown")) }}</span>
                    <span class="text-[10px] text-[var(--ui-text-dimmed)] shrink-0">{{ timeAgo(conv.lastMessageAt || conv.createdAt, locale) }}</span>
                  </div>
                  <div class="flex items-center justify-between gap-2 mt-1">
                    <span v-if="conv.contact?.phone && conv.contact?.name" class="text-xs text-[var(--ui-text-dimmed)] truncate">{{ phoneWithFlag(conv.contact.phone) }}</span>
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
                  <!-- Message content by type -->
                  <div class="break-words">
                    <template v-if="msg.type === 'text'">{{ msg.content }}</template>
                    <template v-else-if="msg.type === 'reaction'">
                      <span class="text-2xl">{{ parseReaction(msg.content) }}</span>
                    </template>
                    <template v-else-if="msg.type === 'interactive' || msg.type === 'button'">
                      {{ parseInteractive(msg.content) }}
                    </template>
                    <template v-else-if="msg.type === 'location'">
                      <span class="flex items-center gap-1">
                        <UIcon name="i-lucide-map-pin" class="size-3.5 shrink-0" />
                        {{ parseLocation(msg.content) }}
                      </span>
                    </template>
                    <template v-else-if="msg.type === 'image' && msgMediaUrl(msg)">
                      <img
                        :src="msgMediaUrl(msg)!"
                        :alt="getMediaMeta(msg)?.caption || $t('chat.type.image')"
                        class="max-w-full rounded-lg cursor-pointer"
                        loading="lazy"
                      />
                      <p v-if="getMediaMeta(msg)?.caption" class="mt-1 text-sm">{{ getMediaMeta(msg)!.caption }}</p>
                    </template>
                    <template v-else-if="msg.type === 'sticker' && msgMediaUrl(msg)">
                      <img
                        :src="msgMediaUrl(msg)!"
                        alt="Sticker"
                        class="max-w-[150px] rounded"
                        loading="lazy"
                      />
                    </template>
                    <template v-else-if="msg.type === 'audio' && msgMediaUrl(msg)">
                      <audio controls preload="none" class="max-w-full">
                        <source :src="msgMediaUrl(msg)!" :type="getMediaMeta(msg)?.mimeType" />
                      </audio>
                    </template>
                    <template v-else-if="msg.type === 'video' && msgMediaUrl(msg)">
                      <video controls preload="none" class="max-w-full rounded-lg">
                        <source :src="msgMediaUrl(msg)!" :type="getMediaMeta(msg)?.mimeType" />
                      </video>
                      <p v-if="getMediaMeta(msg)?.caption" class="mt-1 text-sm">{{ getMediaMeta(msg)!.caption }}</p>
                    </template>
                    <template v-else-if="msg.type === 'document' && msgMediaUrl(msg)">
                      <a
                        :href="msgMediaUrl(msg)!"
                        target="_blank"
                        class="flex items-center gap-2 py-1 underline-offset-2 hover:underline"
                      >
                        <UIcon name="i-lucide-file-text" class="size-5 shrink-0" />
                        <span class="flex-1 min-w-0 truncate">{{ getMediaMeta(msg)?.filename || $t('chat.type.document') }}</span>
                        <span v-if="getMediaMeta(msg)?.size" class="text-xs opacity-60 shrink-0">{{ formatFileSize(getMediaMeta(msg)!.size!) }}</span>
                      </a>
                      <p v-if="getMediaMeta(msg)?.caption" class="mt-1 text-sm">{{ getMediaMeta(msg)!.caption }}</p>
                    </template>
                    <template v-else>
                      <span class="flex items-center gap-1">
                        <UIcon :name="messageTypeIcon(msg.type)" class="size-3.5 shrink-0" />
                        {{ $t(`chat.type.${msg.type}`, msg.type) }}
                      </span>
                    </template>
                  </div>
                  <div class="flex items-center justify-end gap-1 mt-1">
                    <span class="text-[10px] opacity-60">{{ formatTime(msg.createdAt) }}</span>
                    <!-- Status indicator for outbound messages -->
                    <template v-if="msg.direction === 'outbound'">
                      <UIcon
                        v-if="msg.status === 'failed'"
                        name="i-lucide-x"
                        class="size-3.5 text-red-400"
                        :title="$t('chat.status.failed')"
                      />
                      <UIcon
                        v-else-if="msg.status === 'read'"
                        name="i-lucide-check-check"
                        class="size-3.5 text-blue-400"
                        :title="$t('chat.status.read')"
                      />
                      <UIcon
                        v-else-if="msg.status === 'delivered'"
                        name="i-lucide-check-check"
                        class="size-3.5 opacity-60"
                        :title="$t('chat.status.delivered')"
                      />
                      <UIcon
                        v-else
                        name="i-lucide-check"
                        class="size-3.5 opacity-60"
                        :title="$t('chat.status.sent')"
                      />
                    </template>
                  </div>
                </div>
              </div>
            </template>
          </div>

          <!-- Input -->
          <div class="border-t border-[var(--ui-border)] p-3 flex gap-2">
            <input ref="fileInput" type="file" class="hidden" @change="handleFileSelect" />
            <UButton
              icon="i-lucide-paperclip"
              variant="ghost"
              color="neutral"
              :disabled="uploading"
              :loading="uploading"
              :title="$t('chat.attach')"
              @click="triggerFileSelect"
            />
            <UInput
              v-model="newMessage"
              :placeholder="$t('chat.placeholder')"
              class="flex-1"
              :disabled="sending || uploading"
              @keydown.enter.exact.prevent="handleSend"
            />
            <UButton
              icon="i-lucide-send"
              :disabled="!newMessage.trim() || sending || uploading"
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
import type { Serialized, Message, MessageStatus } from "@tercela/shared";
import { avatarColor } from "~/utils/avatar";
import { timeAgo } from "~/utils/time";
import { phoneWithFlag } from "~/utils/phone";
import { resolveMediaUrl, getMediaMeta, formatFileSize } from "~/utils/media";

const route = useRoute();
const config = useRuntimeConfig();
const { t, locale } = useI18n();
const conversationId = computed(() => route.params.id as string);
const token = useCookie("auth_token");

const { conversations, fetchConversations, updateConversation } = useConversations();
const panelCollapsed = useCookie<boolean>("conv_panel_collapsed", { default: () => false });
const { messages, loading: messagesLoading, loadingMore, hasMore, fetchMessages, loadMore, sendMessage, uploadAndSendMedia } = useMessages();
const { on, subscribe, unsubscribe } = useWebSocket();
const toast = useToast();

const newMessage = ref("");
const sending = ref(false);
const uploading = ref(false);
const messagesContainer = ref<HTMLElement>();
const fileInput = ref<HTMLInputElement>();

function msgMediaUrl(msg: { media?: { id: string } | null; content: string }): string | null {
  return resolveMediaUrl(msg, config.public.apiBase as string, token.value || "");
}

const statusOptions = ["open", "pending", "closed"];

const currentConversation = computed(() =>
  conversations.value.find((c) => c.id === conversationId.value)
);

function formatTime(date: string) {
  return new Date(date).toLocaleTimeString(locale.value, { hour: "2-digit", minute: "2-digit" });
}

function messageTypeIcon(type: string) {
  const icons: Record<string, string> = {
    image: "i-lucide-image",
    audio: "i-lucide-headphones",
    video: "i-lucide-video",
    document: "i-lucide-file-text",
    sticker: "i-lucide-smile",
    contacts: "i-lucide-contact",
    order: "i-lucide-shopping-cart",
    unknown: "i-lucide-help-circle",
  };
  return icons[type] || "i-lucide-file";
}

function parseReaction(content: string): string {
  try {
    return JSON.parse(content).emoji || content;
  } catch {
    return content;
  }
}

function parseInteractive(content: string): string {
  try {
    const data = JSON.parse(content);
    return data.title || data.id || content;
  } catch {
    return content;
  }
}

function parseLocation(content: string): string {
  try {
    const { latitude, longitude } = JSON.parse(content);
    return `${latitude}, ${longitude}`;
  } catch {
    return content;
  }
}

function statusColor(status?: string) {
  if (status === "open") return "success" as const;
  if (status === "pending") return "warning" as const;
  return "neutral" as const;
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

function triggerFileSelect() {
  fileInput.value?.click();
}

async function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  input.value = "";

  uploading.value = true;
  try {
    await uploadAndSendMedia(conversationId.value, file);
    scrollToBottom();
  } catch {
    toast.add({ title: t("chat.uploadFailed"), color: "error", icon: "i-lucide-alert-circle" });
  } finally {
    uploading.value = false;
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
  on("message:status", (event) => {
    const { id, status } = event.payload as { id: string; status: MessageStatus; conversationId: string };
    const msg = messages.value.find((m) => m.id === id);
    if (msg) {
      msg.status = status;
    }
  });
});

onUnmounted(() => {
  unsubscribe(`conversation:${conversationId.value}`);
});
</script>
