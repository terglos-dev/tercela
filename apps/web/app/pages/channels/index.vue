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
        <UTable
          v-if="!loading && channels.length > 0"
          :data="channels"
          :columns="columns"
          sticky
          class="cursor-pointer"
          @select="onRowClick"
        >
          <template #name-cell="{ row }">
            <div>
              <span>{{ row.original.name }}</span>
              <p v-if="getVerifiedName(row.original)" class="text-xs text-[var(--ui-text-dimmed)]">
                {{ getVerifiedName(row.original) }}
              </p>
            </div>
          </template>
          <template #phone-cell="{ row }">
            <span v-if="getDisplayPhone(row.original)" class="whitespace-nowrap">
              {{ phoneWithFlag(getDisplayPhone(row.original)) }}
            </span>
            <span v-else class="text-[var(--ui-text-dimmed)]">—</span>
          </template>
          <template #type-cell="{ row }">
            <UBadge color="info" variant="subtle" size="xs" :icon="channelIcon(row.original.type)">
              {{ row.original.type }}
            </UBadge>
          </template>
          <template #isActive-cell="{ row }">
            <div class="flex items-center gap-2" @click.stop>
              <USwitch
                :model-value="row.original.isActive"
                :loading="togglingId === row.original.id"
                size="sm"
                @update:model-value="onToggle(row.original)"
              />
              <span class="text-xs" :class="row.original.isActive ? 'text-[var(--color-success)]' : 'text-[var(--ui-text-dimmed)]'">
                {{ row.original.isActive ? $t('channels.active') : $t('channels.inactive') }}
              </span>
            </div>
          </template>
          <template #createdAt-cell="{ row }">
            {{ new Date(row.original.createdAt).toLocaleDateString(locale) }}
          </template>
          <template #actions-cell="{ row }">
            <div class="flex items-center" @click.stop>
              <UButton
                icon="i-lucide-trash-2"
                color="error"
                variant="ghost"
                size="xs"
                @click="confirmDelete(row.original)"
              />
            </div>
          </template>
        </UTable>

        <div v-else-if="loading" class="flex items-center justify-center py-20">
          <UIcon name="i-lucide-loader-2" class="animate-spin size-5 text-[var(--ui-text-muted)]" />
        </div>

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
import type { TableColumn } from "@nuxt/ui";
import type { ChannelListItem } from "~/types/api";
import { phoneWithFlag } from "~/utils/phone";

const { t, locale } = useI18n();
const router = useRouter();
const toast = useToast();
const { channels, loading, fetchChannels, deleteChannel, toggleChannel } = useChannels();

const togglingId = ref<string | null>(null);
const deleting = ref(false);
const deleteModalOpen = ref(false);
const channelToDelete = ref<ChannelListItem | null>(null);

const columns = computed<TableColumn<ChannelListItem>[]>(() => [
  { accessorKey: "name", header: t("channels.name") },
  { id: "phone", header: t("channels.phoneNumber") },
  { accessorKey: "type", header: t("channels.type") },
  { accessorKey: "isActive", header: t("channels.status") },
  { accessorKey: "createdAt", header: t("channels.created") },
  { id: "actions", header: t("channels.actions") },
]);

function getDisplayPhone(ch: ChannelListItem): string {
  return (ch.config as Record<string, string>)?.displayPhoneNumber || "";
}

function getVerifiedName(ch: ChannelListItem): string {
  return (ch.config as Record<string, string>)?.verifiedName || "";
}

function channelIcon(type: string) {
  if (type === "whatsapp") return "i-lucide-message-circle";
  if (type === "instagram") return "i-lucide-instagram";
  return "i-lucide-globe";
}

function onRowClick(row: { original: ChannelListItem }) {
  router.push(`/channels/${row.original.id}`);
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

onMounted(() => fetchChannels());
</script>
