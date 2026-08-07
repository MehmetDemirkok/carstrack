# Google Search Console — CarsTrack

Doğrulama meta etiketi `.env.local` içinde:
`NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=...`

Deploy sonrası (production):

1. https://search.google.com/search-console → mülk: `https://carstrack.app`
2. Sitemap gönder: `https://carstrack.app/sitemap.xml`
3. URL Denetimi ile indeks iste:
   - https://carstrack.app/
   - https://carstrack.app/arac-bakim-takip
   - https://carstrack.app/ozellikler
   - https://carstrack.app/sss
   - https://carstrack.app/register
4. Sayfa deneyimi / Core Web Vitals raporunu izle
5. “Dizin oluşturulmayan sayfalar”da dashboard/API yollarının noindex/disallow ile bloklandığını doğrula

Kontrol uçları:
- https://carstrack.app/robots.txt
- https://carstrack.app/sitemap.xml
- https://carstrack.app/llms.txt
