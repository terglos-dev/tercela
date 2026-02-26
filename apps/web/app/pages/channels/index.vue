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
          <template #type-cell="{ row }">
            <UBadge color="info" variant="subtle" size="xs" :icon="channelIcon(row.original.type)">
              {{ row.original.type }}
            </UBadge>
          </template>
          <template #isActive-cell="{ row }">
            <UBadge
              :color="row.original.isActive ? 'success' : 'neutral'"
              variant="subtle"
              size="xs"
            >
              {{ row.original.isActive ? $t('channels.active') : $t('channels.inactive') }}
            </UBadge>
          </template>
          <template #createdAt-cell="{ row }">
            {{ new Date(row.original.createdAt).toLocaleDateString(locale) }}
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
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";
import type { ChannelListItem } from "~/types/api";

const { t, locale } = useI18n();
const router = useRouter();
const { channels, loading, fetchChannels } = useChannels();

const columns = computed<TableColumn<ChannelListItem>[]>(() => [
  { accessorKey: "name", header: t("channels.name") },
  { accessorKey: "type", header: t("channels.type") },
  { accessorKey: "isActive", header: t("channels.status") },
  { accessorKey: "createdAt", header: t("channels.created") },
]);

function channelIcon(type: string) {
  if (type === "whatsapp") return "i-lucide-message-circle";
  if (type === "instagram") return "i-lucide-instagram";
  return "i-lucide-globe";
}

function onRowClick(row: { original: ChannelListItem }) {
  router.push(`/channels/${row.original.id}`);
}

onMounted(() => fetchChannels());
</script>
