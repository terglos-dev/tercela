export function useMessages() {
  const messages = useState<any[]>("messages", () => []);
  const loading = useState("messages_loading", () => false);
  const api = useApi();

  async function fetchMessages(conversationId: string) {
    loading.value = true;
    try {
      messages.value = await api.get<any[]>(`/api/conversations/${conversationId}/messages`);
    } finally {
      loading.value = false;
    }
  }

  async function sendMessage(conversationId: string, content: string, type: string = "text") {
    const msg = await api.post<any>(`/api/conversations/${conversationId}/messages`, {
      content,
      type,
    });
    messages.value.push(msg);
    return msg;
  }

  return { messages, loading, fetchMessages, sendMessage };
}
