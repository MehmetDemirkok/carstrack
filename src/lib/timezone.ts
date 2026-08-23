/** Şirket saati bilinmiyorsa (eski kayıtlar) Türkiye varsayılır. */
export const DEFAULT_TIMEZONE = "Europe/Istanbul";

/** Günlük filo özeti, şirketin yerel saatinde bu saatte gönderilir. */
export const DIGEST_LOCAL_HOUR = 9;

export interface TimezoneOption {
  id: string;
  label: string;
  region: string;
}

/** Ayarlar seçicisi — IANA kimliği + ülke/şehir etiketi. */
export const TIMEZONES: TimezoneOption[] = [
  { id: "Europe/Istanbul", label: "Türkiye (İstanbul)", region: "Avrupa" },
  { id: "Europe/London", label: "Birleşik Krallık (Londra)", region: "Avrupa" },
  { id: "Europe/Dublin", label: "İrlanda (Dublin)", region: "Avrupa" },
  { id: "Europe/Lisbon", label: "Portekiz (Lizbon)", region: "Avrupa" },
  { id: "Europe/Paris", label: "Fransa (Paris)", region: "Avrupa" },
  { id: "Europe/Berlin", label: "Almanya (Berlin)", region: "Avrupa" },
  { id: "Europe/Amsterdam", label: "Hollanda (Amsterdam)", region: "Avrupa" },
  { id: "Europe/Brussels", label: "Belçika (Brüksel)", region: "Avrupa" },
  { id: "Europe/Madrid", label: "İspanya (Madrid)", region: "Avrupa" },
  { id: "Europe/Rome", label: "İtalya (Roma)", region: "Avrupa" },
  { id: "Europe/Zurich", label: "İsviçre (Zürih)", region: "Avrupa" },
  { id: "Europe/Vienna", label: "Avusturya (Viyana)", region: "Avrupa" },
  { id: "Europe/Warsaw", label: "Polonya (Varşova)", region: "Avrupa" },
  { id: "Europe/Prague", label: "Çekya (Prag)", region: "Avrupa" },
  { id: "Europe/Budapest", label: "Macaristan (Budapeşte)", region: "Avrupa" },
  { id: "Europe/Bucharest", label: "Romanya (Bükreş)", region: "Avrupa" },
  { id: "Europe/Athens", label: "Yunanistan (Atina)", region: "Avrupa" },
  { id: "Europe/Sofia", label: "Bulgaristan (Sofya)", region: "Avrupa" },
  { id: "Europe/Helsinki", label: "Finlandiya (Helsinki)", region: "Avrupa" },
  { id: "Europe/Stockholm", label: "İsveç (Stockholm)", region: "Avrupa" },
  { id: "Europe/Oslo", label: "Norveç (Oslo)", region: "Avrupa" },
  { id: "Europe/Copenhagen", label: "Danimarka (Kopenhag)", region: "Avrupa" },
  { id: "Europe/Moscow", label: "Rusya (Moskova)", region: "Avrupa" },
  { id: "Europe/Kyiv", label: "Ukrayna (Kiev)", region: "Avrupa" },
  { id: "Asia/Nicosia", label: "Kıbrıs (Lefkoşa)", region: "Asya" },
  { id: "Asia/Tbilisi", label: "Gürcistan (Tiflis)", region: "Asya" },
  { id: "Asia/Yerevan", label: "Ermenistan (Erivan)", region: "Asya" },
  { id: "Asia/Baku", label: "Azerbaycan (Bakü)", region: "Asya" },
  { id: "Asia/Tehran", label: "İran (Tahran)", region: "Asya" },
  { id: "Asia/Baghdad", label: "Irak (Bağdat)", region: "Asya" },
  { id: "Asia/Riyadh", label: "Suudi Arabistan (Riyad)", region: "Asya" },
  { id: "Asia/Kuwait", label: "Kuveyt", region: "Asya" },
  { id: "Asia/Qatar", label: "Katar (Doha)", region: "Asya" },
  { id: "Asia/Bahrain", label: "Bahreyn", region: "Asya" },
  { id: "Asia/Dubai", label: "BAE (Dubai)", region: "Asya" },
  { id: "Asia/Muscat", label: "Umman (Maskat)", region: "Asya" },
  { id: "Asia/Amman", label: "Ürdün (Amman)", region: "Asya" },
  { id: "Asia/Beirut", label: "Lübnan (Beyrut)", region: "Asya" },
  { id: "Asia/Jerusalem", label: "İsrail (Kudüs)", region: "Asya" },
  { id: "Asia/Karachi", label: "Pakistan (Karaçi)", region: "Asya" },
  { id: "Asia/Kolkata", label: "Hindistan (Kolkata)", region: "Asya" },
  { id: "Asia/Dhaka", label: "Bangladeş (Dakka)", region: "Asya" },
  { id: "Asia/Bangkok", label: "Tayland (Bangkok)", region: "Asya" },
  { id: "Asia/Jakarta", label: "Endonezya (Cakarta)", region: "Asya" },
  { id: "Asia/Singapore", label: "Singapur", region: "Asya" },
  { id: "Asia/Kuala_Lumpur", label: "Malezya (Kuala Lumpur)", region: "Asya" },
  { id: "Asia/Hong_Kong", label: "Hong Kong", region: "Asya" },
  { id: "Asia/Shanghai", label: "Çin (Şanghay)", region: "Asya" },
  { id: "Asia/Taipei", label: "Tayvan (Taipei)", region: "Asya" },
  { id: "Asia/Tokyo", label: "Japonya (Tokyo)", region: "Asya" },
  { id: "Asia/Seoul", label: "Güney Kore (Seul)", region: "Asya" },
  { id: "Australia/Perth", label: "Avustralya (Perth)", region: "Okyanusya" },
  { id: "Australia/Sydney", label: "Avustralya (Sidney)", region: "Okyanusya" },
  { id: "Pacific/Auckland", label: "Yeni Zelanda (Auckland)", region: "Okyanusya" },
  { id: "Africa/Cairo", label: "Mısır (Kahire)", region: "Afrika" },
  { id: "Africa/Johannesburg", label: "Güney Afrika (Johannesburg)", region: "Afrika" },
  { id: "Africa/Lagos", label: "Nijerya (Lagos)", region: "Afrika" },
  { id: "Africa/Nairobi", label: "Kenya (Nairobi)", region: "Afrika" },
  { id: "Africa/Casablanca", label: "Fas (Kazablanka)", region: "Afrika" },
  { id: "America/Sao_Paulo", label: "Brezilya (São Paulo)", region: "Amerika" },
  { id: "America/Argentina/Buenos_Aires", label: "Arjantin (Buenos Aires)", region: "Amerika" },
  { id: "America/Mexico_City", label: "Meksika (Mexico City)", region: "Amerika" },
  { id: "America/New_York", label: "ABD (New York)", region: "Amerika" },
  { id: "America/Chicago", label: "ABD (Chicago)", region: "Amerika" },
  { id: "America/Denver", label: "ABD (Denver)", region: "Amerika" },
  { id: "America/Los_Angeles", label: "ABD (Los Angeles)", region: "Amerika" },
  { id: "America/Toronto", label: "Kanada (Toronto)", region: "Amerika" },
  { id: "America/Vancouver", label: "Kanada (Vancouver)", region: "Amerika" },
  { id: "UTC", label: "UTC", region: "Diğer" },
];

