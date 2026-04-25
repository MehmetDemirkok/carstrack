import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

interface VehicleContext {
  plate: string;
  brand: string;
  model: string;
  year: number;
  mileage: number;
  healthScore: number;
  insuranceExpiry: string;
  inspectionExpiry: string;
  maintenanceItems: Array<{ name: string; status: string }>;
}

interface RequestBody {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  vehicleContext?: {
    vehicles: VehicleContext[];
    fleetScore: number;
    alertCount: number;
  };
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch {}
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const body: RequestBody = await req.json();
  const { messages, vehicleContext } = body;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const systemPrompt = buildSystemPrompt(vehicleContext);

  const stream = client.messages.stream({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: systemPrompt,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
            const data = `data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`;
            controller.enqueue(new TextEncoder().encode(data));
          }
        }
        controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

function buildSystemPrompt(ctx?: RequestBody["vehicleContext"]): string {
  let prompt = `Sen CarsTrack filo yönetim uygulamasının AI asistanısın. Adın Copilot.
Türkçe konuş. Araç bakımı, sigorta, muayene, lastik değişimi ve motor bakımı konularında uzmansın.
Kısa ve net cevaplar ver. Markdown kullan (kalın için **text**, liste için - item).
Kritik durumlarda acil eylem öner. Maksimum 3-4 paragraf veya madde listesi kullan.`;

  if (ctx && ctx.vehicles.length > 0) {
    prompt += `\n\n## Mevcut Filo\nFilo Sağlık Skoru: **${ctx.fleetScore}/100** | Aktif Uyarı: **${ctx.alertCount}**\n\n### Araçlar\n`;
    for (const v of ctx.vehicles) {
      prompt += `- **${v.plate}** (${v.brand} ${v.model} ${v.year}) — ${v.mileage.toLocaleString("tr-TR")} km — Sağlık: ${v.healthScore}/100\n`;
      prompt += `  Sigorta: ${v.insuranceExpiry || "—"} | Muayene: ${v.inspectionExpiry || "—"}\n`;
      const critical = v.maintenanceItems.filter((m) => m.status !== "good");
      if (critical.length > 0) {
        prompt += `  Dikkat gerektiren bakımlar: ${critical.map((m) => m.name).join(", ")}\n`;
      }
    }
  } else {
    prompt += `\n\nHenüz araç verisi yok. Kullanıcıya araç eklemeyi önererek başla.`;
  }

  return prompt;
}
