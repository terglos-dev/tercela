import type { WhatsAppTemplateItem } from "~/types/api";

export function useTemplates() {
  const templates = useState<WhatsAppTemplateItem[]>("templates", () => []);
  const loading = useState("templates_loading", () => false);
  const syncing = useState("templates_syncing", () => false);
  const api = useApi();

  async function fetchTemplates(channelId: string, opts?: { status?: string; search?: string }) {
    loading.value = true;
    try {
      const params = new URLSearchParams();
      if (opts?.status) params.set("status", opts.status);
      if (opts?.search) params.set("search", opts.search);
      const qs = params.toString();
      templates.value = await api.get<WhatsAppTemplateItem[]>(
        `/v1/channels/${channelId}/templates${qs ? `?${qs}` : ""}`,
      );
    } finally {
      loading.value = false;
    }
  }

  async function syncTemplates(channelId: string) {
    syncing.value = true;
    try {
      templates.value = await api.post<WhatsAppTemplateItem[]>(
        `/v1/channels/${channelId}/templates/sync`,
        {},
      );
    } finally {
      syncing.value = false;
    }
  }

  async function createTemplate(
    channelId: string,
    data: { name: string; language: string; category: string; components: Record<string, unknown>[] },
  ) {
    return await api.post<WhatsAppTemplateItem>(`/v1/channels/${channelId}/templates`, data);
  }

  async function fetchTemplate(channelId: string, templateId: string) {
    return await api.get<WhatsAppTemplateItem>(`/v1/channels/${channelId}/templates/${templateId}`);
  }

  async function updateTemplate(
    channelId: string,
    templateId: string,
    data: { components: Record<string, unknown>[] },
  ) {
    return await api.patch<WhatsAppTemplateItem>(`/v1/channels/${channelId}/templates/${templateId}`, data);
  }

  async function deleteTemplate(channelId: string, name: string) {
    await api.delete(`/v1/channels/${channelId}/templates/${encodeURIComponent(name)}`);
  }

  return { templates, loading, syncing, fetchTemplates, syncTemplates, createTemplate, fetchTemplate, updateTemplate, deleteTemplate };
}
