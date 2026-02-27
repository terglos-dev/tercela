<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="$t('templates.title')" icon="i-lucide-file-text">
        <template #right>
          <GlobalControls />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-6 space-y-4">
        <!-- Filters -->
        <div class="flex flex-wrap items-center gap-3">
          <UInput
            v-model="search"
            :placeholder="$t('templates.search')"
            icon="i-lucide-search"
            class="w-64"
            @update:model-value="debouncedFetch"
          />
          <USelect
            v-model="statusFilter"
            :items="statusOptions"
            class="w-40"
            @update:model-value="onFilterChange"
          />
          <USelect
            v-model="channelFilter"
            :items="channelOptions"
            class="w-48"
            @update:model-value="onFilterChange"
          />
        </div>

        <!-- Table -->
        <UTable v-if="!allLoading && grouped.length > 0" :data="grouped" :columns="columns" sticky>
          <template #channelName-cell="{ row }">
            <UBadge color="info" variant="subtle" size="xs">
              {{ row.original.channelName }}
            </UBadge>
          </template>
          <template #languages-cell="{ row }">
            <div class="flex flex-wrap gap-1">
              <UBadge
                v-for="lang in row.original.languages"
                :key="lang.language"
                color="neutral"
                variant="subtle"
                size="xs"
              >
                {{ lang.language }}
              </UBadge>
            </div>
          </template>
          <template #status-cell="{ row }">
            <div class="flex flex-wrap gap-1">
              <UBadge
                v-for="s in row.original.uniqueStatuses"
                :key="s"
                :color="statusColor(s)"
                variant="subtle"
                size="xs"
              >
                {{ s }}
              </UBadge>
            </div>
          </template>
          <template #actions-cell="{ row }">
            <div class="flex items-center gap-1">
              <!-- View: direct if 1 language, dropdown if multiple -->
              <UButton
                v-if="row.original.languages.length === 1"
                icon="i-lucide-eye"
                variant="ghost"
                color="neutral"
                size="xs"
                :to="`/templates/${row.original.languages[0].id}`"
              />
              <UDropdownMenu v-else :items="langMenuItems(row.original, 'view')">
                <UButton
                  icon="i-lucide-eye"
                  variant="ghost"
                  color="neutral"
                  size="xs"
                />
              </UDropdownMenu>

              <!-- Edit: direct if 1 language, dropdown if multiple -->
              <UButton
                v-if="row.original.languages.length === 1"
                icon="i-lucide-pencil"
                variant="ghost"
                color="neutral"
                size="xs"
                :to="`/templates/${row.original.languages[0].id}/edit`"
              />
              <UDropdownMenu v-else :items="langMenuItems(row.original, 'edit')">
                <UButton
                  icon="i-lucide-pencil"
                  variant="ghost"
                  color="neutral"
                  size="xs"
                />
              </UDropdownMenu>

              <UButton
                icon="i-lucide-trash-2"
                variant="ghost"
                color="error"
                size="xs"
                @click="confirmDelete(row.original)"
              />
            </div>
          </template>
        </UTable>

        <div v-else-if="allLoading" class="flex items-center justify-center py-20">
          <UIcon name="i-lucide-loader-2" class="animate-spin size-5 text-[var(--ui-text-muted)]" />
        </div>

        <div v-else class="flex flex-col items-center justify-center py-20 gap-2 text-[var(--ui-text-muted)]">
          <UIcon name="i-lucide-file-text" class="size-10" />
          <span class="text-sm">{{ $t("templates.emptyGlobal") }}</span>
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
                <h3 class="text-base font-semibold">{{ $t('templates.deleteConfirm', { name: deletingGroup?.name }) }}</h3>
              </div>
            </div>
            <p class="text-sm text-[var(--ui-text-muted)]">{{ $t('templates.deleteWarning') }}</p>
            <div class="flex justify-end gap-2">
              <UButton
                :label="$t('templates.cancel')"
                color="neutral"
                variant="soft"
                @click="deleteModalOpen = false"
              />
              <UButton
                :label="$t('templates.delete')"
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
import type { TableColumn, DropdownMenuItem } from "@nuxt/ui";

interface LanguageVariant {
  id: string;
  language: string;
  status: string;
}

