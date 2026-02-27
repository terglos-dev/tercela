import type { ConversationListItem } from "~/types/api";

export function useConversations() {
  const conversations = useState<ConversationListItem[]>("conversations", () => []);
  const loading = useState("conversations_loading", () => false);
  const loadingMore = useState("conversations_loading_more", () => false);
  const hasMore = useState("conversations_has_more", () => false);
  const nextOffset = useState("conversations_next_offset", () => 0);
  const api = useApi();

  async function fetchConversations() {
    loading.value = true;
    try {
      const res = await api.getPaginated<ConversationListItem>("/v1/conversations?limit=50");
      conversations.value = res.data;
      hasMore.value = res.meta.hasMore;
      nextOffset.value = res.meta.nextCursor ? parseInt(res.meta.nextCursor) : 0;
    } finally {
      loading.value = false;
    }
  }

  async function loadMore() {
    if (!hasMore.value || loadingMore.value) return;
    loadingMore.value = true;
    try {
      const res = await api.getPaginated<ConversationListItem>(
        `/v1/conversations?limit=50&offset=${nextOffset.value}`,
      );
      conversations.value = [...conversations.value, ...res.data];
      hasMore.value = res.meta.hasMore;
      nextOffset.value = res.meta.nextCursor ? parseInt(res.meta.nextCursor) : 0;
    } finally {
      loadingMore.value = false;
    }
  }

  async function updateConversation(id: string, data: Record<string, unknown>) {
    const updated = await api.patch<ConversationListItem>(`/v1/conversations/${id}`, data);
    const idx = conversations.value.findIndex((c) => c.id === id);
    if (idx !== -1) conversations.value[idx] = { ...conversations.value[idx], ...updated };
    return updated;
  }

  return { conversations, loading, loadingMore, hasMore, fetchConversations, loadMore, updateConversation };
}
