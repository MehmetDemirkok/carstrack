import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@/lib/supabase/server";
import { LICENSE_CLASSES } from "@/lib/license";

const genai = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

const PROMPT_VEHICLE = `Aşağıdaki Türkçe araç belgesini analiz et. Araç ruhsatı, trafik sigortası poliçesi, kasko poliçesi veya araç muayene belgesi olabilir.

Belgeden bulabildiğin bilgileri çıkar ve YALNIZCA geçerli bir JSON nesnesi döndür (başka hiçbir metin ekleme):

{
  "plate": "araç plakası büyük harfle (örn: 34ABC123)",
  "brand": "marka adı (örn: Toyota, BMW, Ford)",
  "model": "model adı (örn: Corolla, 320i, Focus)",
  "year": "model yılı string olarak (örn: 2019)",
  "chassisNo": "şasi/VIN numarası",
  "color": "araç rengi Türkçe olarak",
  "fuelType": "sadece şunlardan biri: Benzin, Dizel, LPG, Hibrit, Elektrik",
  "engineVolume": "motor hacmi litre cinsinden (örn: 1.6)",
  "mileage": "kilometre sadece sayı string (örn: 45000)",
  "ruhsatSahibi": "ruhsat sahibinin adı soyadı (araç sahibi kişi veya kurum adı)",
  "insuranceCompany": "zorunlu trafik sigortası şirketi adı",
  "insuranceExpiry": "trafik sigortası bitiş tarihi YYYY-MM-DD formatında",
  "greenCardCompany": "yeşil kart sigorta şirketi adı",
  "greenCardExpiry": "yeşil kart bitiş tarihi YYYY-MM-DD formatında",
  "inspectionExpiry": "araç teknik muayene bitiş tarihi YYYY-MM-DD formatında"
}

Belgede bulunamayan alanları null yap. Sadece JSON döndür.`;

const PROMPT_LICENSE = `Aşağıdaki Türkiye Cumhuriyeti sürücü belgesi (ehliyet) görsellerini analiz et. Görseller belgenin ön ve/veya arka yüzü olabilir, hepsini birlikte değerlendir.

ÇOK ÖNEMLİ — YAYGIN HATA: Türk ehliyetlerinde genellikle TÜM olası sınıfları (A1, A2, A, B1, B, BE, C1, C1E, C, CE, D1, D1E, D, DE, F, G, M) listeleyen sabit, basılı bir tablo/başlık satırı bulunur. Bu sadece bir ŞABLONDUR ve belgedeki HERKESTE aynı şekilde basılıdır. Kişinin GERÇEKTEN sahip olduğu sınıflar, bu tabloda yanında elle/matbu şekilde bir VERİLİŞ TARİHİ yazılmış olan satırlardır. Yanında hiçbir tarih ya da damga bulunmayan, sadece şablonda basılı duran sınıfları KESİNLİKLE listeye ekleme — bunlar kişiye ait değildir.

Belgeden bulabildiğin bilgileri çıkar ve YALNIZCA geçerli bir JSON nesnesi döndür (başka hiçbir metin ekleme):

{
  "licenseNumber": "ÖN yüzdeki '5. Belge No' / 'Sürücü Belgesi No' alanı",
  "classes": [
    { "class": "sınıf harfi, örn: B, A2, C1, D (sadece resmi Türk ehliyet sınıflarından biri)", "issueDate": "o sınıfın veriliş tarihi YYYY-MM-DD formatında", "expiryDate": "o sınıfın geçerlilik/son kullanma tarihi YYYY-MM-DD formatında veya null" }
  ]
}

KURALLAR:
- "classes" dizisine SADECE yanında en az bir tarih (veriliş veya geçerlilik) gerçekten yazılı olan sınıfları ekle.
- Tarih net okunamıyorsa ama o satırda kişiye özel bir işaret/tarih olduğu kesinse sınıfı ekle, ilgili tarih alanını null yap.
- Bir sınıfın kişiye ait olup olmadığından şüphe duyarsan o sınıfı EKLEME — eksik bırakmak, olmayan bir sınıfı eklemekten çok daha iyidir.
- licenseNumber SADECE ön yüzde "5" numaralı alanda ("Belge No" / "Sürücü Belgesi No" başlığı altında) yazan numaradır. Arka yüzdeki veya belge kenarındaki seri/sıra numarasını (barkod altındaki numara, güvenlik/takip numarası vb.) KESİNLİKLE licenseNumber olarak verme — bu farklı bir belge takip numarasıdır, ehliyet numarası DEĞİLDİR. "Belge No" alanını net göremiyorsan licenseNumber'ı null yap, tahmin etme.
Sadece JSON döndür.`;

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

