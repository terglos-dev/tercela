import type { WhatsAppTemplateItem, TemplateWithChannel } from "~/types/api";

export function useTemplates() {
  const templates = useState<WhatsAppTemplateItem[]>("templates", () => []);
  const allTemplates = useState<TemplateWithChannel[]>("all_templates", () => []);
  const loading = useState("templates_loading", () => false);
  const allLoading = useState("all_templates_loading", () => false);
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

  async function fetchAllTemplates(opts?: { status?: string; search?: string; channelId?: string }) {
    allLoading.value = true;
    try {
      const params = new URLSearchParams();
      if (opts?.status) params.set("status", opts.status);
      if (opts?.search) params.set("search", opts.search);
      if (opts?.channelId) params.set("channelId", opts.channelId);
      const qs = params.toString();
      allTemplates.value = await api.get<TemplateWithChannel[]>(
        `/v1/templates${qs ? `?${qs}` : ""}`,
      );
    } finally {
      allLoading.value = false;
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

  async function fetchTemplateById(templateId: string) {
    return await api.get<TemplateWithChannel>(`/v1/templates/${templateId}`);
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

  return { templates, allTemplates, loading, allLoading, syncing, fetchTemplates, fetchAllTemplates, syncTemplates, createTemplate, fetchTemplate, fetchTemplateById, updateTemplate, deleteTemplate };
}
