<template>
  <UDashboardGroup>
    <UDashboardSidebar collapsible :default-size="15">
      <template #header="{ collapsed }">
        <div class="flex items-center gap-2 p-2">
          <UIcon name="i-lucide-radio" class="text-primary size-6 shrink-0" />
          <span v-if="!collapsed" class="font-bold text-lg">Tercela</span>
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
              <span v-if="!collapsed" class="truncate">{{ user?.name || 'Usuário' }}</span>
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

const { user, logout } = useAuth();

const navItems: NavigationMenuItem[][] = [
  [
    { label: "Conversas", icon: "i-lucide-message-square", to: "/conversations" },
    { label: "Contatos", icon: "i-lucide-users", to: "/contacts" },
  ],
  [
    { label: "Configurações", icon: "i-lucide-settings", to: "/settings" },
  ],
];

const userMenuItems: DropdownMenuItem[][] = [
  [
    { label: "Configurações", icon: "i-lucide-settings", to: "/settings" },
  ],
  [
    {
      label: "Sair",
      icon: "i-lucide-log-out",
      color: "error",
      onSelect: () => logout(),
    },
  ],
];
</script>
