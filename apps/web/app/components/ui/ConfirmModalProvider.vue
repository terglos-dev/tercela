<template>
  <UiConfirmModal
    v-model="open"
    :title="modal.state.title"
    :subtitle="modal.state.subtitle"
    :message="modal.state.message"
    :confirm-label="modal.state.confirmLabel"
    :cancel-label="modal.state.cancelLabel"
    :confirm-icon="modal.state.confirmIcon"
    :variant="modal.state.variant"
    :icon="modal.state.icon"
    :loading="modal.state.loading"
    @confirm="modal.onConfirm()"
    @cancel="modal.onCancel()"
  />
</template>

<script setup lang="ts">
const modal = useConfirmModal();
const open = modal.open;
</script>
