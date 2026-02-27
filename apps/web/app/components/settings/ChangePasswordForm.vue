<template>
  <div class="space-y-6">
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-lock" class="size-5" />
          <h3 class="font-semibold">{{ $t("settings.changePassword") }}</h3>
        </div>
      </template>

      <UForm :state="form" class="space-y-4" @submit="handleSubmit">
        <UFormField :label="$t('settings.currentPassword')" name="currentPassword">
          <UInput
            v-model="form.currentPassword"
            type="password"
            :placeholder="$t('settings.currentPassword')"
            icon="i-lucide-lock"
            class="w-full"
          />
        </UFormField>

        <UFormField :label="$t('settings.newPassword')" name="newPassword">
          <UInput
            v-model="form.newPassword"
            type="password"
            :placeholder="$t('settings.newPasswordPlaceholder')"
            icon="i-lucide-key"
            class="w-full"
          />
        </UFormField>

        <UFormField :label="$t('settings.confirmPassword')" name="confirmPassword">
          <UInput
            v-model="form.confirmPassword"
            type="password"
            :placeholder="$t('settings.confirmPassword')"
            icon="i-lucide-key"
            class="w-full"
          />
        </UFormField>

        <UButton
          type="submit"
          icon="i-lucide-save"
          :label="$t('settings.updatePassword')"
          :loading="loading"
        />
      </UForm>
    </UCard>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n();
const toast = useToast();
const { changePassword } = useAuth();

const form = reactive({
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
});
const loading = ref(false);

async function handleSubmit() {
  if (form.newPassword !== form.confirmPassword) {
    toast.add({ title: t("settings.passwordMismatch"), icon: "i-lucide-alert-circle", color: "error" });
    return;
  }

  loading.value = true;
  try {
    await changePassword(form.currentPassword, form.newPassword);
    toast.add({ title: t("settings.passwordChanged"), icon: "i-lucide-check", color: "success" });
    Object.assign(form, { currentPassword: "", newPassword: "", confirmPassword: "" });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    toast.add({ title: t("settings.passwordChangeFailed"), description: message, icon: "i-lucide-alert-circle", color: "error" });
  } finally {
    loading.value = false;
  }
}
</script>
