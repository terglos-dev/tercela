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
import type { ChannelListItem } from "~/types/api";
import { phoneWithFlag } from "~/utils/phone";

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
const deleting = ref(false);
const deleteModalOpen = ref(false);

const form = reactive({
  name: "",
  isActive: true,
});

const whatsappConfig = reactive({
  displayPhoneNumber: "",
  verifiedName: "",
  wabaId: "",
});

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
