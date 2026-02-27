<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="template?.name || '...'" icon="i-lucide-file-text">
        <template #left>
          <UButton
            icon="i-lucide-arrow-left"
            variant="ghost"
            color="neutral"
            :to="`/channels/${channelId}/templates`"
          />
        </template>
        <template #right>
          <div class="flex items-center gap-2">
            <UTooltip v-if="!isEditable" :text="$t('templates.approvedCannotEdit')">
              <UButton
                :label="$t('templates.edit')"
                icon="i-lucide-pencil"
                color="neutral"
                variant="soft"
                disabled
              />
            </UTooltip>
            <UButton
              v-else
              :label="$t('templates.edit')"
              icon="i-lucide-pencil"
              color="neutral"
              variant="soft"
              :to="`/channels/${channelId}/templates/${templateId}/edit`"
            />
            <UButton
              :label="$t('templates.delete')"
              icon="i-lucide-trash-2"
              color="error"
              variant="soft"
              @click="deleteModalOpen = true"
            />
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div v-if="loading" class="flex items-center justify-center py-20">
        <UIcon name="i-lucide-loader-2" class="animate-spin size-5 text-[var(--ui-text-muted)]" />
      </div>

      <div v-else-if="template" class="p-6 space-y-6">
        <!-- Metadata -->
        <div class="rounded-lg border border-[var(--ui-border)] p-4 space-y-3">
          <h3 class="text-sm font-semibold text-[var(--ui-text-muted)]">{{ $t('templates.metadata') }}</h3>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p class="text-[var(--ui-text-muted)]">{{ $t('templates.name') }}</p>
              <p class="font-medium font-mono">{{ template.name }}</p>
            </div>
            <div>
              <p class="text-[var(--ui-text-muted)]">{{ $t('templates.language') }}</p>
              <p class="font-medium">{{ template.language }}</p>
            </div>
            <div>
              <p class="text-[var(--ui-text-muted)]">{{ $t('templates.category') }}</p>
              <p class="font-medium">{{ template.category }}</p>
            </div>
            <div>
              <p class="text-[var(--ui-text-muted)]">{{ $t('templates.status') }}</p>
              <UBadge :color="statusColor(template.status)" variant="subtle" size="xs">
                {{ template.status }}
              </UBadge>
            </div>
            <div v-if="template.metaId">
              <p class="text-[var(--ui-text-muted)]">{{ $t('templates.metaId') }}</p>
              <p class="font-medium font-mono text-xs">{{ template.metaId }}</p>
            </div>
            <div>
              <p class="text-[var(--ui-text-muted)]">{{ $t('templates.createdAt') }}</p>
              <p class="font-medium text-xs">{{ formatDate(template.createdAt) }}</p>
            </div>
            <div>
              <p class="text-[var(--ui-text-muted)]">{{ $t('templates.updatedAt') }}</p>
              <p class="font-medium text-xs">{{ formatDate(template.updatedAt) }}</p>
            </div>
            <div>
              <p class="text-[var(--ui-text-muted)]">{{ $t('templates.syncedAt') }}</p>
              <p class="font-medium text-xs">{{ formatDate(template.syncedAt) }}</p>
            </div>
          </div>
        </div>

        <!-- Preview -->
        <div class="space-y-3">
          <h3 class="text-sm font-semibold text-[var(--ui-text-muted)]">{{ $t('templates.preview') }}</h3>
          <TemplatesTemplatePreview :components="template.components" />
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
                <h3 class="text-base font-semibold">{{ $t('templates.deleteConfirm', { name: template?.name }) }}</h3>
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
import type { WhatsAppTemplateItem } from "~/types/api";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const toast = useToast();
const channelId = route.params.id as string;
const templateId = route.params.templateId as string;
const { fetchTemplate, deleteTemplate } = useTemplates();

const template = ref<WhatsAppTemplateItem | null>(null);
const loading = ref(true);
const deleteModalOpen = ref(false);
const deleting = ref(false);

const isEditable = computed(() => {
  return template.value?.status === "PENDING" || template.value?.status === "REJECTED";
});

function statusColor(status: string): "success" | "warning" | "error" | "neutral" {
  switch (status) {
    case "APPROVED": return "success";
    case "PENDING": return "warning";
    case "REJECTED": return "error";
    default: return "neutral";
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString();
}

async function loadTemplate() {
  loading.value = true;
  try {
    template.value = await fetchTemplate(channelId, templateId);
  } catch {
    toast.add({ title: t("templates.loadFailed"), color: "error" });
    router.push(`/channels/${channelId}/templates`);
  } finally {
    loading.value = false;
  }
}

async function onDelete() {
  if (!template.value) return;
  deleting.value = true;
  try {
    await deleteTemplate(channelId, template.value.name);
    toast.add({ title: t("templates.deleted"), color: "success" });
    router.push(`/channels/${channelId}/templates`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : t("templates.deleteFailed");
    toast.add({ title: message, color: "error" });
  } finally {
    deleting.value = false;
  }
}

onMounted(() => {
  loadTemplate();
});
</script>
