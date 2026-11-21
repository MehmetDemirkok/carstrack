import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AVATAR_BUCKET } from "@/lib/avatar";

// Dosya adı her yüklemede değiştiği için içerik bu adreste hiç değişmez.
const CACHE_CONTROL = "private, max-age=31536000, immutable";

/**
 * Profil fotoğraflarını sabit bir adresten servis eder (bkz. src/lib/avatar.ts).
 *
 * Yetki storage RLS'i ile sağlanır: sunucu istemcisi kullanıcının oturum
 * çerezini taşır, politika yolun ilk parçasının kullanıcının company_id'si
 * olmasını şart koşar — başka şirketin fotoğrafı bu route'tan da okunamaz.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const segments = (path ?? []).map((s) => decodeURIComponent(s));

  // Yol biçimi: <companyId>/<userId>/<dosya>
  if (segments.length !== 3 || segments.some((s) => !s || s === "." || s === ".." || s.includes("/"))) {
    return NextResponse.json({ error: "Geçersiz yol" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: blob, error } = await supabase.storage.from(AVATAR_BUCKET).download(segments.join("/"));
  if (!blob) {
    console.error("avatar indirilemedi:", segments.join("/"), error?.message);
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
