<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="$t('channels.addChannel')" icon="i-lucide-plus">
        <template #left>
          <UButton
            icon="i-lucide-arrow-left"
            variant="ghost"
            color="neutral"
            to="/channels"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-6 max-w-2xl">
        <form class="space-y-6" @submit.prevent="onSubmit">
          <UFormField :label="$t('channels.name')">
            <UInput
              v-model="form.name"
              :placeholder="$t('channels.namePlaceholder')"
              required
              class="w-full"
            />
          </UFormField>

          <UFormField :label="$t('channels.type')">
            <USelect
              v-model="form.type"
              :items="channelTypes"
              class="w-full"
            />
          </UFormField>

          <template v-if="form.type === 'whatsapp'">
            <UFormField :label="$t('channels.whatsapp.phoneNumberId')">
              <UInput
                v-model="form.config.phoneNumberId"
                placeholder="123456789"
                required
                class="w-full"
              />
            </UFormField>

            <UFormField :label="$t('channels.whatsapp.accessToken')">
              <UInput
                v-model="form.config.accessToken"
                placeholder="EAAx..."
                required
                class="w-full"
              />
            </UFormField>

            <UFormField :label="$t('channels.whatsapp.appSecret')">
              <UInput
                v-model="form.config.appSecret"
                placeholder="abc123..."
                class="w-full"
              />
            </UFormField>

            <UFormField :label="$t('channels.whatsapp.verifyToken')">
              <UInput
                v-model="form.config.verifyToken"
                placeholder="my-verify-token"
                class="w-full"
              />
            </UFormField>

            <UFormField :label="$t('channels.whatsapp.businessAccountId')">
              <UInput
                v-model="form.config.businessAccountId"
                placeholder="78910"
                class="w-full"
              />
            </UFormField>
          </template>

          <div class="flex justify-end">
            <UButton
              type="submit"
              :label="$t('channels.create')"
              icon="i-lucide-check"
              color="primary"
              :loading="submitting"
            />
          </div>
        </form>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
const { t } = useI18n();
const router = useRouter();
const toast = useToast();
const { createChannel } = useChannels();

const submitting = ref(false);

const channelTypes = [
  { label: "WhatsApp", value: "whatsapp" },
  { label: "Webchat (coming soon)", value: "webchat", disabled: true },
  { label: "Instagram (coming soon)", value: "instagram", disabled: true },
];

const form = reactive({
  name: "",
  type: "whatsapp",
  config: {
    phoneNumberId: "",
    accessToken: "",
    appSecret: "",
    verifyToken: "tercela-verify-token",
    businessAccountId: "",
  },
});

async function onSubmit() {
  submitting.value = true;
  try {
    await createChannel({
      type: form.type,
      name: form.name,
      config: { ...form.config },
    });
    toast.add({ title: t("channels.created"), color: "success" });
    router.push("/channels");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create channel";
    toast.add({ title: message, color: "error" });
  } finally {
    submitting.value = false;
  }
}
</script>
