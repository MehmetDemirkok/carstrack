import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType, type Schema } from "@google/generative-ai";
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

ÇOK ÖNEMLİ — YAYGIN HATA: Türk ehliyetlerinin arka yüzünde ${LICENSE_CLASSES.length} olası sınıfın hepsini (${LICENSE_CLASSES.join(", ")}) listeleyen SABİT, BASILI bir tablo bulunur. Bu satırların HEPSİ belgede basılıdır ve HERKESTE aynı şekilde görünür — bu bir ŞABLONDUR, kişinin sahip olduğu sınıfları GÖSTERMEZ. Kişinin GERÇEKTEN sahip olduğu sınıflar SADECE o satırın "veriliş tarihi" ve/veya "geçerlilik tarihi" hücresinde ELLE/MATBU şekilde rakamlar yazılı olan satırlardır.

GÖREV: "rows" dizisinde TAM OLARAK bu ${LICENSE_CLASSES.length} sınıfın HEPSİNİ, hiçbirini atlamadan, şu sırayla üret: ${LICENSE_CLASSES.join(", ")}. Her sınıf için tablodaki satıra tek tek bak ve:
- issueCellRaw: "veriliş tarihi" hücresinde GERÇEKTEN gördüğün rakamları harfiyen yaz (örn: "07 11 2014"). Hücre boşsa, çizgiyle doluysa (—, _____ vb.) ya da hiç rakam yoksa issueCellRaw'ı boş string "" yap — ASLA rakam uydurma.
- expiryCellRaw: aynı kuralla "geçerlilik tarihi" hücresi için.
- issueCellRaw veya expiryCellRaw doluysa, o rakamları issueDate / expiryDate alanlarına YYYY-MM-DD formatında çevir. İkisi de boşsa issueDate ve expiryDate'i null yap.

KURALLAR — ÇOK SIKI UYGULA:
- Bir hücrenin dolu mu boş mu olduğundan en ufak şüphe duyarsan, BOŞ kabul et ("").
- Şablonu doldurma refleksiyle hiçbir sınıfa rakam/tarih uydurma. Eksik bırakmak, olmayan bir sınıfa tarih uydurmaktan çok daha iyidir.
- licenseNumber SADECE ön yüzde "5" numaralı alanda ("Belge No" / "Sürücü Belgesi No" başlığı altında) yazan numaradır. Arka yüzdeki veya belge kenarındaki seri/sıra numarasını (barkod altındaki numara, güvenlik/takip numarası vb.) KESİNLİKLE licenseNumber olarak verme — bu farklı bir belge takip numarasıdır, ehliyet numarası DEĞİLDİR. "Belge No" alanını net göremiyorsan licenseNumber'ı null yap, tahmin etme.`;

const LICENSE_RESPONSE_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    licenseNumber: { type: SchemaType.STRING, nullable: true, description: "Ön yüzdeki '5. Belge No' alanı, yoksa null" },
    rows: {
      type: SchemaType.ARRAY,
      minItems: LICENSE_CLASSES.length,
      maxItems: LICENSE_CLASSES.length,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          class: { type: SchemaType.STRING, format: "enum", enum: [...LICENSE_CLASSES] },
          issueCellRaw: { type: SchemaType.STRING, description: "Veriliş tarihi hücresinde gerçekten görülen rakamlar, yoksa boş string" },
          expiryCellRaw: { type: SchemaType.STRING, description: "Geçerlilik tarihi hücresinde gerçekten görülen rakamlar, yoksa boş string" },
          issueDate: { type: SchemaType.STRING, nullable: true, description: "issueCellRaw'ın YYYY-MM-DD karşılığı, boşsa null" },
          expiryDate: { type: SchemaType.STRING, nullable: true, description: "expiryCellRaw'ın YYYY-MM-DD karşılığı, boşsa null" },
        },
        required: ["class", "issueCellRaw", "expiryCellRaw"],
      },
    },
  },
  required: ["rows"],
};

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
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0,
        // Ehliyet için: modelin 17 sınıfın hepsini tek tek değerlendirip ham hücre
        // metnini yazmasını zorunlu kılan şema — serbest bırakılırsa boş hücrelere
        // de tarih uyduruyordu.
        ...(documentType === "license" ? { responseSchema: LICENSE_RESPONSE_SCHEMA } : {}),
      },
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
      const hasDigit = (v: unknown): v is string => typeof v === "string" && /\d/.test(v);
      const classes = Array.isArray(parsed.rows)
        ? (parsed.rows as unknown[])
            .filter((r): r is { class: unknown; issueCellRaw?: unknown; expiryCellRaw?: unknown; issueDate?: unknown; expiryDate?: unknown } => !!r && typeof r === "object")
            .filter((r) => typeof r.class === "string" && validClasses.has(r.class))
            // Ham hücre transkripsiyonunda (issueCellRaw/expiryCellRaw) hiç rakam yoksa
            // hücre gerçekten boştur — bu sınıf kişiye ait değildir, basılı şablon
            // tablosundan hallüsine edilmiş olabilir. Sadece model rakam gördüğünü
            // iddia ederse (issueDate/expiryDate değil, ham metin) kabul et.
            .filter((r) => hasDigit(r.issueCellRaw) || hasDigit(r.expiryCellRaw))
            .filter((r) => (typeof r.issueDate === "string" && r.issueDate) || (typeof r.expiryDate === "string" && r.expiryDate))
            .map((r): LicenseClassResult => ({
              class: r.class as string,
              ...(typeof r.issueDate === "string" && r.issueDate ? { issueDate: r.issueDate } : {}),
              ...(typeof r.expiryDate === "string" && r.expiryDate ? { expiryDate: r.expiryDate } : {}),
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
