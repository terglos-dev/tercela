<template>
  <div class="max-w-2xl">
    <form class="space-y-6" @submit.prevent="onSubmit">
      <!-- Name -->
      <UFormField :label="$t('templates.name')" :hint="$t('templates.nameHint')">
        <UInput
          v-model="form.name"
          :placeholder="$t('templates.namePlaceholder')"
          required
          :disabled="mode === 'edit'"
          class="w-full"
        />
      </UFormField>

      <!-- Language -->
      <UFormField :label="$t('templates.language')">
        <USelect
          v-model="form.language"
          :items="languageOptions"
          :disabled="mode === 'edit'"
          class="w-full"
        />
      </UFormField>

      <!-- Category -->
      <UFormField :label="$t('templates.category')">
        <USelect
          v-model="form.category"
          :items="categoryOptions"
          :disabled="mode === 'edit'"
          class="w-full"
        />
      </UFormField>

      <!-- Header (optional) -->
      <div class="space-y-2 rounded-lg border border-[var(--ui-border)] p-4">
        <div class="flex items-center justify-between">
          <p class="text-sm font-medium">{{ $t('templates.headerOptional') }}</p>
          <USwitch v-model="includeHeader" />
        </div>
        <UInput
          v-if="includeHeader"
          v-model="form.headerText"
          :placeholder="$t('templates.headerText')"
          class="w-full"
        />
      </div>

      <!-- Body (required) -->
      <UFormField :label="$t('templates.body')" :hint="$t('templates.bodyHint')">
        <UTextarea
          v-model="form.body"
          :placeholder="$t('templates.bodyPlaceholder')"
          required
          :rows="4"
          class="w-full"
        />
        <template v-if="detectedVars.length > 0" #description>
          <span class="text-xs text-[var(--ui-text-muted)]">
            {{ $t('templates.bodyHint') }}: {{ detectedVars.join(', ') }}
          </span>
        </template>
      </UFormField>

      <!-- Footer (optional) -->
      <div class="space-y-2 rounded-lg border border-[var(--ui-border)] p-4">
        <div class="flex items-center justify-between">
          <p class="text-sm font-medium">{{ $t('templates.footerOptional') }}</p>
          <USwitch v-model="includeFooter" />
        </div>
        <template v-if="includeFooter">
          <UInput
            v-model="form.footerText"
            :placeholder="$t('templates.footerPlaceholder')"
            :maxlength="60"
            class="w-full"
          />
          <p class="text-xs text-[var(--ui-text-muted)] text-right">
            {{ $t('templates.charCount', { count: form.footerText.length, max: 60 }) }}
          </p>
        </template>
      </div>

      <!-- Buttons (optional) -->
      <div class="space-y-3 rounded-lg border border-[var(--ui-border)] p-4">
        <p class="text-sm font-medium">{{ $t('templates.buttonsOptional') }}</p>

        <div v-for="(btn, idx) in form.buttons" :key="idx" class="flex items-start gap-2 p-3 rounded border border-[var(--ui-border)]">
          <div class="flex-1 space-y-2">
            <USelect
              v-model="btn.type"
              :items="buttonTypeOptions"
              class="w-full"
            />
            <UInput
              v-model="btn.text"
              :placeholder="$t('templates.buttonText')"
              required
              class="w-full"
            />
            <UInput
              v-if="btn.type === 'URL'"
              v-model="btn.url"
              :placeholder="$t('templates.buttonUrl')"
              type="url"
              class="w-full"
            />
            <UInput
              v-if="btn.type === 'PHONE_NUMBER'"
              v-model="btn.phone_number"
              :placeholder="$t('templates.buttonPhone')"
              class="w-full"
            />
            <UInput
              v-if="btn.type === 'COPY_CODE'"
              v-model="btn.example"
              :placeholder="$t('templates.buttonCopyCodePlaceholder')"
              class="w-full"
            />
          </div>
          <UButton
            icon="i-lucide-x"
            variant="ghost"
            color="error"
            size="xs"
            @click="form.buttons.splice(idx, 1)"
          />
        </div>

        <UButton
          v-if="form.buttons.length < 10"
          :label="$t('templates.addButton')"
          icon="i-lucide-plus"
          variant="soft"
          color="neutral"
          size="sm"
          @click="addButton"
        />
      </div>

      <!-- Actions -->
      <div class="flex justify-end gap-2">
        <slot name="cancel" />
        <UButton
          type="submit"
          :label="mode === 'edit' ? $t('templates.update') : $t('templates.create')"
          icon="i-lucide-check"
          color="primary"
          :loading="submitting"
        />
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
interface ButtonField {
  type: string;
  text: string;
  url?: string;
  phone_number?: string;
  example?: string;
}

