<template>
  <div>
    <NuxtLayout name="auth">
      <div class="text-center mb-6">
        <UIcon name="i-lucide-radio" class="text-primary size-10 mb-2" />
        <h2 class="text-xl font-bold">Entrar no Tercela</h2>
        <p class="text-sm text-[var(--ui-text-muted)] mt-1">Plataforma omnichannel de atendimento</p>
      </div>

      <UForm :state="form" class="space-y-4" @submit="handleLogin">
        <UFormField label="Email" name="email">
          <UInput v-model="form.email" type="email" placeholder="seu@email.com" icon="i-lucide-mail" class="w-full" />
        </UFormField>
        <UFormField label="Senha" name="password">
          <UInput v-model="form.password" type="password" placeholder="••••••" icon="i-lucide-lock" class="w-full" />
        </UFormField>

        <UButton type="submit" block :loading="loading" icon="i-lucide-log-in" label="Entrar" />
      </UForm>

      <p v-if="error" class="mt-3 text-sm text-[var(--ui-text-error)] text-center">{{ error }}</p>
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false });

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
  } catch (e: any) {
    error.value = e.message || "Credenciais inválidas";
  } finally {
    loading.value = false;
  }
}
</script>
