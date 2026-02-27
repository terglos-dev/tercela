<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="$t('templates.edit')" icon="i-lucide-file-pen">
        <template #left>
          <UButton
            icon="i-lucide-arrow-left"
            variant="ghost"
            color="neutral"
            :to="`/templates/${templateId}`"
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

      <div v-else-if="template" class="p-6">
        <TemplatesTemplateForm
          mode="edit"
          :initial-data="template"
          :submitting="submitting"
          @submit="onSubmit"
        >
          <template #cancel>
            <UButton
              :label="$t('templates.cancel')"
              color="neutral"
              variant="soft"
              :to="`/templates/${templateId}`"
            />
          </template>
        </TemplatesTemplateForm>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
import type { TemplateWithChannel } from "~/types/api";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const toast = useToast();
const templateId = route.params.templateId as string;
const { fetchTemplateById, updateTemplate } = useTemplates();

const template = ref<TemplateWithChannel | null>(null);
const loading = ref(true);
const submitting = ref(false);

async function loadTemplate() {
  loading.value = true;
  try {
    template.value = await fetchTemplateById(templateId);
  } catch {
    toast.add({ title: t("templates.loadFailed"), color: "error" });
    router.push("/templates");
  } finally {
    loading.value = false;
  }
}

async function onSubmit(data: { name: string; language: string; category: string; components: Record<string, unknown>[] }) {
  if (!template.value) return;
  submitting.value = true;
  try {
    await updateTemplate(template.value.channelId, templateId, { components: data.components });
    toast.add({ title: t("templates.updated"), color: "success" });
    router.push(`/templates/${templateId}`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : t("templates.updateFailed");
    toast.add({ title: message, color: "error" });
  } finally {
    submitting.value = false;
  }
}

onMounted(() => {
  loadTemplate();
});
</script>