interface FormData {
  name: string;
  language: string;
  category: string;
  components: Record<string, unknown>[];
}

interface InitialData {
  name: string;
  language: string;
  category: string;
  components: Record<string, unknown>[];
}

const props = withDefaults(defineProps<{
  mode: "create" | "edit";
  initialData?: InitialData;
  submitting?: boolean;
}>(), {
  submitting: false,
});

const emit = defineEmits<{
  submit: [data: FormData];
}>();

const includeHeader = ref(false);
const includeFooter = ref(false);

const form = reactive({
  name: "",
  language: "en_US",
  category: "UTILITY",
  headerText: "",
  body: "",
  footerText: "",
  buttons: [] as ButtonField[],
});

const languageOptions = [
  { label: "English (US)", value: "en_US" },
  { label: "English (UK)", value: "en_GB" },
  { label: "Portugu\u00eas (BR)", value: "pt_BR" },
  { label: "Espa\u00f1ol", value: "es" },
  { label: "Espa\u00f1ol (AR)", value: "es_AR" },
  { label: "Espa\u00f1ol (MX)", value: "es_MX" },
  { label: "Fran\u00e7ais", value: "fr" },
  { label: "Deutsch", value: "de" },
  { label: "Italiano", value: "it" },
  { label: "\u0627\u0644\u0639\u0631\u0628\u064a\u0629", value: "ar" },
  { label: "\u0939\u093f\u0928\u094d\u0926\u0940", value: "hi" },
  { label: "Bahasa Indonesia", value: "id" },
  { label: "T\u00fcrk\u00e7e", value: "tr" },
  { label: "\u65e5\u672c\u8a9e", value: "ja" },
  { label: "\u4e2d\u6587(\u7b80\u4f53)", value: "zh_CN" },
];

const categoryOptions = [
  { label: "UTILITY", value: "UTILITY" },
  { label: "MARKETING", value: "MARKETING" },
  { label: "AUTHENTICATION", value: "AUTHENTICATION" },
];

const buttonTypeOptions = [
  { label: "Quick Reply", value: "QUICK_REPLY" },
  { label: "URL", value: "URL" },
  { label: "Phone Number", value: "PHONE_NUMBER" },
  { label: "Copy Code", value: "COPY_CODE" },
];

const detectedVars = computed(() => {
  const matches = form.body.match(/\{\{(\d+)\}\}/g);
  return matches ? [...new Set(matches)] : [];
});

function addButton() {
  form.buttons.push({ type: "QUICK_REPLY", text: "" });
}

function buildComponents() {
  const components: Record<string, unknown>[] = [];

  if (includeHeader.value && form.headerText.trim()) {
    components.push({ type: "HEADER", format: "TEXT", text: form.headerText.trim() });
  }

  components.push({ type: "BODY", text: form.body.trim() });

  if (includeFooter.value && form.footerText.trim()) {
    components.push({ type: "FOOTER", text: form.footerText.trim() });
  }

  if (form.buttons.length > 0) {
    components.push({
      type: "BUTTONS",
      buttons: form.buttons.map((btn) => {
        const b: Record<string, unknown> = { type: btn.type, text: btn.text };
        if (btn.type === "URL" && btn.url) b.url = btn.url;
        if (btn.type === "PHONE_NUMBER" && btn.phone_number) b.phone_number = btn.phone_number;
        if (btn.type === "COPY_CODE" && btn.example) b.example = [btn.example];
        return b;
      }),
    });
  }

  return components;
}

function decomposeComponents(components: Record<string, unknown>[]) {
  for (const comp of components) {
    switch (comp.type) {
      case "HEADER":
        if (comp.format === "TEXT" && comp.text) {
          includeHeader.value = true;
          form.headerText = comp.text as string;
        }
        break;
      case "BODY":
        form.body = (comp.text as string) || "";
        break;
      case "FOOTER":
        includeFooter.value = true;
        form.footerText = (comp.text as string) || "";
        break;
      case "BUTTONS": {
        const btns = comp.buttons as { type: string; text: string; url?: string; phone_number?: string; example?: string[] }[];
        if (btns) {
          form.buttons = btns.map((btn) => ({
            type: btn.type,
            text: btn.text,
            url: btn.url,
            phone_number: btn.phone_number,
            example: btn.example?.[0],
          }));
        }
        break;
      }
    }
  }
}

function onSubmit() {
  emit("submit", {
    name: form.name.trim(),
    language: form.language,
    category: form.category,
    components: buildComponents(),
  });
}

// Initialize form from initial data (edit mode)
if (props.initialData) {
  form.name = props.initialData.name;
  form.language = props.initialData.language;
  form.category = props.initialData.category;
  if (props.initialData.components) {
    decomposeComponents(props.initialData.components);
  }
}
</script>
