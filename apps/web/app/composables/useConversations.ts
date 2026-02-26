export function useConversations() {
  const conversations = useState<any[]>("conversations", () => []);
  const loading = useState("conversations_loading", () => false);
  const api = useApi();

  async function fetchConversations() {
    loading.value = true;
    try {
      conversations.value = await api.get<any[]>("/api/conversations");
    } finally {
      loading.value = false;
    }
  }

  async function updateConversation(id: string, data: Record<string, unknown>) {
    const updated = await api.patch<any>(`/api/conversations/${id}`, data);
    const idx = conversations.value.findIndex((c) => c.id === id);
    if (idx !== -1) conversations.value[idx] = { ...conversations.value[idx], ...updated };
    return updated;
  }

  return { conversations, loading, fetchConversations, updateConversation };
}
