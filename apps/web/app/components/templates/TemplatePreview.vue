<template>
  <div class="flex justify-end">
    <div class="max-w-xs w-full">
      <!-- Bubble -->
      <div class="rounded-lg bg-[#e7fed6] dark:bg-[#025144] shadow-sm overflow-hidden">
        <!-- Header -->
        <div v-if="header" class="px-3 pt-3 pb-1">
          <template v-if="header.format === 'IMAGE'">
            <div class="flex items-center justify-center h-32 rounded bg-[var(--ui-bg-muted)] text-[var(--ui-text-muted)]">
              <UIcon name="i-lucide-image" class="size-8" />
            </div>
          </template>
          <template v-else-if="header.format === 'VIDEO'">
            <div class="flex items-center justify-center h-32 rounded bg-[var(--ui-bg-muted)] text-[var(--ui-text-muted)]">
              <UIcon name="i-lucide-video" class="size-8" />
            </div>
          </template>
          <template v-else-if="header.format === 'DOCUMENT'">
            <div class="flex items-center justify-center h-16 rounded bg-[var(--ui-bg-muted)] text-[var(--ui-text-muted)]">
              <UIcon name="i-lucide-file-text" class="size-8" />
            </div>
          </template>
          <template v-else>
            <p class="text-sm font-bold text-[var(--ui-text)]" v-html="highlightVars(header.text || '')" />
          </template>
        </div>

        <!-- Body -->
        <div v-if="body" class="px-3 py-1">
          <p class="text-sm text-[var(--ui-text)] whitespace-pre-wrap" v-html="highlightVars(body.text || '')" />
        </div>

        <!-- Footer -->
        <div v-if="footer" class="px-3 pb-2">
          <p class="text-xs text-[var(--ui-text-muted)]">{{ footer.text }}</p>
        </div>
      </div>

      <!-- Buttons -->
      <div v-if="buttons && buttons.buttons?.length" class="mt-1 space-y-1">
        <div
          v-for="(btn, idx) in buttons.buttons"
          :key="idx"
          class="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#e7fed6] dark:bg-[#025144] shadow-sm text-sm text-[#00a884] font-medium"
        >
          <UIcon v-if="btn.type === 'URL'" name="i-lucide-external-link" class="size-3.5" />
          <UIcon v-else-if="btn.type === 'PHONE_NUMBER'" name="i-lucide-phone" class="size-3.5" />
          <UIcon v-else-if="btn.type === 'COPY_CODE'" name="i-lucide-copy" class="size-3.5" />
          <UIcon v-else name="i-lucide-reply" class="size-3.5" />
          <span>{{ btn.text }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Component {
  type?: string;
  format?: string;
  text?: string;
  buttons?: { type: string; text: string; url?: string; phone_number?: string }[];
  [key: string]: unknown;
}

const props = defineProps<{
  components: Component[];
}>();

const header = computed(() => props.components.find((c) => c.type === "HEADER"));
const body = computed(() => props.components.find((c) => c.type === "BODY"));
const footer = computed(() => props.components.find((c) => c.type === "FOOTER"));
const buttons = computed(() => props.components.find((c) => c.type === "BUTTONS"));

function highlightVars(text: string) {
  return text.replace(
    /\{\{(\d+)\}\}/g,
    '<span class="inline-block px-1 py-0.5 rounded text-xs font-mono bg-[#00a884]/15 text-[#00a884]">{{$1}}</span>',
  );
}
</script>
