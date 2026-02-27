<template>
  <UModal v-model:open="model">
    <template #content>
      <div class="p-6 space-y-5">
        <!-- Header -->
        <div class="flex items-center gap-3">
          <div
            class="flex items-center justify-center size-10 rounded-full"
            :class="iconContainerClass"
          >
            <UIcon :name="resolvedIcon" class="size-5" :class="iconClass" />
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="text-base font-semibold text-[var(--ui-text)]">{{ title }}</h3>
            <p v-if="subtitle" class="text-sm text-[var(--ui-text-dimmed)] truncate">{{ subtitle }}</p>
          </div>
        </div>

        <!-- Message -->
        <p class="text-sm text-[var(--ui-text-muted)] leading-relaxed">{{ message }}</p>

        <!-- Actions -->
        <div class="flex justify-end gap-2 pt-1">
          <UButton
            :label="cancelLabel"
            color="neutral"
            variant="soft"
            @click="onCancel"
          />
          <UButton
            :label="confirmLabel"
            :color="resolvedColor"
            :icon="confirmIcon"
            :loading="loading"
            @click="onConfirm"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
export type ConfirmModalVariant = "danger" | "warning" | "info";

interface Props {
  title: string;
  subtitle?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmIcon?: string;
  variant?: ConfirmModalVariant;
  icon?: string;
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  variant: "danger",
  loading: false,
});

const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();

const model = defineModel<boolean>({ default: false });

const { t } = useI18n();

const confirmLabel = computed(() => props.confirmLabel || t("confirm.confirm"));
const cancelLabel = computed(() => props.cancelLabel || t("confirm.cancel"));

const variantMap = {
  danger: {
    color: "error" as const,
    icon: "i-lucide-triangle-alert",
    iconContainer: "bg-red-500/10 dark:bg-red-500/15",
    iconColor: "text-red-500",
  },
  warning: {
    color: "warning" as const,
    icon: "i-lucide-alert-circle",
    iconContainer: "bg-amber-500/10 dark:bg-amber-500/15",
    iconColor: "text-amber-500",
  },
  info: {
    color: "primary" as const,
    icon: "i-lucide-info",
    iconContainer: "bg-amber-500/10 dark:bg-amber-500/15",
    iconColor: "text-amber-500",
  },
};

const current = computed(() => variantMap[props.variant]);
const resolvedIcon = computed(() => props.icon || current.value.icon);
const resolvedColor = computed(() => current.value.color);
const iconContainerClass = computed(() => current.value.iconContainer);
const iconClass = computed(() => current.value.iconColor);

function onConfirm() {
  emit("confirm");
}

function onCancel() {
  model.value = false;
  emit("cancel");
}
</script>
