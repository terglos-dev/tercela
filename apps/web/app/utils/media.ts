export interface MediaContent {
  url: string;
  mimeType: string;
  filename?: string;
  caption?: string;
  size?: number;
}

/**
 * Parse legacy JSON content for backwards compat with old messages
 * that stored media metadata inline in `content`.
 */
export function parseMediaContent(content: string): MediaContent | null {
  try {
    const parsed = JSON.parse(content);
    if (parsed.url && parsed.mimeType) {
      return parsed as MediaContent;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Resolve media URL for a message.
 * New messages have a `media` object with an `id`; old ones have JSON in `content`.
 */
export function resolveMediaUrl(
  msg: { media?: { id: string } | null; content: string },
  apiBase: string,
  token: string,
): string | null {
  // New structure: media record with ID
  if (msg.media?.id) {
    return `${apiBase}/v1/media/${msg.media.id}?token=${token}`;
  }

  // Legacy fallback: JSON in content with url field
  const parsed = parseMediaContent(msg.content);
  if (parsed?.url) {
    return `${apiBase}${parsed.url}${parsed.url.includes("?") ? "&" : "?"}token=${token}`;
  }

  return null;
}

/**
 * Get media metadata from either new media object or legacy JSON content.
 */
export function getMediaMeta(msg: {
  media?: { mimeType: string; filename: string | null; size: number | null } | null;
  content: string;
}): { mimeType: string; filename?: string; caption?: string; size?: number } | null {
  if (msg.media) {
    return {
      mimeType: msg.media.mimeType,
      filename: msg.media.filename || undefined,
      caption: msg.content || undefined,
      size: msg.media.size || undefined,
    };
  }

  // Legacy fallback
  const parsed = parseMediaContent(msg.content);
  if (parsed) {
    return {
      mimeType: parsed.mimeType,
      filename: parsed.filename,
      caption: parsed.caption,
      size: parsed.size,
    };
  }

  return null;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
