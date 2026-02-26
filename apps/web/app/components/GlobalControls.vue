<template>
  <div class="flex items-center gap-1">
    <UDropdownMenu :items="langMenuItems">
      <UButton variant="ghost" color="neutral" size="xs" square>
        <span class="text-sm leading-none">{{ currentLocaleFlag }}</span>
      </UButton>
    </UDropdownMenu>
    <UColorModeButton size="xs" variant="ghost" color="neutral" />
  </div>
</template>

<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";

const { locale, setLocale } = useI18n();

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
  hi: "हिन्दी",
  ar: "العربية",
  id: "Bahasa Indonesia",
  tr: "Türkçe",
};

const currentLocaleFlag = computed(() => localeFlags[locale.value] || "\u{1F310}");

const langMenuItems = computed<DropdownMenuItem[][]>(() => [
  Object.entries(localeNames).map(([code, name]) => ({
    label: `${localeFlags[code]} ${name}`,
    disabled: locale.value === code,
    onSelect: () => setLocale(code),
  })),
]);
</script>
