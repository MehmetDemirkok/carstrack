const MAX_LENGTH = 512;

/**
 * `?next=` gibi kullanıcı girdisi taşıyan dönüş adreslerini doğrular.
 * Yalnızca site içi mutlak yollar kabul edilir; protokol/host içeren
 * (`//`, `/\`, `http:…`) değerler reddedilir. Geçersizse `null` döner.
 */
export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (raw.length > MAX_LENGTH) return null;
  if (!raw.startsWith("/")) return null;
  if (raw.startsWith("//") || raw.startsWith("/\\")) return null;

  for (let i = 0; i < raw.length; i++) {
    const code = raw.charCodeAt(i);
    if (code < 0x20 || code === 0x7f || code === 0x5c) return null;
  }

  const target = raw.split("?")[0].split("#")[0];

  if (target === "/") return null;
  if (target === "/login" || target.startsWith("/login/")) return null;
  if (target === "/register" || target.startsWith("/register/")) return null;
  if (target === "/api" || target.startsWith("/api/")) return null;

  return raw;
}