export const TIMEZONES_BY_REGION = TIMEZONES.reduce<Record<string, TimezoneOption[]>>((acc, tz) => {
  (acc[tz.region] ??= []).push(tz);
  return acc;
}, {});

export function isValidTimeZone(timeZone: string): boolean {
  try {
    Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function resolveTimeZone(timeZone: unknown): string {
  if (typeof timeZone === "string" && timeZone.trim() && isValidTimeZone(timeZone.trim())) {
    return timeZone.trim();
  }
  return DEFAULT_TIMEZONE;
}

export function getTimezoneLabel(timeZone: string): string {
  const match = TIMEZONES.find((tz) => tz.id === timeZone);
  if (match) return match.label;
  return timeZone || DEFAULT_TIMEZONE;
}

function timezoneParts(date: Date, timeZone: string): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: resolveTimeZone(timeZone),
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(date);

  return {
    hour: Number(parts.find((p) => p.type === "hour")?.value ?? 0),
    minute: Number(parts.find((p) => p.type === "minute")?.value ?? 0),
  };
}

/** Şu an verilen saat diliminde `hour` (0–23) içindeyse true. */
export function isLocalHour(date: Date, timeZone: string, hour: number): boolean {
  return timezoneParts(date, timeZone).hour === hour;
}

export function formatLocalDate(date: Date, timeZone: string, locale = "tr-TR"): string {
  return date.toLocaleDateString(locale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: resolveTimeZone(timeZone),
  });
}
