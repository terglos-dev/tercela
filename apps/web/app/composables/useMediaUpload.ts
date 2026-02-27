import type { Serialized, Message } from "@tercela/shared";

export function useMediaUpload() {
  const config = useRuntimeConfig();
  const token = useCookie("auth_token");

  async function uploadAndSendMedia(conversationId: string, file: File, caption?: string) {
    const formData = new FormData();
    formData.append("file", file);
    if (caption) formData.append("caption", caption);

    const res = await fetch(
      `${config.public.apiBase}/v1/conversations/${conversationId}/messages/upload`,
      {
        method: "POST",
        headers: {
          ...(token.value ? { Authorization: `Bearer ${token.value}` } : {}),
        },
        body: formData,
      },
    );

    const body = await res.json().catch(() => null);
    if (!res.ok) throw new Error(body?.error?.message || "Upload failed");
    return body.data as Serialized<Message>;
  }

  return { uploadAndSendMedia };
}
