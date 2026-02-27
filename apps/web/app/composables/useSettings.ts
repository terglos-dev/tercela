import type { SettingItem, StorageConfig } from "~/types/api";

export function useSettings() {
  const api = useApi();
  const settings = ref<SettingItem[]>([]);
  const loading = ref(false);

  async function fetchSettings() {
    loading.value = true;
    try {
      settings.value = await api.get<SettingItem[]>("/v1/settings");
    } finally {
      loading.value = false;
    }
  }

  async function saveSetting(key: string, value: Record<string, unknown>) {
    const result = await api.put<SettingItem>(`/v1/settings/${key}`, { value });
    const idx = settings.value.findIndex((s) => s.key === key);
    if (idx >= 0) {
      settings.value[idx] = result;
    } else {
      settings.value.push(result);
    }
    return result;
  }

  async function testStorage(config: StorageConfig) {
    return api.post<{ success: boolean }>("/v1/settings/storage/test", config);
  }

  function getSettingValue<T = Record<string, unknown>>(key: string): T | null {
    const item = settings.value.find((s) => s.key === key);
    return item ? (item.value as T) : null;
  }

  return { settings, loading, fetchSettings, saveSetting, testStorage, getSettingValue };
}
