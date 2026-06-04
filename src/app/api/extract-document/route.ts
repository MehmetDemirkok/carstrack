import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@/lib/supabase/server";

const genai = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

const PROMPT = `Aşağıdaki Türkçe araç belgesini analiz et. Araç ruhsatı, trafik sigortası poliçesi, kasko poliçesi veya araç muayene belgesi olabilir.

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
  "insuranceCompany": "zorunlu trafik sigortası şirketi adı",
  "insuranceExpiry": "trafik sigortası bitiş tarihi YYYY-MM-DD formatında",
  "greenCardCompany": "yeşil kart sigorta şirketi adı",
  "greenCardExpiry": "yeşil kart bitiş tarihi YYYY-MM-DD formatında",
  "inspectionExpiry": "araç teknik muayene bitiş tarihi YYYY-MM-DD formatında"
}

Belgede bulunamayan alanları null yap. Sadece JSON döndür.`;

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json() as { fileData?: string; mimeType?: string };
    const { fileData, mimeType } = body;

    if (!fileData || !mimeType) {
      return NextResponse.json({ error: "Missing fileData or mimeType" }, { status: 400 });
    }

    const normalizedMime = mimeType === "image/jpg" ? "image/jpeg" : mimeType;
    if (!ALLOWED_MIME.has(normalizedMime)) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
    }

    const model = genai.getGenerativeModel({
      model: "gemini-flash-latest",
      generationConfig: { responseMimeType: "application/json" },
    });

    const result = await model.generateContent([
      PROMPT,
      { inlineData: { mimeType: normalizedMime, data: fileData } },
    ]);

    const raw = result.response.text().trim();
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

    let parsed: Record<string, string | null>;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: "Parse failed", raw }, { status: 422 });
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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
