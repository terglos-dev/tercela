<template>
  <div class="space-y-6">
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-hard-drive" class="size-5" />
          <h3 class="font-semibold">{{ $t("settings.storage") }}</h3>
        </div>
        <p class="text-sm text-[var(--ui-text-muted)] mt-1">{{ $t("settings.storageDescription") }}</p>
      </template>

      <UForm :state="form" class="space-y-4" @submit="handleSave">
        <UFormField :label="$t('settings.storageProvider')" name="provider">
          <USelect
            v-model="form.provider"
            :items="providerOptions"
            class="w-full"
            @update:model-value="onProviderChange"
          />
        </UFormField>

        <UFormField :label="$t('settings.storageEndpoint')" name="endpoint">
          <UInput
            v-model="form.endpoint"
            :placeholder="endpointPlaceholder"
            :disabled="form.provider === 'aws'"
            icon="i-lucide-globe"
            class="w-full"
          />
        </UFormField>

        <div class="grid grid-cols-2 gap-4">
          <UFormField :label="$t('settings.storageRegion')" name="region">
            <UInput v-model="form.region" placeholder="us-east-1" icon="i-lucide-map-pin" class="w-full" />
          </UFormField>

          <UFormField :label="$t('settings.storageBucket')" name="bucket">
            <UInput v-model="form.bucket" placeholder="my-bucket" icon="i-lucide-database" class="w-full" />
          </UFormField>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <UFormField :label="$t('settings.storageAccessKey')" name="accessKeyId">
            <UInput v-model="form.accessKeyId" placeholder="AKIA..." icon="i-lucide-key" class="w-full" />
          </UFormField>

          <UFormField :label="$t('settings.storageSecretKey')" name="secretAccessKey">
            <UInput v-model="form.secretAccessKey" type="password" placeholder="••••••••" icon="i-lucide-lock" class="w-full" />
          </UFormField>
        </div>

        <UFormField :label="$t('settings.storagePathPrefix')" name="pathPrefix">
          <UInput v-model="form.pathPrefix" placeholder="media/" icon="i-lucide-folder" class="w-full" />
        </UFormField>

        <!-- Test result -->
        <div v-if="testResult !== null" class="flex items-center gap-2 text-sm">
          <UIcon
            :name="testResult ? 'i-lucide-check-circle' : 'i-lucide-x-circle'"
            :class="testResult ? 'text-[var(--ui-success)]' : 'text-[var(--ui-error)]'"
            class="size-4"
          />
          <span :class="testResult ? 'text-[var(--ui-success)]' : 'text-[var(--ui-error)]'">
            {{ testResult ? $t("settings.storageTestSuccess") : testError }}
          </span>
        </div>

        <div class="flex gap-2">
          <UButton
            type="button"
            variant="outline"
            icon="i-lucide-plug"
            :label="$t('settings.storageTestConnection')"
            :loading="testing"
            @click="handleTest"
          />
          <UButton
            type="submit"
            icon="i-lucide-save"
            :label="$t('settings.storageSave')"
            :loading="saving"
          />
        </div>
      </UForm>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { StorageConfig } from "~/types/api";

const { t } = useI18n();
const toast = useToast();
const { fetchSettings, saveSetting, testStorage, getSettingValue } = useSettings();

const form = reactive<StorageConfig>({
  provider: "aws",
  endpoint: "",
  region: "",
  bucket: "",
  accessKeyId: "",
  secretAccessKey: "",
  pathPrefix: "",
});

const testing = ref(false);
const saving = ref(false);
const testResult = ref<boolean | null>(null);
const testError = ref("");

const providerOptions = [
  { label: "AWS S3", value: "aws" },
  { label: "MinIO", value: "minio" },
  { label: "Cloudflare R2", value: "r2" },
  { label: "DigitalOcean Spaces", value: "spaces" },
  { label: "Custom", value: "custom" },
];

const endpointPlaceholder = computed(() => {
  switch (form.provider) {
    case "aws": return "https://s3.amazonaws.com";
    case "r2": return "https://<account-id>.r2.cloudflarestorage.com";
    case "spaces": return "https://<region>.digitaloceanspaces.com";
    case "minio": return "http://localhost:9000";
    default: return "https://s3-compatible-endpoint.com";
  }
});

function onProviderChange(provider: string) {
  if (provider === "aws") {
    form.endpoint = "";
  } else if (provider === "r2") {
    form.endpoint = form.endpoint || "";
  } else if (provider === "spaces") {
    form.endpoint = form.endpoint || "";
  }
  testResult.value = null;
}

async function handleTest() {
  testing.value = true;
  testResult.value = null;
  testError.value = "";
  try {
    await testStorage({ ...form });
    testResult.value = true;
  } catch (e: unknown) {
    testResult.value = false;
    testError.value = e instanceof Error ? e.message : String(e);
  } finally {
    testing.value = false;
  }
}

async function handleSave() {
  saving.value = true;
  try {
    await saveSetting("storage", { ...form });
    toast.add({ title: t("settings.storageSaved"), icon: "i-lucide-check", color: "success" });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    toast.add({ title: t("settings.storageSaveFailed"), description: message, icon: "i-lucide-alert-circle", color: "error" });
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  await fetchSettings();
  const stored = getSettingValue<StorageConfig>("storage");
  if (stored) {
    Object.assign(form, stored);
  }
});
</script>
