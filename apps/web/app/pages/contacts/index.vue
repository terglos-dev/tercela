<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="$t('contacts.title')" icon="i-lucide-users">
        <template #right>
          <UColorModeButton />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-6">
        <UTable v-if="!loading && contacts.length > 0" :data="contacts" :columns="columns" sticky>
          <template #channelType-cell="{ row }">
            <UBadge color="info" variant="subtle" size="xs" :icon="channelIcon(row.original.channelType)">
              {{ row.original.channelType }}
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
          <UIcon name="i-lucide-users" class="size-10" />
          <span class="text-sm">{{ $t("contacts.empty") }}</span>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";
import type { Serialized, Contact } from "@tercela/shared";

const { t, locale } = useI18n();
const api = useApi();
const contacts = ref<Serialized<Contact>[]>([]);
const loading = ref(true);

const columns = computed<TableColumn<Serialized<Contact>>[]>(() => [
  { accessorKey: "name", header: t("contacts.name") },
  { accessorKey: "phone", header: t("contacts.phone") },
  { accessorKey: "channelType", header: t("contacts.channel") },
  { accessorKey: "createdAt", header: t("contacts.createdAt") },
]);

function channelIcon(type: string) {
  if (type === "whatsapp") return "i-lucide-message-circle";
  if (type === "instagram") return "i-lucide-instagram";
  return "i-lucide-globe";
}

onMounted(async () => {
  try {
    contacts.value = await api.get<Serialized<Contact>[]>("/v1/contacts");
  } finally {
    loading.value = false;
  }
});
</script>