interface ExtractImage {
  fileData: string;
  mimeType: string;
}

interface LicenseClassResult {
  class: string;
  issueDate?: string;
  expiryDate?: string;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json() as {
      documentType?: "vehicle" | "license";
      fileData?: string;
      mimeType?: string;
      images?: ExtractImage[];
    };
    const documentType = body.documentType === "license" ? "license" : "vehicle";

    const rawImages: ExtractImage[] =
      body.images && body.images.length > 0
        ? body.images
        : body.fileData && body.mimeType
        ? [{ fileData: body.fileData, mimeType: body.mimeType }]
        : [];

    if (rawImages.length === 0) {
      return NextResponse.json({ error: "Missing fileData or images" }, { status: 400 });
    }

    const normalizedImages = rawImages.map((img) => ({
      ...img,
      mimeType: img.mimeType === "image/jpg" ? "image/jpeg" : img.mimeType,
    }));
    for (const img of normalizedImages) {
      if (!ALLOWED_MIME.has(img.mimeType)) {
        return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
      }
    }

    // Pinlenmiş stabil sürüm — "-latest" alias'ı bazen yeni/deneysel modele yönlenip
    // yüksek talep (503) yaşayabiliyor; pinlenmiş sürüm daha az dalgalanır.
    const model = genai.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" },
    });

    const prompt = documentType === "license" ? PROMPT_LICENSE : PROMPT_VEHICLE;
    const result = await model.generateContent([
      prompt,
      ...normalizedImages.map((img) => ({ inlineData: { mimeType: img.mimeType, data: img.fileData } })),
    ]);

    const raw = result.response.text().trim();
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: "Parse failed", raw }, { status: 422 });
    }

    if (documentType === "license") {
      const validClasses = new Set(LICENSE_CLASSES);
      const classes = Array.isArray(parsed.classes)
        ? (parsed.classes as unknown[])
            .filter((c): c is { class: unknown; issueDate?: unknown; expiryDate?: unknown } => !!c && typeof c === "object")
            .filter((c) => typeof c.class === "string" && validClasses.has(c.class))
            // Yanında hiçbir tarih bilgisi olmayan sınıflar, basılı şablon/legend'den
            // hallüsine edilmiş olabilir — gerçek veri olmadan kabul etme.
            .filter((c) => (typeof c.issueDate === "string" && c.issueDate) || (typeof c.expiryDate === "string" && c.expiryDate))
            .map((c): LicenseClassResult => ({
              class: c.class as string,
              ...(typeof c.issueDate === "string" && c.issueDate ? { issueDate: c.issueDate } : {}),
              ...(typeof c.expiryDate === "string" && c.expiryDate ? { expiryDate: c.expiryDate } : {}),
            }))
        : [];
      const licenseNumber = typeof parsed.licenseNumber === "string" ? parsed.licenseNumber : undefined;
      return NextResponse.json({ data: { licenseNumber, classes } });
    }

    const resultData = Object.fromEntries(
      Object.entries(parsed).filter(([, v]) => v !== null && v !== "" && v !== undefined),
    );

    return NextResponse.json({ data: resultData });
  } catch (err) {
    console.error("[extract-document]", err);
    const msg = (err as Error)?.message ?? "";
    if (msg.includes("API_KEY") || msg.includes("401") || msg.includes("403")) {
      return NextResponse.json({ error: "Google AI API anahtarı geçersiz veya eksik." }, { status: 500 });
    }
    if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")) {
      return NextResponse.json({ error: "API istek limiti aşıldı, lütfen bekleyin." }, { status: 429 });
    }
    if (msg.includes("503") || msg.includes("UNAVAILABLE") || msg.includes("high demand")) {
      return NextResponse.json(
        { error: "AI servisi şu anda yoğun, lütfen birkaç saniye sonra tekrar deneyin." },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "Belge okunamadı, lütfen tekrar deneyin." }, { status: 500 });
  }
}
