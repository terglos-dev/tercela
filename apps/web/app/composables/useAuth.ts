import type { AuthResponse, User } from "@tercela/shared";

export function useAuth() {
  const user = useState<User | null>("auth_user", () => null);
  const token = useCookie("auth_token", {
    maxAge: 86400,
    sameSite: "lax",
    path: "/",
  });
  const api = useApi();

  const isAuthenticated = computed(() => !!token.value);

  async function login(email: string, password: string) {
    const res = await api.post<AuthResponse>("/v1/auth/login", { email, password });
    token.value = res.token;
    user.value = res.user;
    return res;
  }

  function logout() {
    token.value = null;
    user.value = null;
    navigateTo("/login");
  }

  async function changePassword(currentPassword: string, newPassword: string) {
    await api.post("/v1/users/me/password", { currentPassword, newPassword });
  }

  return { user, token, isAuthenticated, login, logout, changePassword };
}
