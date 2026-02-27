export function useApi() {
  const config = useRuntimeConfig();
  const token = useCookie("auth_token");

  async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (token.value) {
      headers.Authorization = `Bearer ${token.value}`;
    }

    const res = await fetch(`${config.public.apiBase}${path}`, {
      ...options,
      headers,
    });

    const body = await res.json().catch(() => null);

    if (!res.ok) {
      throw new Error(body?.error?.message || "Request failed");
    }

    return body.data as T;
  }

  async function getPaginated<T>(path: string): Promise<{ data: T[]; meta: { nextCursor: string | null; hasMore: boolean } }> {
    const config = useRuntimeConfig();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (token.value) {
      headers.Authorization = `Bearer ${token.value}`;
    }

    const res = await fetch(`${config.public.apiBase}${path}`, { headers });
    const body = await res.json().catch(() => null);

    if (!res.ok) {
      throw new Error(body?.error?.message || "Request failed");
    }

    return { data: body.data as T[], meta: body.meta };
  }

  return {
    get: <T>(path: string) => apiFetch<T>(path),
    post: <T>(path: string, body: unknown) =>
      apiFetch<T>(path, { method: "POST", body: JSON.stringify(body) }),
    put: <T>(path: string, body: unknown) =>
      apiFetch<T>(path, { method: "PUT", body: JSON.stringify(body) }),
    patch: <T>(path: string, body: unknown) =>
      apiFetch<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
    delete: <T>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
    getPaginated: <T>(path: string) => getPaginated<T>(path),
  };
}
