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
        <template #right>
          <GlobalControls />
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

          <!-- WhatsApp read-only info -->
          <template v-if="channel.type === 'whatsapp'">
            <div class="space-y-4 rounded-lg border border-[var(--ui-border)] p-4">
              <!-- Health section -->
              <div>
                <p class="text-sm font-medium text-[var(--ui-text-dimmed)] mb-1">{{ $t('channels.connection') }}</p>
                <div class="flex items-center gap-2">
                  <span
                    class="inline-block size-2.5 rounded-full shrink-0"
                    :class="!health ? 'bg-gray-400 animate-pulse' : health.status === 'connected' ? 'bg-green-500' : 'bg-red-500'"
                  />
                  <span v-if="!health" class="text-sm text-[var(--ui-text-muted)]">{{ $t('channels.healthChecking') }}</span>
                  <span v-else-if="health.status === 'connected'" class="text-sm text-green-600">{{ $t('channels.healthConnected') }}</span>
                  <span v-else class="text-sm text-red-600">{{ $t('channels.healthDisconnected') }}</span>
                  <UButton
                    icon="i-lucide-refresh-cw"
                    variant="ghost"
                    color="neutral"
                    size="xs"
                    :loading="healthChecking"
                    @click="recheckHealth"
                  />
                </div>
                <p v-if="health?.status === 'disconnected' && health.reason" class="text-xs text-red-500 mt-1">
                  {{ health.reason }}
                </p>
                <UButton
                  v-if="health?.status === 'disconnected' || tokenExpiringSoon"
                  :label="$t('channels.resync')"
                  icon="i-lucide-refresh-cw"
                  color="warning"
                  variant="soft"
                  size="sm"
                  :loading="resyncing"
                  class="mt-2"
                  @click="onResync"
                />
              </div>

              <!-- Token expiration -->
              <div v-if="health?.tokenExpiresAt">
                <p class="text-sm font-medium text-[var(--ui-text-dimmed)] mb-1">{{ $t('channels.tokenExpiresAt') }}</p>
                <p class="text-base" :class="tokenExpiringSoon ? 'text-amber-600 font-medium' : ''">
                  {{ new Date(health.tokenExpiresAt).toLocaleDateString() }}
                  <span v-if="tokenExpiringSoon" class="text-xs ml-1">({{ $t('channels.tokenExpiringSoon') }})</span>
                </p>
              </div>

              <div v-if="whatsappConfig.displayPhoneNumber">
                <p class="text-sm font-medium text-[var(--ui-text-dimmed)] mb-1">{{ $t('channels.phoneNumber') }}</p>
                <p class="text-base">{{ phoneWithFlag(whatsappConfig.displayPhoneNumber) }}</p>
              </div>

              <div v-if="whatsappConfig.verifiedName">
                <p class="text-sm font-medium text-[var(--ui-text-dimmed)] mb-1">{{ $t('channels.verifiedName') }}</p>
                <p class="text-base">{{ whatsappConfig.verifiedName }}</p>
              </div>

              <div v-if="whatsappConfig.wabaId">
                <p class="text-sm font-medium text-[var(--ui-text-dimmed)] mb-1">WABA ID</p>
                <p class="text-base font-mono text-sm">{{ whatsappConfig.wabaId }}</p>
              </div>
            </div>

            <!-- Message Templates link -->
            <UButton
              :label="$t('templates.title')"
              icon="i-lucide-file-text"
              color="neutral"
              variant="soft"
              block
              :to="`/channels/${channelId}/templates`"
            />
          </template>

          <div class="flex justify-between">
            <UButton
              :label="$t('channels.delete')"
              icon="i-lucide-trash-2"
              color="error"
              variant="soft"
              @click="deleteModalOpen = true"
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

      <!-- Delete confirmation modal -->
      <UModal v-model:open="deleteModalOpen">
        <template #content>
          <div class="p-6 space-y-4">
            <div class="flex items-center gap-3">
              <div class="flex items-center justify-center size-10 rounded-full bg-[var(--ui-bg-error)]/10">
                <UIcon name="i-lucide-triangle-alert" class="size-5 text-[var(--color-error)]" />
              </div>
              <div>
                <h3 class="text-base font-semibold">{{ $t('channels.delete') }}</h3>
                <p class="text-sm text-[var(--ui-text-dimmed)]">{{ channel?.name }}</p>
              </div>
            </div>
            <p class="text-sm text-[var(--ui-text-muted)]">{{ $t('channels.deleteConfirm') }}</p>
            <div class="flex justify-end gap-2">
              <UButton
                :label="$t('channels.cancel')"
                color="neutral"
                variant="soft"
                @click="deleteModalOpen = false"
              />
              <UButton
                :label="$t('channels.delete')"
                color="error"
                icon="i-lucide-trash-2"
                :loading="deleting"
                @click="onDelete"
              />
            </div>
          </div>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