interface TemplateGroup {
  id: string;
  name: string;
  channelId: string;
  channelName: string;
  category: string;
  languages: LanguageVariant[];
  uniqueStatuses: string[];
}

const { t } = useI18n();
const route = useRoute();
const toast = useToast();
const { allTemplates, allLoading, fetchAllTemplates, deleteTemplate } = useTemplates();
const { channels, fetchChannels } = useChannels();

const search = ref("");
const statusFilter = ref("ALL");
const channelFilter = ref("ALL");
const deleteModalOpen = ref(false);
const deletingGroup = ref<TemplateGroup | null>(null);
const deleting = ref(false);

const grouped = computed<TemplateGroup[]>(() => {
  const map = new Map<string, TemplateGroup>();
  for (const t of allTemplates.value) {
    const key = `${t.channelId}::${t.name}`;
    if (!map.has(key)) {
      map.set(key, {
        id: key,
        name: t.name,
        channelId: t.channelId,
        channelName: t.channelName,
        category: t.category,
        languages: [],
        uniqueStatuses: [],
      });
    }
    const group = map.get(key)!;
    group.languages.push({ id: t.id, language: t.language, status: t.status });
    if (!group.uniqueStatuses.includes(t.status)) {
      group.uniqueStatuses.push(t.status);
    }
  }
  return Array.from(map.values());
});

const statusOptions = computed(() => [
  { label: t("templates.filter.all"), value: "ALL" },
  { label: t("templates.filter.approved"), value: "APPROVED" },
  { label: t("templates.filter.pending"), value: "PENDING" },
  { label: t("templates.filter.rejected"), value: "REJECTED" },
]);

const channelOptions = computed(() => [
  { label: t("templates.allChannels"), value: "ALL" },
  ...channels.value.map((ch) => ({ label: ch.name, value: ch.id })),
]);

const columns = computed<TableColumn<TemplateGroup>[]>(() => [
  { accessorKey: "name", header: t("templates.name") },
  { id: "channelName", accessorKey: "channelName", header: t("templates.channel") },
  { id: "languages", header: t("templates.language") },
  { accessorKey: "category", header: t("templates.category") },
  { id: "status", header: t("templates.status") },
  { id: "actions", header: t("templates.actions") },
]);

function statusColor(status: string): "success" | "warning" | "error" | "neutral" {
  switch (status) {
    case "APPROVED": return "success";
    case "PENDING": return "warning";
    case "REJECTED": return "error";
    default: return "neutral";
  }
}

function getFilterParams() {
  return {
    status: statusFilter.value === "ALL" ? undefined : statusFilter.value,
    search: search.value || undefined,
    channelId: channelFilter.value === "ALL" ? undefined : channelFilter.value,
  };
}

let debounceTimer: ReturnType<typeof setTimeout>;
function debouncedFetch() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    fetchAllTemplates(getFilterParams());
  }, 300);
}

function onFilterChange() {
  fetchAllTemplates(getFilterParams());
}

function langMenuItems(group: TemplateGroup, action: "view" | "edit"): DropdownMenuItem[][] {
  return [
    group.languages.map((lang) => ({
      label: lang.language,
      onSelect: () => {
        const path = action === "edit" ? `/templates/${lang.id}/edit` : `/templates/${lang.id}`;
        navigateTo(path);
      },
    })),
  ];
}

function confirmDelete(group: TemplateGroup) {
  deletingGroup.value = group;
  deleteModalOpen.value = true;
}

async function onDelete() {
  if (!deletingGroup.value) return;
  deleting.value = true;
  try {
    await deleteTemplate(deletingGroup.value.channelId, deletingGroup.value.name);
    toast.add({ title: t("templates.deleted"), color: "success" });
    deleteModalOpen.value = false;
    await fetchAllTemplates(getFilterParams());
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : t("templates.deleteFailed");
    toast.add({ title: message, color: "error" });
  } finally {
    deleting.value = false;
  }
}

onMounted(() => {
  const qsChannelId = route.query.channelId as string | undefined;
  if (qsChannelId) {
    channelFilter.value = qsChannelId;
  }
  fetchAllTemplates(getFilterParams());
  fetchChannels();
});
</script>
