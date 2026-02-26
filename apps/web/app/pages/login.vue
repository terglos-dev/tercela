<template>
  <div>
    <NuxtLayout name="auth">
      <div class="text-center mb-6">
        <UIcon name="i-lucide-radio" class="text-primary size-10 mb-2" />
        <h2 class="text-xl font-bold">{{ $t("login.title") }}</h2>
        <p class="text-sm text-[var(--ui-text-muted)] mt-1">{{ $t("login.subtitle") }}</p>
      </div>

      <UForm :state="form" class="space-y-4" @submit="handleLogin">
        <UFormField :label="$t('login.email')" name="email">
          <UInput v-model="form.email" type="email" :placeholder="$t('login.emailPlaceholder')" icon="i-lucide-mail" class="w-full" />
        </UFormField>
        <UFormField :label="$t('login.password')" name="password">
          <UInput v-model="form.password" type="password" placeholder="••••••" icon="i-lucide-lock" class="w-full" />
        </UFormField>

        <UButton type="submit" block :loading="loading" icon="i-lucide-log-in" :label="$t('login.submit')" />
      </UForm>

      <p v-if="error" class="mt-3 text-sm text-[var(--ui-text-error)] text-center">{{ error }}</p>
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false });

const { t } = useI18n();
const form = reactive({ email: "", password: "" });
const error = ref("");
const loading = ref(false);
const { login } = useAuth();

async function handleLogin() {
  error.value = "";
  loading.value = true;
  try {
    await login(form.email, form.password);
    navigateTo("/conversations");
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : t("login.error");
  } finally {
    loading.value = false;
  }
}
</script>
