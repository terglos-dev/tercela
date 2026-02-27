<template>
  <div class="space-y-6">
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-users" class="size-5" />
          <h3 class="font-semibold">{{ $t("settings.agents") }}</h3>
        </div>
      </template>

      <div v-if="usersLoading" class="flex items-center justify-center py-8">
        <UIcon name="i-lucide-loader-2" class="animate-spin size-5 text-[var(--ui-text-muted)]" />
      </div>

      <UTable v-else-if="usersList.length > 0" :data="usersList" :columns="userColumns">
        <template #role-cell="{ row }">
          <UBadge
            :color="row.original.role === 'admin' ? 'error' : 'info'"
            variant="subtle"
            size="xs"
            :icon="row.original.role === 'admin' ? 'i-lucide-shield' : 'i-lucide-headset'"
          >
            {{ row.original.role }}
          </UBadge>
        </template>
        <template #status-cell="{ row }">
          <UBadge
            :color="row.original.status === 'active' ? 'success' : 'warning'"
            variant="subtle"
            size="xs"
          >
            {{ row.original.status === 'active' ? $t('settings.statusActive') : $t('settings.statusBlocked') }}
          </UBadge>
        </template>
        <template #actions-cell="{ row }">
          <div v-if="row.original.id !== currentUserId" class="flex items-center gap-1">
            <UButton
              v-if="row.original.status === 'active'"
              size="xs"
              color="warning"
              variant="soft"
              icon="i-lucide-ban"
              :label="$t('settings.block')"
              @click="handleBlock(row.original.id)"
            />
            <UButton
              v-else
              size="xs"
              color="success"
              variant="soft"
              icon="i-lucide-check-circle"
              :label="$t('settings.activate')"
              @click="handleActivate(row.original.id)"
            />
            <UButton
              size="xs"
              color="error"
              variant="soft"
              icon="i-lucide-trash-2"
              :label="$t('settings.delete')"
              @click="handleDelete(row.original.id)"
            />
          </div>
        </template>
      </UTable>
    </UCard>

    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-user-plus" class="size-5" />
          <h3 class="font-semibold">{{ $t("settings.newAgent") }}</h3>
        </div>
      </template>

      <UForm :state="newUser" class="grid grid-cols-2 gap-4" @submit="handleCreateUser">
        <UFormField :label="$t('settings.name')" name="name">
          <UInput v-model="newUser.name" :placeholder="$t('settings.namePlaceholder')" icon="i-lucide-user" class="w-full" />
        </UFormField>
        <UFormField :label="$t('settings.email')" name="email">
          <UInput v-model="newUser.email" type="email" :placeholder="$t('settings.emailPlaceholder')" icon="i-lucide-mail" class="w-full" />
        </UFormField>
        <UFormField :label="$t('settings.password')" name="password">
          <UInput v-model="newUser.password" type="password" :placeholder="$t('settings.passwordPlaceholder')" icon="i-lucide-lock" class="w-full" />
        </UFormField>
        <UFormField :label="$t('settings.role')" name="role">
          <USelect v-model="newUser.role" :items="['agent', 'admin']" class="w-full" />
        </UFormField>
        <div class="col-span-2">
          <UButton type="submit" icon="i-lucide-plus" :label="$t('settings.createAgent')" />
        </div>
      </UForm>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";
import type { UserListItem } from "~/types/api";

const { t } = useI18n();
const toast = useToast();
const { confirm: confirmModal } = useConfirmModal();
const { user: currentUser } = useAuth();
const { users: usersList, loading: usersLoading, fetchUsers, createUser, blockUser, activateUser, deleteUser } = useUsers();
const newUser = reactive({ name: "", email: "", password: "", role: "agent" });

const currentUserId = computed(() => currentUser.value?.id);

const userColumns = computed<TableColumn<UserListItem>[]>(() => [
  { accessorKey: "name", header: t("settings.name") },
  { accessorKey: "email", header: t("settings.email") },
  { accessorKey: "role", header: t("settings.role") },
  { accessorKey: "status", header: t("settings.status") },
  { accessorKey: "actions", header: t("settings.actions") },
]);

onMounted(() => fetchUsers());

async function handleCreateUser() {
  try {
    await createUser({ ...newUser });
    Object.assign(newUser, { name: "", email: "", password: "", role: "agent" });
    toast.add({ title: t("settings.agentCreated"), icon: "i-lucide-check", color: "success" });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    toast.add({ title: t("settings.createFailed"), description: message, icon: "i-lucide-alert-circle", color: "error" });
  }
}

async function handleBlock(id: string) {
  try {
    await blockUser(id);
    toast.add({ title: t("settings.userBlocked"), icon: "i-lucide-ban", color: "success" });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    toast.add({ title: message, icon: "i-lucide-alert-circle", color: "error" });
  }
}

async function handleActivate(id: string) {
  try {
    await activateUser(id);
    toast.add({ title: t("settings.userActivated"), icon: "i-lucide-check-circle", color: "success" });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    toast.add({ title: message, icon: "i-lucide-alert-circle", color: "error" });
  }
}

async function handleDelete(id: string) {
  const user = usersList.value.find((u) => u.id === id);
  const confirmed = await confirmModal({
    title: t("settings.deleteUser"),
    subtitle: user?.name,
    message: t("settings.deleteConfirm"),
    confirmLabel: t("settings.delete"),
    confirmIcon: "i-lucide-trash-2",
    variant: "danger",
  });
  if (!confirmed) return;

  try {
    await deleteUser(id);
    toast.add({ title: t("settings.userDeleted"), icon: "i-lucide-trash-2", color: "success" });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    toast.add({ title: message, icon: "i-lucide-alert-circle", color: "error" });
  }
}
</script>
