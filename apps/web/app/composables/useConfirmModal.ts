import type { ConfirmModalVariant } from "~/components/ui/ConfirmModal.vue";

export interface ConfirmModalOptions {
  title: string;
  subtitle?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmIcon?: string;
  variant?: ConfirmModalVariant;
  icon?: string;
}

interface ConfirmModalState extends ConfirmModalOptions {
  open: boolean;
  loading: boolean;
  resolve: ((value: boolean) => void) | null;
}

const state = reactive<ConfirmModalState>({
  open: false,
  loading: false,
  resolve: null,
  title: "",
  message: "",
});

export function useConfirmModal() {
  function confirm(options: ConfirmModalOptions): Promise<boolean> {
    Object.assign(state, {
      ...options,
      open: true,
      loading: false,
      resolve: null,
    });

    return new Promise<boolean>((resolve) => {
      state.resolve = resolve;
    });
  }

  function onConfirm() {
    state.resolve?.(true);
    state.open = false;
    state.loading = false;
  }

  function onCancel() {
    state.resolve?.(false);
    state.open = false;
    state.loading = false;
  }

  function setLoading(value: boolean) {
    state.loading = value;
  }

  return {
    state: readonly(state) as Readonly<ConfirmModalState>,
    open: computed({
      get: () => state.open,
      set: (v: boolean) => {
        state.open = v;
        if (!v) state.resolve?.(false);
      },
    }),
    loading: computed(() => state.loading),
    confirm,
    onConfirm,
    onCancel,
    setLoading,
  };
}
