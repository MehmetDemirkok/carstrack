import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "vehicle-documents";
const PHOTO_DIR = "arac-fotograflari";

// Tarayıcı bir gün boyunca yeniden sormaz; URL'deki ?v= araç güncellendiğinde
// değiştiği için yeni fotoğraf anında görünür.
const CACHE_CONTROL = "private, max-age=86400, stale-while-revalidate=604800";

/**
 * Araç fotoğraflarını sabit bir adresten servis eder.
 *
 * Yetki storage RLS'i ile sağlanır: sunucu istemcisi kullanıcının oturum
 * çerezini taşır, politika da yolun ilk parçasının kullanıcının company_id'si
 * olmasını şart koşar — yani başka şirketin fotoğrafı bu route'tan da okunamaz.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const segments = (path ?? []).map((s) => decodeURIComponent(s));

  // Yol biçimi: <companyId>/arac-fotograflari/<vehicleId>/<dosya>
  // Bu route yalnızca araç fotoğrafları içindir; belgeler kendi akışından gider.
  if (
    segments.length < 4 ||
    segments[1] !== PHOTO_DIR ||
    segments.some((s) => !s || s === "." || s === "..")
  ) {
    return NextResponse.json({ error: "Geçersiz yol" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const objectPath = segments.join("/");
  let blob: Blob | null = null;

  const { data, error } = await supabase.storage.from(BUCKET).download(objectPath);
  if (data) {
    blob = data;
  } else if (objectPath.includes("_thumb")) {
    // Küçük boy dosya yoksa (bu değişiklikten önce yüklenmiş fotoğraflar)
    // tam boya düş — kart boş kalmasın.
    const full = objectPath.replace(/_thumb(\.[^./]+)?$/, "$1");
    const { data: fullData } = await supabase.storage.from(BUCKET).download(full);
    blob = fullData ?? null;
  }

  if (!blob) {
    console.error("vehicle-photo indirilemedi:", objectPath, error?.message);
    return NextResponse.json({ error: "Fotoğraf bulunamadı" }, { status: 404 });
  }

  return new NextResponse(blob.stream(), {
    headers: {
      "Content-Type": blob.type || "image/jpeg",
      "Content-Length": String(blob.size),
      "Cache-Control": CACHE_CONTROL,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
