<template>
  <UDashboardGroup>
    <UDashboardSidebar collapsible :default-size="15">
      <template #header="{ collapsed }">
        <div class="flex items-center gap-2.5 px-3 py-4">
          <UIcon name="i-lucide-radio" class="text-primary size-5 shrink-0" />
          <span v-if="!collapsed" class="font-semibold tracking-tight text-[var(--ui-text-highlighted)]">Tercela</span>
        </div>
      </template>

      <UNavigationMenu
        :items="navItems"
        orientation="vertical"
        highlight
      />

      <template #footer="{ collapsed }">
        <div class="p-2">
          <UDropdownMenu :items="userMenuItems">
            <UButton
              variant="ghost"
              color="neutral"
              block
              :square="collapsed"
              class="justify-start"
            >
              <UAvatar :alt="user?.name || 'U'" size="2xs" icon="i-lucide-user" />
              <span v-if="!collapsed" class="truncate text-sm">{{ user?.name || 'User' }}</span>
            </UButton>
          </UDropdownMenu>
        </div>
      </template>
    </UDashboardSidebar>

    <slot />
  </UDashboardGroup>
</template>

<script setup lang="ts">
import type { NavigationMenuItem, DropdownMenuItem } from "@nuxt/ui";

const { t } = useI18n();
const { user, logout } = useAuth();

const navItems = computed<NavigationMenuItem[][]>(() => [
  [
    { label: t("nav.conversations"), icon: "i-lucide-message-square", to: "/conversations" },
    { label: t("nav.contacts"), icon: "i-lucide-users", to: "/contacts" },
    { label: t("nav.channels"), icon: "i-lucide-radio", to: "/channels" },
  ],
  [
    { label: t("nav.settings"), icon: "i-lucide-settings", to: "/settings" },
  ],
]);

const userMenuItems = computed<DropdownMenuItem[][]>(() => [
  [
    { label: t("nav.settings"), icon: "i-lucide-settings", to: "/settings" },
  ],
  [
    {
      label: t("nav.signOut"),
      icon: "i-lucide-log-out",
      color: "error" as const,
      onSelect: () => logout(),
    },
  ],
]);
</script>
