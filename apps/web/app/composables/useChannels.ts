import type { ChannelListItem, ChannelHealth } from "~/types/api";

export function useChannels() {
  const channels = useState<ChannelListItem[]>("channels", () => []);
  const loading = useState("channels_loading", () => false);
  const healthMap = useState<Record<string, ChannelHealth>>("channels_health", () => ({}));
  const api = useApi();

  async function fetchChannels() {
    loading.value = true;
    try {
      channels.value = await api.get<ChannelListItem[]>("/v1/channels");
    } finally {
      loading.value = false;
    }
  }

  async function createChannel(data: { type: string; name: string; config: Record<string, unknown> }) {
    return await api.post<ChannelListItem>("/v1/channels", data);
  }

  async function updateChannel(id: string, data: Record<string, unknown>) {
    return await api.patch<ChannelListItem>(`/v1/channels/${id}`, data);
  }

  async function deleteChannel(id: string) {
    const config = useRuntimeConfig();
    const token = useCookie("auth_token");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token.value) headers.Authorization = `Bearer ${token.value}`;

    const res = await fetch(`${config.public.apiBase}/v1/channels/${id}`, {
      method: "DELETE",
      headers,
    });

    const body = await res.json().catch(() => null);
    if (!res.ok) throw new Error(body?.error?.message || "Request failed");
    await fetchChannels();
    return body.data as ChannelListItem;
  }

  async function toggleChannel(id: string, isActive: boolean) {
    const result = await updateChannel(id, { isActive });
    await fetchChannels();
    return result;
  }

  async function fetchMetaAccounts(accessToken: string) {
    return await api.post<{
      id: string;
      name: string;
      phone_numbers: { id: string; display_phone_number: string; verified_name: string; quality_rating?: string }[];
    }[]>("/v1/channels/meta/accounts", { accessToken });
  }

  async function connectMeta(data: { accessToken: string; phoneNumberId: string; wabaId: string; name: string }) {
    return await api.post<ChannelListItem>("/v1/channels/meta/connect", data);
  }

  async function resyncMeta(channelId: string, accessToken: string) {
    return await api.post<ChannelListItem>("/v1/channels/meta/resync", { channelId, accessToken });
  }

  async function checkHealth(channelId: string) {
    try {
      const result = await api.get<ChannelHealth>(`/v1/channels/${channelId}/health`);
      healthMap.value = { ...healthMap.value, [channelId]: result };
      return result;
    } catch {
      const failed: ChannelHealth = { status: "disconnected", tokenExpiresAt: null, reason: "Health check failed" };
      healthMap.value = { ...healthMap.value, [channelId]: failed };
      return failed;
    }
  }

  async function checkAllHealth(ids: string[]) {
    await Promise.allSettled(ids.map((id) => checkHealth(id)));
  }

  return { channels, loading, healthMap, fetchChannels, createChannel, updateChannel, deleteChannel, toggleChannel, fetchMetaAccounts, connectMeta, resyncMeta, checkHealth, checkAllHealth };
}
