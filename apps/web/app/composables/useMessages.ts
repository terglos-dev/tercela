import type { Serialized, Message } from "@tercela/shared";

export function useMessages() {
  const messages = useState<Serialized<Message>[]>("messages", () => []);
  const loading = useState("messages_loading", () => false);
  const loadingMore = useState("messages_loading_more", () => false);
  const hasMore = useState("messages_has_more", () => false);
  const nextCursor = useState<string | null>("messages_next_cursor", () => null);
  const api = useApi();

  async function fetchMessages(conversationId: string) {
    loading.value = true;
    try {
      const res = await api.getPaginated<Serialized<Message>>(
        `/v1/conversations/${conversationId}/messages`,
      );
      messages.value = res.data;
      nextCursor.value = res.meta.nextCursor;
      hasMore.value = res.meta.hasMore;
    } finally {
      loading.value = false;
    }
  }

  async function loadMore(conversationId: string) {
    if (!hasMore.value || loadingMore.value || !nextCursor.value) return;
    loadingMore.value = true;
    try {
      const res = await api.getPaginated<Serialized<Message>>(
        `/v1/conversations/${conversationId}/messages?before=${encodeURIComponent(nextCursor.value)}`,
      );
      messages.value = [...res.data, ...messages.value];
      nextCursor.value = res.meta.nextCursor;
      hasMore.value = res.meta.hasMore;
    } finally {
      loadingMore.value = false;
    }
  }

  async function sendMessage(conversationId: string, content: string, type: string = "text") {
    return await api.post<Serialized<Message>>(`/v1/conversations/${conversationId}/messages`, {
      content,
      type,
    });
  }

  async function uploadAndSendMedia(conversationId: string, file: File, caption?: string) {
    const config = useRuntimeConfig();
    const token = useCookie("auth_token");

    const formData = new FormData();
    formData.append("file", file);
    if (caption) formData.append("caption", caption);

    const res = await fetch(
      `${config.public.apiBase}/v1/conversations/${conversationId}/messages/upload`,
      {
        method: "POST",
        headers: {
          ...(token.value ? { Authorization: `Bearer ${token.value}` } : {}),
        },
        body: formData,
      },
    );

    const body = await res.json().catch(() => null);
    if (!res.ok) throw new Error(body?.error?.message || "Upload failed");
    return body.data as Serialized<Message>;
  }

  return { messages, loading, loadingMore, hasMore, fetchMessages, loadMore, sendMessage, uploadAndSendMedia };
}
