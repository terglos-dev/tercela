export interface MediaContent {
  url: string;
  mimeType: string;
  filename?: string;
  caption?: string;
  size?: number;
}

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

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
