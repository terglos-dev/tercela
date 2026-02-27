import type { UserListItem } from "~/types/api";

export function useUsers() {
  const api = useApi();
  const users = useState<UserListItem[]>("users_list", () => []);
  const loading = useState("users_loading", () => false);

  async function fetchUsers() {
    loading.value = true;
    try {
      users.value = await api.get<UserListItem[]>("/v1/users");
    } finally {
      loading.value = false;
    }
  }

  async function createUser(data: { name: string; email: string; password: string; role: string }) {
    const user = await api.post<UserListItem>("/v1/users", data);
    users.value.push(user);
    return user;
  }

  async function blockUser(id: string) {
    const user = await api.post<UserListItem>(`/v1/users/${id}/block`, {});
    const idx = users.value.findIndex((u) => u.id === id);
    if (idx !== -1) users.value[idx] = user;
    return user;
  }

  async function activateUser(id: string) {
    const user = await api.post<UserListItem>(`/v1/users/${id}/activate`, {});
    const idx = users.value.findIndex((u) => u.id === id);
    if (idx !== -1) users.value[idx] = user;
    return user;
  }

  async function deleteUser(id: string) {
    await api.delete(`/v1/users/${id}`);
    users.value = users.value.filter((u) => u.id !== id);
  }

  return { users, loading, fetchUsers, createUser, blockUser, activateUser, deleteUser };
}
