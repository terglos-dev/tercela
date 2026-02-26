<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="channel?.name || $t('channels.edit')" icon="i-lucide-radio">
        <template #left>
          <UButton
            icon="i-lucide-arrow-left"
            variant="ghost"
            color="neutral"
            to="/channels"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div v-if="loading" class="flex items-center justify-center py-20">
        <UIcon name="i-lucide-loader-2" class="animate-spin size-5 text-[var(--ui-text-muted)]" />
      </div>

      <div v-else-if="channel" class="p-6 max-w-2xl">
        <form class="space-y-6" @submit.prevent="onSave">
          <UFormField :label="$t('channels.name')">
            <UInput
              v-model="form.name"
              required
              class="w-full"
            />
          </UFormField>

          <UFormField :label="$t('channels.type')">
            <UInput :model-value="channel.type" disabled class="w-full" />
          </UFormField>

          <UFormField :label="$t('channels.status')">
            <div class="flex items-center gap-3">
              <USwitch v-model="form.isActive" />
              <span class="text-sm">
                {{ form.isActive ? $t('channels.active') : $t('channels.inactive') }}
              </span>
            </div>
          </UFormField>

          <template v-if="channel.type === 'whatsapp'">
            <UFormField :label="$t('channels.whatsapp.phoneNumberId')">
              <UInput
                v-model="form.config.phoneNumberId"
                :placeholder="configPlaceholder('phoneNumberId')"
                class="w-full"
                @focus="clearMaskedField('phoneNumberId')"
              />
            </UFormField>

            <UFormField :label="$t('channels.whatsapp.accessToken')">
              <UInput
                v-model="form.config.accessToken"
                :placeholder="configPlaceholder('accessToken')"
                class="w-full"
                @focus="clearMaskedField('accessToken')"
              />
            </UFormField>

            <UFormField :label="$t('channels.whatsapp.appSecret')">
              <UInput
                v-model="form.config.appSecret"
                :placeholder="configPlaceholder('appSecret')"
                class="w-full"
                @focus="clearMaskedField('appSecret')"
              />
            </UFormField>

            <UFormField :label="$t('channels.whatsapp.verifyToken')">
              <UInput
                v-model="form.config.verifyToken"
                :placeholder="configPlaceholder('verifyToken')"
                class="w-full"
                @focus="clearMaskedField('verifyToken')"
              />
            </UFormField>

            <UFormField :label="$t('channels.whatsapp.businessAccountId')">
              <UInput
                v-model="form.config.businessAccountId"
                :placeholder="configPlaceholder('businessAccountId')"
                class="w-full"
                @focus="clearMaskedField('businessAccountId')"
              />
            </UFormField>
          </template>

          <div class="flex justify-between">
            <UButton
              :label="$t('channels.deactivate')"
              icon="i-lucide-power-off"
              color="error"
              variant="soft"
              :loading="deactivating"
              @click="onDeactivate"
            />
            <UButton
              type="submit"
              :label="$t('channels.save')"
              icon="i-lucide-check"
              color="primary"
              :loading="saving"
            />
          </div>
        </form>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
import type { ChannelListItem } from "~/types/api";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const toast = useToast();
const api = useApi();
const { updateChannel, deleteChannel } = useChannels();

const channelId = route.params.id as string;
const channel = ref<ChannelListItem | null>(null);
const loading = ref(true);
const saving = ref(false);
const deactivating = ref(false);

const form = reactive({
  name: "",
  isActive: true,
  config: {
    phoneNumberId: "",
    accessToken: "",
    appSecret: "",
    verifyToken: "",
    businessAccountId: "",
  },
});

// Original masked config from backend, used for placeholder display
const originalConfig = ref<Record<string, unknown>>({});

function configPlaceholder(key: string): string {
  const val = originalConfig.value[key];
  return typeof val === "string" ? val : "";
}

function clearMaskedField(key: string) {
  const current = form.config[key as keyof typeof form.config];
  // If the field still holds the masked value, clear it so user can type fresh
  if (current && typeof current === "string" && current.startsWith("••••")) {
    form.config[key as keyof typeof form.config] = "";
  }
}

onMounted(async () => {
  try {
    const data = await api.get<ChannelListItem>(`/v1/channels/${channelId}`);
    channel.value = data;
    originalConfig.value = { ...(data.config as Record<string, unknown>) };

    form.name = data.name;
    form.isActive = data.isActive;

    const cfg = data.config as Record<string, string>;
    form.config.phoneNumberId = cfg.phoneNumberId || "";
    form.config.accessToken = cfg.accessToken || "";
    form.config.appSecret = cfg.appSecret || "";
    form.config.verifyToken = cfg.verifyToken || "";
    form.config.businessAccountId = cfg.businessAccountId || "";
  } finally {
    loading.value = false;
  }
});

async function onSave() {
  saving.value = true;
  try {
    // Only send config fields that were changed (not still masked)
    const configUpdate: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(form.config)) {
      if (typeof val === "string" && !val.startsWith("••••") && val !== "") {
        configUpdate[key] = val;
      }
    }

    // If user cleared masked fields but didn't type new values, keep originals on server
    // by not sending those keys at all. Merge with non-masked original values.
    const fullConfig: Record<string, unknown> = {};
    for (const key of Object.keys(form.config)) {
      const formVal = form.config[key as keyof typeof form.config];
      if (typeof formVal === "string" && formVal.startsWith("••••")) {
        // Don't send — server keeps existing value
      } else if (typeof formVal === "string" && formVal === "") {
        // Empty means user cleared it — don't overwrite server value
      } else {
        fullConfig[key] = formVal;
      }
    }

    const payload: Record<string, unknown> = { name: form.name, isActive: form.isActive };
    if (Object.keys(fullConfig).length > 0) {
      payload.config = fullConfig;
    }

    await updateChannel(channelId, payload);
    toast.add({ title: t("channels.saved"), color: "success" });
    router.push("/channels");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to save";
    toast.add({ title: message, color: "error" });
  } finally {
    saving.value = false;
  }
}

async function onDeactivate() {
  deactivating.value = true;
  try {
    await deleteChannel(channelId);
    toast.add({ title: t("channels.deactivated"), color: "success" });
    router.push("/channels");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to deactivate";
    toast.add({ title: message, color: "error" });
  } finally {
    deactivating.value = false;
  }
}
</script>
