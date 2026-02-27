<template>
  <UDashboardGroup storage="cookie" storage-key="dashboard" :persistent="true">
    <UDashboardSidebar
      id="sidebar"
      collapsible
      resizable
      :default-size="15"
      :collapsed-size="0"
    >
      <template #header="{ collapsed, collapse }">
        <div class="flex items-center w-full" :class="collapsed ? 'justify-center' : 'justify-between'">
          <div class="flex items-center gap-2.5">
            <UIcon name="i-lucide-radio" class="text-primary size-5 shrink-0" />
            <span v-if="!collapsed" class="font-semibold tracking-tight text-[var(--ui-text-highlighted)]">Tercela</span>
          </div>
          <UButton
            :icon="collapsed ? 'i-lucide-chevrons-right' : 'i-lucide-chevrons-left'"
            variant="ghost"
            color="neutral"
            size="xs"
            @click="collapse(!collapsed)"
          />
        </div>
      </template>

      <UNavigationMenu
        :items="navItems"
        orientation="vertical"
        highlight
        :ui="{ list: 'gap-1.5 p-2', link: 'py-2.5', linkLeadingIcon: 'size-5' }"
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
              <UAvatar :alt="user?.name || 'U'" size="2xs" :color="avatarColor(user?.name || 'U')" />
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
import { avatarColor } from "~/utils/avatar";

const { t } = useI18n();
const route = useRoute();
const { user, logout } = useAuth();
const { totalUnread } = useUnreadCounts();

const navItems = computed<NavigationMenuItem[][]>(() => [
  [
    { label: t("nav.conversations"), icon: "i-lucide-message-square", to: "/conversations", active: route.path.startsWith("/conversations"), badge: totalUnread.value > 0 ? String(totalUnread.value) : undefined },
    { label: t("nav.contacts"), icon: "i-lucide-users", to: "/contacts", active: route.path.startsWith("/contacts") },
    { label: t("nav.channels"), icon: "i-lucide-radio", to: "/channels", active: route.path.startsWith("/channels") },
    { label: t("nav.templates"), icon: "i-lucide-file-text", to: "/templates", active: route.path.startsWith("/templates") },
  ],
  [
    { label: t("nav.settings"), icon: "i-lucide-settings", to: "/settings", active: route.path.startsWith("/settings") },
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
