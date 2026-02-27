<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="$t('templates.title')" icon="i-lucide-file-text">
        <template #left>
          <UButton
            icon="i-lucide-arrow-left"
            variant="ghost"
            color="neutral"
            :to="`/channels/${channelId}`"
          />
        </template>
        <template #right>
          <div class="flex items-center gap-2">
            <UButton
              :label="$t('templates.sync')"
              icon="i-lucide-refresh-cw"
              color="neutral"
              variant="soft"
              :loading="syncing"
              @click="onSync"
            />
            <UButton
              :label="$t('templates.create')"
              icon="i-lucide-plus"
              color="primary"
              :to="`/channels/${channelId}/templates/new`"
            />
          </div>
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
        </div>

        <!-- Table -->
        <UTable v-if="!loading && templates.length > 0" :data="templates" :columns="columns" sticky>
          <template #status-cell="{ row }">
            <UBadge
              :color="statusColor(row.original.status)"
              variant="subtle"
              size="xs"
            >
              {{ row.original.status }}
            </UBadge>
          </template>
          <template #actions-cell="{ row }">
            <div class="flex items-center gap-1">
              <UButton
                icon="i-lucide-eye"
                variant="ghost"
                color="neutral"
                size="xs"
                :to="`/templates/${row.original.id}`"
              />
              <UButton
                icon="i-lucide-pencil"
                variant="ghost"
                color="neutral"
                size="xs"
                :to="`/templates/${row.original.id}/edit`"
              />
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

        <div v-else-if="loading" class="flex items-center justify-center py-20">
          <UIcon name="i-lucide-loader-2" class="animate-spin size-5 text-[var(--ui-text-muted)]" />
        </div>

        <div v-else class="flex flex-col items-center justify-center py-20 gap-2 text-[var(--ui-text-muted)]">
          <UIcon name="i-lucide-file-text" class="size-10" />
          <span class="text-sm">{{ $t("templates.empty") }}</span>
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
                <h3 class="text-base font-semibold">{{ $t('templates.deleteConfirm', { name: deletingTemplate?.name }) }}</h3>
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
import type { TableColumn } from "@nuxt/ui";
import type { WhatsAppTemplateItem } from "~/types/api";

const { t } = useI18n();
const route = useRoute();
const toast = useToast();
const channelId = route.params.id as string;
const { templates, loading, syncing, fetchTemplates, syncTemplates, deleteTemplate } = useTemplates();

const search = ref("");
const statusFilter = ref("ALL");
const deleteModalOpen = ref(false);
const deletingTemplate = ref<WhatsAppTemplateItem | null>(null);
const deleting = ref(false);

const statusOptions = computed(() => [
  { label: t("templates.filter.all"), value: "ALL" },
  { label: t("templates.filter.approved"), value: "APPROVED" },
  { label: t("templates.filter.pending"), value: "PENDING" },
  { label: t("templates.filter.rejected"), value: "REJECTED" },
]);

const columns = computed<TableColumn<WhatsAppTemplateItem>[]>(() => [
  { accessorKey: "name", header: t("templates.name") },
  { accessorKey: "language", header: t("templates.language") },
  { accessorKey: "category", header: t("templates.category") },
  { id: "status", accessorKey: "status", header: t("templates.status") },
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

let debounceTimer: ReturnType<typeof setTimeout>;
function debouncedFetch() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    fetchTemplates(channelId, { status: statusFilter.value === "ALL" ? undefined : statusFilter.value, search: search.value || undefined });
  }, 300);
}

function onFilterChange() {
  fetchTemplates(channelId, { status: statusFilter.value === "ALL" ? undefined : statusFilter.value, search: search.value || undefined });
}

async function onSync() {
  try {
    await syncTemplates(channelId);
    toast.add({ title: t("templates.synced"), color: "success" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : t("templates.syncFailed");
    toast.add({ title: message, color: "error" });
  }
}

function confirmDelete(template: WhatsAppTemplateItem) {
  deletingTemplate.value = template;
  deleteModalOpen.value = true;
}

async function onDelete() {
  if (!deletingTemplate.value) return;
  deleting.value = true;
  try {
    await deleteTemplate(channelId, deletingTemplate.value.name);
    toast.add({ title: t("templates.deleted"), color: "success" });
    deleteModalOpen.value = false;
    await fetchTemplates(channelId, { status: statusFilter.value === "ALL" ? undefined : statusFilter.value, search: search.value || undefined });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : t("templates.deleteFailed");
    toast.add({ title: message, color: "error" });
  } finally {
    deleting.value = false;
  }
}

onMounted(() => {
  fetchTemplates(channelId);
});
</script>
