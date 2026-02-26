<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Settings" icon="i-lucide-settings">
        <template #right>
          <UColorModeButton />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-6 max-w-4xl space-y-6">
        <!-- Agents -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-users" class="size-5" />
              <h3 class="font-semibold">Agents</h3>
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
          </UTable>
        </UCard>

        <!-- New agent -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-user-plus" class="size-5" />
              <h3 class="font-semibold">New Agent</h3>
            </div>
          </template>

          <UForm :state="newUser" class="grid grid-cols-2 gap-4" @submit="handleCreateUser">
            <UFormField label="Name" name="name">
              <UInput v-model="newUser.name" placeholder="Full name" icon="i-lucide-user" class="w-full" />
            </UFormField>
            <UFormField label="Email" name="email">
              <UInput v-model="newUser.email" type="email" placeholder="email@empresa.com" icon="i-lucide-mail" class="w-full" />
            </UFormField>
            <UFormField label="Password" name="password">
              <UInput v-model="newUser.password" type="password" placeholder="Minimum 6 characters" icon="i-lucide-lock" class="w-full" />
            </UFormField>
            <UFormField label="Role" name="role">
              <USelect v-model="newUser.role" :items="['agent', 'admin']" class="w-full" />
            </UFormField>
            <div class="col-span-2">
              <UButton type="submit" icon="i-lucide-plus" label="Create agent" />
            </div>
          </UForm>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";

const api = useApi();
const toast = useToast();
const usersList = ref<any[]>([]);
const usersLoading = ref(true);
const newUser = reactive({ name: "", email: "", password: "", role: "agent" });

const userColumns: TableColumn<any>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "email", header: "Email" },
  { accessorKey: "role", header: "Role" },
];

onMounted(async () => {
  try {
    usersList.value = await api.get<any[]>("/api/users");
  } finally {
    usersLoading.value = false;
  }
});

async function handleCreateUser() {
  try {
    const user = await api.post<any>("/api/users", { ...newUser });
    usersList.value.push(user);
    Object.assign(newUser, { name: "", email: "", password: "", role: "agent" });
    toast.add({ title: "Agent created", icon: "i-lucide-check", color: "success" });
  } catch (e: any) {
    toast.add({ title: "Failed to create agent", description: e.message, icon: "i-lucide-alert-circle", color: "error" });
  }
}
</script>
