/**
 * User-Agent metnini "iPhone · Safari" gibi okunabilir bir cihaz adına çevirir.
 * Ayarlar'daki bildirim cihazları listesinde kullanılır; kesin tespit değil,
 * kullanıcının cihazını tanıması için yeterli bir tahmindir.
 */
export function describeUserAgent(ua: string | null | undefined): string {
  if (!ua) return "Bilinmeyen cihaz";

  const os =
    /iPhone/.test(ua) ? "iPhone"
    : /iPad/.test(ua) ? "iPad"
    : /Android/.test(ua) ? (/Mobile/.test(ua) ? "Android telefon" : "Android tablet")
    : /Windows/.test(ua) ? "Windows"
    : /Mac OS X|Macintosh/.test(ua) ? "Mac"
    : /CrOS/.test(ua) ? "Chromebook"
    : /Linux/.test(ua) ? "Linux"
    : "Cihaz";

  const browser =
    /Edg\//.test(ua) ? "Edge"
    : /OPR\/|Opera/.test(ua) ? "Opera"
    : /SamsungBrowser/.test(ua) ? "Samsung Internet"
    : /Firefox|FxiOS/.test(ua) ? "Firefox"
    : /CriOS|Chrome\//.test(ua) ? "Chrome"
    : /Safari/.test(ua) ? "Safari"
    : "";

  return browser ? `${os} · ${browser}` : os;
}
