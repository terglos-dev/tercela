<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="$t('settings.title')" icon="i-lucide-settings">
        <template #right>
          <GlobalControls />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex h-full">
        <div class="w-48 shrink-0 border-r border-[var(--ui-border)]">
          <UNavigationMenu
            :items="sidebarItems"
            orientation="vertical"
            highlight
            :ui="{ list: 'gap-1 p-3', link: 'py-2', linkLeadingIcon: 'size-4.5' }"
          />
        </div>

        <div class="flex-1 overflow-y-auto p-6 max-w-4xl">
          <NuxtPage />
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";

const { t } = useI18n();
const route = useRoute();

const sidebarItems = computed<NavigationMenuItem[][]>(() => [
  [
    { label: t("settings.agents"), icon: "i-lucide-users", to: "/settings/agents", active: route.path === "/settings/agents" },
    { label: t("settings.account"), icon: "i-lucide-user-cog", to: "/settings/account", active: route.path === "/settings/account" },
    { label: t("settings.storage"), icon: "i-lucide-hard-drive", to: "/settings/storage", active: route.path === "/settings/storage" },
  ],
]);
</script>
