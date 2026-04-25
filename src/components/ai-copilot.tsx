"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Sparkles, SendHorizonal, Bot } from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCopilot } from "@/context/copilot-context";
import { getVehicles } from "@/lib/db";
import { calculateHealthScore, getFleetAlerts, getMaintenanceStatusForItem } from "@/lib/store";
import type { Vehicle } from "@/lib/types";

// ─── Markdown renderer ────────────────────────────────────────

function MarkdownMessage({ content }: { content: string }) {
  const html = content
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/((?:<li>.*<\/li>\n?)+)/g, "<ul class=\"list-disc list-inside space-y-1 my-1\">$1</ul>")
    .replace(/\n\n/g, "</p><p class=\"mt-2\">")
    .replace(/\n/g, "<br/>");

  return (
    <span
      className="text-sm leading-relaxed"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

// ─── Types ─────────────────────────────────────────────────────

interface Message {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

interface CopilotProps {
  vehicles: Vehicle[];
  fleetScore: number;
  alertCount: number;
}

// ─── Main chat UI ──────────────────────────────────────────────

function AICopilot({ vehicles, fleetScore, alertCount }: CopilotProps) {
  const { open, setOpen } = useCopilot();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function buildContext() {
    return {
      fleetScore,
      alertCount,
      vehicles: vehicles.map((v) => ({
        plate: v.plate,
        brand: v.brand,
        model: v.model,
        year: v.year,
        mileage: v.mileage,
        healthScore: calculateHealthScore(v),
        insuranceExpiry: v.insuranceExpiry,
        inspectionExpiry: v.inspectionExpiry,
        maintenanceItems: v.maintenanceItems.map((item) => ({
          name: item.name,
          status: getMaintenanceStatusForItem(item, v.mileage),
        })),
      })),
    };
  }

  async function sendMessage(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    const userMsg: Message = { role: "user", content };
    const newMessages = [...messages, userMsg];
    setMessages([...newMessages, { role: "assistant", content: "", streaming: true }]);
    setInput("");
    setLoading(true);

    if (textareaRef.current) textareaRef.current.style.height = "44px";

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          vehicleContext: buildContext(),
        }),
      });

      if (!response.ok) throw new Error("API hatası");

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value).split("\n").filter((l) => l.startsWith("data: "));
        for (const line of lines) {
          const data = line.slice(6);
          if (data === "[DONE]") break;
          try {
            const parsed = JSON.parse(data) as { text: string };
            assistantText += parsed.text;
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = { role: "assistant", content: assistantText, streaming: true };
              return updated;
            });
            scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
          } catch {}
        }
      }

      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: assistantText, streaming: false };
        return updated;
      });
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: "Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.", streaming: false };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  }

  function handleTextareaChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    e.target.style.height = "44px";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  }

  const suggestions = ["Kritik uyarılar neler?", "Bakım özeti ver", "Önümüzdeki 30 gün", "En düşük skorlu araç?"];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        showCloseButton={true}
        className="w-[380px] sm:w-[440px] p-0 flex flex-col gap-0"
      >
        {/* Header */}
        <SheetHeader className="px-5 pt-5 pb-4 border-b border-border/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-mesh rounded-2xl shadow-md shadow-primary/20">
              <Sparkles className="h-4 w-4 text-primary-foreground/90" />
            </div>
            <div>
              <SheetTitle className="font-outfit font-bold text-base">Filo Copilot</SheetTitle>
              <p className="text-xs text-muted-foreground">AI Destekli Filo Asistanı</p>
            </div>
          </div>
        </SheetHeader>

        {/* Suggestion chips */}
        {messages.length === 0 && (
          <div className="px-4 py-3 flex flex-wrap gap-2 border-b border-border/30 shrink-0">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => sendMessage(s)}
                disabled={loading}
                className="px-3 py-1.5 rounded-full text-[11px] border border-border/50 bg-muted/40 hover:bg-primary/10 hover:border-primary/30 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto no-scrollbar px-4 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="h-full min-h-40 flex flex-col items-center justify-center text-center gap-3 text-muted-foreground py-8">
              <Sparkles className="h-10 w-10 opacity-15" />
              <p className="text-sm font-medium">Filo durumunuz hakkında soru sorun</p>
              <p className="text-xs opacity-60">Bakım, sigorta, muayene ve daha fazlası</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start gap-2.5"}`}>
              {msg.role === "assistant" && (
                <div className="p-1.5 bg-mesh rounded-xl h-7 w-7 shrink-0 mt-0.5 shadow-sm shadow-primary/20">
                  <Bot className="h-4 w-4 text-primary-foreground/80" />
                </div>
              )}
              <div className={`max-w-[82%] rounded-3xl px-4 py-2.5 ${msg.role === "user"
                ? "bg-primary text-primary-foreground rounded-br-md"
                : "bg-muted/60 border border-border/40 rounded-bl-md"
              }`}>
                {msg.role === "user" ? (
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                ) : (
                  <span>
                    <MarkdownMessage content={msg.content} />
                    {msg.streaming && (
                      <span className="inline-block w-1.5 h-4 bg-foreground/60 animate-pulse ml-0.5 rounded-sm align-middle" />
                    )}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Input area */}
        <div className="px-4 py-4 border-t border-border/40 shrink-0">
          <div className="flex gap-2 items-end">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Filonuz hakkında bir şey sorun..."
              rows={1}
              className="flex-1 bg-muted/40 rounded-2xl px-4 py-3 text-sm resize-none min-h-[44px] max-h-[120px] focus:outline-none focus:ring-2 focus:ring-primary/30 border border-border/40 placeholder:text-muted-foreground/60"
            />
            <Button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              className="rounded-2xl h-11 w-11 p-0 bg-mesh text-white border-none shadow-md shadow-primary/20 shrink-0 hover:opacity-90 disabled:opacity-40"
            >
              <SendHorizonal className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground/50 text-center mt-2">Enter gönderir · Shift+Enter yeni satır</p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Shell wrapper (lazy data fetch) ──────────────────────────

export function AICopilotShell() {
  const { open } = useCopilot();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    if (loaded) return;
    try {
      const v = await getVehicles();
      setVehicles(v);
      setLoaded(true);
    } catch {}
  }, [loaded]);

  useEffect(() => {
    if (open && !loaded) load();
  }, [open, loaded, load]);

  const scores = vehicles.map((v) => calculateHealthScore(v));
  const fleetScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const alertCount = getFleetAlerts(vehicles).length;

  return <AICopilot vehicles={vehicles} fleetScore={fleetScore} alertCount={alertCount} />;
}
