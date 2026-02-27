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

  return { users, loading, fetchUsers, createUser };
}
