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
        <div class="p-2 space-y-1">
          <!-- Language switcher -->
          <UDropdownMenu :items="langMenuItems">
            <UButton
              variant="ghost"
              color="neutral"
              block
              :square="collapsed"
              class="justify-start"
            >
              <span>{{ currentLocaleFlag }}</span>
              <span v-if="!collapsed" class="truncate">{{ currentLocaleName }}</span>
            </UButton>
          </UDropdownMenu>

          <!-- User menu -->
          <UDropdownMenu :items="userMenuItems">
            <UButton
              variant="ghost"
              color="neutral"
              block
              :square="collapsed"
              class="justify-start"
            >
              <UAvatar :alt="user?.name || 'U'" size="2xs" icon="i-lucide-user" />
              <span v-if="!collapsed" class="truncate">{{ user?.name || 'User' }}</span>
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

const { t, locale, setLocale } = useI18n();
const { user, logout } = useAuth();

const localeFlags: Record<string, string> = {
  en: "\u{1F1FA}\u{1F1F8}",
  es: "\u{1F1EA}\u{1F1F8}",
  hi: "\u{1F1EE}\u{1F1F3}",
  ar: "\u{1F1F8}\u{1F1E6}",
  id: "\u{1F1EE}\u{1F1E9}",
  tr: "\u{1F1F9}\u{1F1F7}",
};

const localeNames: Record<string, string> = {
  en: "English",
  es: "Español",
  hi: "\u0939\u093F\u0928\u094D\u0926\u0940",
  ar: "\u0627\u0644\u0639\u0631\u0628\u064A\u0629",
  id: "Bahasa Indonesia",
  tr: "Türkçe",
};

const currentLocaleFlag = computed(() => localeFlags[locale.value] || "\u{1F310}");
const currentLocaleName = computed(() => localeNames[locale.value] || locale.value);

const navItems = computed<NavigationMenuItem[][]>(() => [
  [
    { label: t("nav.conversations"), icon: "i-lucide-message-square", to: "/conversations" },
    { label: t("nav.contacts"), icon: "i-lucide-users", to: "/contacts" },
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

const langMenuItems = computed<DropdownMenuItem[][]>(() => [
  Object.entries(localeNames).map(([code, name]) => ({
    label: `${localeFlags[code]} ${name}`,
    disabled: locale.value === code,
    onSelect: () => setLocale(code),
  })),
]);
</script>
