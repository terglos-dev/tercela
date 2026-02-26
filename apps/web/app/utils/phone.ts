const CALLING_CODES: [string, string][] = [
  ["+1", "US"],
  ["+7", "RU"],
  ["+20", "EG"],
  ["+27", "ZA"],
  ["+30", "GR"],
  ["+31", "NL"],
  ["+32", "BE"],
  ["+33", "FR"],
  ["+34", "ES"],
  ["+36", "HU"],
  ["+39", "IT"],
  ["+40", "RO"],
  ["+41", "CH"],
  ["+43", "AT"],
  ["+44", "GB"],
  ["+45", "DK"],
  ["+46", "SE"],
  ["+47", "NO"],
  ["+48", "PL"],
  ["+49", "DE"],
  ["+51", "PE"],
  ["+52", "MX"],
  ["+54", "AR"],
  ["+55", "BR"],
  ["+56", "CL"],
  ["+57", "CO"],
  ["+60", "MY"],
  ["+61", "AU"],
  ["+62", "ID"],
  ["+63", "PH"],
  ["+64", "NZ"],
  ["+65", "SG"],
  ["+66", "TH"],
  ["+81", "JP"],
  ["+82", "KR"],
  ["+84", "VN"],
  ["+86", "CN"],
  ["+90", "TR"],
  ["+91", "IN"],
  ["+92", "PK"],
  ["+93", "AF"],
  ["+94", "LK"],
  ["+95", "MM"],
  ["+212", "MA"],
  ["+213", "DZ"],
  ["+216", "TN"],
  ["+218", "LY"],
  ["+220", "GM"],
  ["+221", "SN"],
  ["+234", "NG"],
  ["+254", "KE"],
  ["+255", "TZ"],
  ["+256", "UG"],
  ["+260", "ZM"],
  ["+263", "ZW"],
  ["+351", "PT"],
  ["+353", "IE"],
  ["+354", "IS"],
  ["+358", "FI"],
  ["+380", "UA"],
  ["+420", "CZ"],
  ["+421", "SK"],
  ["+505", "NI"],
  ["+506", "CR"],
  ["+507", "PA"],
  ["+591", "BO"],
  ["+593", "EC"],
  ["+595", "PY"],
  ["+598", "UY"],
  ["+852", "HK"],
  ["+853", "MO"],
  ["+880", "BD"],
  ["+886", "TW"],
  ["+960", "MV"],
  ["+961", "LB"],
  ["+962", "JO"],
  ["+963", "SY"],
  ["+964", "IQ"],
  ["+965", "KW"],
  ["+966", "SA"],
  ["+967", "YE"],
  ["+968", "OM"],
  ["+971", "AE"],
  ["+972", "IL"],
  ["+973", "BH"],
  ["+974", "QA"],
  ["+977", "NP"],
  ["+992", "TJ"],
  ["+993", "TM"],
  ["+994", "AZ"],
  ["+995", "GE"],
  ["+998", "UZ"],
];

// Sorted longest prefix first so "+351" matches before "+3"
const SORTED_CODES = [...CALLING_CODES].sort((a, b) => b[0].length - a[0].length);

function countryToFlag(iso: string): string {
  return [...iso.toUpperCase()]
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}

function isoFromPhone(phone: string): string | null {
  const cleaned = phone.startsWith("+") ? phone : `+${phone}`;
  for (const [prefix, iso] of SORTED_CODES) {
    if (cleaned.startsWith(prefix)) return iso;
  }
  return null;
}

export function phoneFlag(phone: string): string {
  const iso = isoFromPhone(phone);
  return iso ? countryToFlag(iso) : "";
}

export function formatPhone(phone: string): string {
  if (!phone) return "";
  // Already formatted (contains spaces or dashes) — return as-is
  if (phone.includes(" ") || phone.includes("-")) return phone;
  // Raw E.164 — add spaces after country code
  const iso = isoFromPhone(phone);
  if (!iso) return phone;
  const prefix = SORTED_CODES.find(([, i]) => i === iso)?.[0] ?? "";
  const rest = phone.slice(prefix.length);
  // Simple grouping: split remaining digits into chunks of 2-3
  const grouped = rest.replace(/(\d{2,3})(?=\d)/g, "$1 ").trim();
  return `${prefix} ${grouped}`;
}

export function phoneWithFlag(phone: string): string {
  if (!phone) return "";
  const flag = phoneFlag(phone);
  const formatted = formatPhone(phone);
  return flag ? `${flag} ${formatted}` : formatted;
}
