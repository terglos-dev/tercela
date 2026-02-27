<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="$t('templates.create')" icon="i-lucide-file-plus">
        <template #left>
          <UButton
            icon="i-lucide-arrow-left"
            variant="ghost"
            color="neutral"
            :to="`/channels/${channelId}/templates`"
          />
        </template>
        <template #right>
          <GlobalControls />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-6">
        <TemplatesTemplateForm
          mode="create"
          :submitting="submitting"
          @submit="onSubmit"
        >
          <template #cancel>
            <UButton
              :label="$t('templates.cancel')"
              color="neutral"
              variant="soft"
              :to="`/channels/${channelId}/templates`"
            />
          </template>
        </TemplatesTemplateForm>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const toast = useToast();
const channelId = route.params.id as string;
const { createTemplate } = useTemplates();

const submitting = ref(false);

async function onSubmit(data: { name: string; language: string; category: string; components: Record<string, unknown>[] }) {
  submitting.value = true;
  try {
    await createTemplate(channelId, data);
    toast.add({ title: t("templates.created"), color: "success" });
    router.push(`/channels/${channelId}/templates`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : t("templates.createFailed");
    toast.add({ title: message, color: "error" });
  } finally {
    submitting.value = false;
  }
}
</script>
