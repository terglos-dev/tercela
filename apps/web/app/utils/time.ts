/** Formats a date string as relative time (e.g. "3m", "2h", "1d", "12 jan") */
export function timeAgo(date: string, locale: string = "en"): string {
  const now = Date.now();
  const diff = now - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(date).toLocaleDateString(locale, { day: "numeric", month: "short" });
}
