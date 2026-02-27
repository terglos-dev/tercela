<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="$t('channels.title')" icon="i-lucide-radio">
        <template #right>
          <UButton
            :label="$t('channels.addChannel')"
            icon="i-lucide-plus"
            color="primary"
            to="/channels/new"
          />
          <GlobalControls />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-6">
        <!-- Channel cards grid -->
        <div v-if="!loading && channels.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <ChannelsChannelCard
            v-for="ch in channels"
            :key="ch.id"
            :channel="ch"
            :toggling="togglingId === ch.id"
            :health-dot-class="healthDotClass(ch.id)"
            :health-tooltip="healthTooltip(ch.id)"
            @navigate="onCardClick"
            @toggle="onToggle"
            @delete="confirmDelete"
          />
        </div>

        <!-- Loading skeletons -->
        <div v-else-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="i in 3"
            :key="i"
            class="rounded-xl border border-[var(--ui-border)] bg-[var(--ui-bg)] p-5 animate-pulse"
          >
            <div class="flex items-start gap-3">
              <div class="size-10 rounded-lg bg-[var(--ui-bg-elevated)]" />
              <div class="flex-1 space-y-2">
                <div class="h-4 w-2/3 rounded bg-[var(--ui-bg-elevated)]" />
                <div class="h-3 w-1/2 rounded bg-[var(--ui-bg-elevated)]" />
              </div>
            </div>
            <div class="mt-4 space-y-2">
              <div class="h-3 w-3/4 rounded bg-[var(--ui-bg-elevated)]" />
              <div class="h-3 w-1/3 rounded bg-[var(--ui-bg-elevated)]" />
              <div class="h-3 w-1/4 rounded bg-[var(--ui-bg-elevated)]" />
            </div>
            <div class="mt-4 pt-3 border-t border-[var(--ui-border)]">
              <div class="h-5 w-20 rounded bg-[var(--ui-bg-elevated)]" />
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div v-else class="flex flex-col items-center justify-center py-20 gap-2 text-[var(--ui-text-muted)]">
          <UIcon name="i-lucide-radio" class="size-10" />
          <span class="text-sm">{{ $t("channels.empty") }}</span>
          <UButton
            :label="$t('channels.addChannel')"
            icon="i-lucide-plus"
            color="primary"
            variant="soft"
            to="/channels/new"
            class="mt-2"
          />
        </div>
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
                <p class="text-sm text-[var(--ui-text-dimmed)]">{{ channelToDelete?.name }}</p>
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

const { t } = useI18n();
const router = useRouter();
const toast = useToast();
const { channels, loading, healthMap, fetchChannels, deleteChannel, toggleChannel, checkAllHealth } = useChannels();

const togglingId = ref<string | null>(null);
const deleting = ref(false);
const deleteModalOpen = ref(false);
const channelToDelete = ref<ChannelListItem | null>(null);

function onCardClick(ch: ChannelListItem) {
  router.push(`/channels/${ch.id}`);
}

async function onToggle(ch: ChannelListItem) {
  togglingId.value = ch.id;
  try {
    await toggleChannel(ch.id, !ch.isActive);
    toast.add({
      title: ch.isActive ? t("channels.deactivated") : t("channels.activated"),
      color: "success",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed";
    toast.add({ title: message, color: "error" });
  } finally {
    togglingId.value = null;
  }
}

function confirmDelete(ch: ChannelListItem) {
  channelToDelete.value = ch;
  deleteModalOpen.value = true;
}

async function onDelete() {
  if (!channelToDelete.value) return;
  deleting.value = true;
  try {
    await deleteChannel(channelToDelete.value.id);
    toast.add({ title: t("channels.deleted"), color: "success" });
    deleteModalOpen.value = false;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed";
    toast.add({ title: message, color: "error" });
  } finally {
    deleting.value = false;
  }
}

function healthDotClass(id: string) {
  const h = healthMap.value[id];
  if (!h) return "bg-gray-400 animate-pulse";
  return h.status === "connected" ? "bg-green-500" : "bg-red-500";
}

function healthTooltip(id: string) {
  const h = healthMap.value[id];
  if (!h) return t("channels.healthChecking");
  return h.status === "connected"
    ? t("channels.healthConnected")
    : h.reason || t("channels.healthDisconnected");
}

onMounted(async () => {
  await fetchChannels();
  const whatsappIds = channels.value
    .filter((ch) => ch.type === "whatsapp")
    .map((ch) => ch.id);
  if (whatsappIds.length) checkAllHealth(whatsappIds);
});
</script>
