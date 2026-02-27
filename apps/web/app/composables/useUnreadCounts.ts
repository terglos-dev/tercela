export function useUnreadCounts() {
  const { conversations } = useConversations();
  const api = useApi();

  const totalUnread = computed(() =>
    conversations.value.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0),
  );

  async function markAsRead(conversationId: string) {
    const conv = conversations.value.find((c) => c.id === conversationId);
    if (conv && conv.unreadCount > 0) {
      conv.unreadCount = 0;
      await api.post(`/v1/conversations/${conversationId}/read`, {});
    }
  }

  return { totalUnread, markAsRead };
}
