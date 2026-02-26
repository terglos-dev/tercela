<template>
  <UApp :locale="nuxtUiLocale" :toaster="{ position: 'bottom-right', duration: 4000 }">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>

<script setup lang="ts">
const { locale } = useI18n();

const nuxtUiLocale = computed(() => ({
  code: locale.value,
}));

useHead({
  title: () => `Tercela`,
});
</script>