import type { ChannelListItem, ChannelHealth } from "~/types/api";
import { phoneWithFlag } from "~/utils/phone";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const toast = useToast();
const api = useApi();
const { updateChannel, deleteChannel, checkHealth, resyncMeta } = useChannels();

const channelId = route.params.id as string;
const channel = ref<ChannelListItem | null>(null);
const loading = ref(true);
const saving = ref(false);
const deleting = ref(false);
const deleteModalOpen = ref(false);
const health = ref<ChannelHealth | null>(null);
const healthChecking = ref(false);
const resyncing = ref(false);

const form = reactive({
  name: "",
  isActive: true,
});

const whatsappConfig = reactive({
  displayPhoneNumber: "",
  verifiedName: "",
  wabaId: "",
});

const tokenExpiringSoon = computed(() => {
  if (!health.value?.tokenExpiresAt) return false;
  const diff = new Date(health.value.tokenExpiresAt).getTime() - Date.now();
  return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
});

async function recheckHealth() {
  healthChecking.value = true;
  try {
    health.value = await checkHealth(channelId);
  } finally {
    healthChecking.value = false;
  }
}

async function onResync() {
  const { $fb } = useNuxtApp();
  if (!$fb) {
    toast.add({ title: t("channels.metaError"), color: "error" });
    return;
  }

  resyncing.value = true;
  try {
    const response = await ($fb as { login: (opts: Record<string, unknown>) => Promise<{ status: string; authResponse?: { accessToken?: string } }> }).login({
      scope: "business_management,whatsapp_business_management,whatsapp_business_messaging",
    });

    if (response.status !== "connected" || !response.authResponse?.accessToken) {
      toast.add({ title: t("channels.metaError"), color: "error" });
      return;
    }

    await resyncMeta(channelId, response.authResponse.accessToken);
    toast.add({ title: t("channels.resyncSuccess"), color: "success" });

    // Re-check health with new token
    health.value = await checkHealth(channelId);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : t("channels.resyncError");
    toast.add({ title: message, color: "error" });
  } finally {
    resyncing.value = false;
  }
}

onMounted(async () => {
  try {
    const data = await api.get<ChannelListItem>(`/v1/channels/${channelId}`);
    channel.value = data;

    form.name = data.name;
    form.isActive = data.isActive;

    if (data.type === "whatsapp") {
      const cfg = data.config as Record<string, string>;
      whatsappConfig.displayPhoneNumber = cfg.displayPhoneNumber || "";
      whatsappConfig.verifiedName = cfg.verifiedName || "";
      whatsappConfig.wabaId = cfg.wabaId || cfg.businessAccountId || "";

      recheckHealth();
    }
  } finally {
    loading.value = false;
  }
});

async function onSave() {
  saving.value = true;
  try {
    await updateChannel(channelId, { name: form.name, isActive: form.isActive });
    toast.add({ title: t("channels.saved"), color: "success" });
    router.push("/channels");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to save";
    toast.add({ title: message, color: "error" });
  } finally {
    saving.value = false;
  }
}

async function onDelete() {
  deleting.value = true;
  try {
    await deleteChannel(channelId);
    toast.add({ title: t("channels.deleted"), color: "success" });
    router.push("/channels");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete";
    toast.add({ title: message, color: "error" });
  } finally {
    deleting.value = false;
  }
}
</script>
