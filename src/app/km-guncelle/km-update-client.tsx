"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Gauge,
  Loader2,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogoMark } from "@/components/brand/logo-mark";
import type { KilometerLogTokenContext, KilometerLogVehicleOption } from "@/lib/types";

type Status = "loading" | "ready" | "invalid" | "submitting" | "success";

function formatKm(n: number): string {
  return n.toLocaleString("tr-TR");
}

function parseKmInput(raw: string): number {
  const cleaned = raw.replace(/\s/g, "").replace(/\./g, "").replace(/,/g, "");
  return Number.parseInt(cleaned, 10);
}

export function KmUpdateClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";

  const [status, setStatus] = useState<Status>(token ? "loading" : "invalid");
  const [context, setContext] = useState<KilometerLogTokenContext | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [errorMsg, setErrorMsg] = useState(
    token ? "" : "Bağlantı geçersiz. Bildirimdeki linki kullanın.",
  );
  const [kmValue, setKmValue] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [lastSavedPlate, setLastSavedPlate] = useState("");
  const [remainingAfterSave, setRemainingAfterSave] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const selected: KilometerLogVehicleOption | undefined = context?.vehicles.find(
    (v) => v.vehicleId === selectedId,
  );

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/kilometer-logs/token?token=${encodeURIComponent(token)}`,
        );
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setStatus("invalid");
          setErrorMsg(data.error || "Bağlantı geçersiz.");
          return;
        }
        const ctx = data as KilometerLogTokenContext;
        setContext(ctx);
        const firstOpen =
          ctx.vehicles.find((v) => !v.alreadySubmitted) ?? ctx.vehicles[0];
        setSelectedId(firstOpen?.vehicleId ?? "");
        setStatus("ready");
      } catch {
        if (!cancelled) {
          setStatus("invalid");
          setErrorMsg("Bağlantı doğrulanamadı. İnternet bağlantınızı kontrol edin.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  const onPhotoChange = (file: File | null) => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhoto(file);
    setPhotoPreview(file ? URL.createObjectURL(file) : null);
  };

  const onSelectVehicle = (id: string) => {
    setSelectedId(id);
    setKmValue("");
    setFieldError("");
    onPhotoChange(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const validate = (): number | null => {
    const n = parseKmInput(kmValue);
    if (!Number.isFinite(n) || n < 0) {
      setFieldError("Geçerli bir kilometre değeri girin.");
      return null;
    }
    if (selected && n < selected.previousKilometer) {
      setFieldError("Girilen değer son kilometreden küçük olamaz");
      return null;
    }
    setFieldError("");
    return n;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = validate();
    if (n === null || !context || !selectedId) return;

    setStatus("submitting");
    setErrorMsg("");

    const body = new FormData();
    body.set("token", token);
    body.set("vehicle_id", selectedId);
    body.set("kilometer_value", String(n));
    if (photo) body.set("photo", photo);

    try {
      const res = await fetch("/api/kilometer-logs", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) {
        setStatus("ready");
        if (data.previousKilometer != null && data.error) {
          setFieldError(data.error);
        } else {
          setErrorMsg(data.error || "Kayıt başarısız. Tekrar deneyin.");
        }
        return;
      }

      setLastSavedPlate(data.vehiclePlate || selected?.vehiclePlate || "");
      const remainingIds = (data.remainingVehicleIds as string[] | undefined) ?? [];
      setRemainingAfterSave(remainingIds.length);

      // Context'i güncelle — bu aracı submitted işaretle
      setContext((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          vehicles: prev.vehicles.map((v) =>
            v.vehicleId === selectedId
              ? { ...v, alreadySubmitted: true, previousKilometer: n }
              : v,
          ),
        };
      });

      setStatus("success");
    } catch {
      setStatus("ready");
      setErrorMsg("Bağlantı hatası. Tekrar deneyin.");
    }
  };

  const continueNextVehicle = () => {
    if (!context) return;
    const next =
      context.vehicles.find((v) => !v.alreadySubmitted && v.vehicleId !== selectedId) ??
      context.vehicles.find((v) => !v.alreadySubmitted);
    if (!next) return;
    onSelectVehicle(next.vehicleId);
    setStatus("ready");
    setErrorMsg("");
  };

  return (
    <div className="min-h-dvh w-full flex flex-col bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 text-zinc-50">
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-md"
        >
          <div className="flex items-center gap-2.5 mb-8 justify-center">
            <LogoMark size={32} />
            <span className="font-outfit text-lg font-semibold tracking-tight">
              CarsTrack
            </span>
          </div>

          <AnimatePresence mode="wait">
            {status === "loading" && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-3 py-16 text-zinc-400"
              >
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <p className="text-sm">Bağlantı doğrulanıyor…</p>
              </motion.div>
            )}

            {status === "invalid" && (
              <motion.div
                key="invalid"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center"
              >
                <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
                <h1 className="font-outfit text-lg font-semibold mb-1">
                  Bağlantı kullanılamıyor
                </h1>
                <p className="text-sm text-zinc-400">{errorMsg}</p>
              </motion.div>
            )}

            {status === "success" && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center space-y-4"
              >
                <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto" />
                <div>
                  <h1 className="font-outfit text-xl font-semibold mb-1">
                    Kilometre kaydedildi
                  </h1>
                  <p className="text-sm text-zinc-400">
                    {lastSavedPlate} için{" "}
                    <span className="text-zinc-100 font-medium">
                      {formatKm(parseKmInput(kmValue))} km
                    </span>{" "}
                    güncellendi.
                  </p>
                </div>
                {remainingAfterSave > 0 ? (
                  <Button
                    type="button"
                    onClick={continueNextVehicle}
                    className="w-full h-11"
                  >
                    Sonraki aracı güncelle ({remainingAfterSave})
                  </Button>
                ) : (
                  <p className="text-xs text-zinc-500">
                    Tüm araçlar tamam. Bu pencereyi kapatabilirsiniz.
                  </p>
                )}
              </motion.div>
            )}

            {(status === "ready" || status === "submitting") && context && selected && (
              <motion.form
                key="form"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                onSubmit={handleSubmit}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/80 backdrop-blur-sm p-5 sm:p-6 shadow-xl space-y-5"
              >
                <div>
                  <h1 className="font-outfit text-xl font-semibold tracking-tight">
                    Haftalık kilometre
                  </h1>
                  <p className="text-sm text-zinc-400 mt-1">
                    Giriş yapmanıza gerek yok — yalnızca bu formu doldurun.
                  </p>
                </div>

                {context.vehicles.length > 1 ? (
                  <div className="space-y-2">
                    <Label htmlFor="vehicle" className="text-zinc-300">
                      Araç plakası <span className="text-red-400">*</span>
                    </Label>
                    <select
                      id="vehicle"
                      value={selectedId}
                      onChange={(e) => onSelectVehicle(e.target.value)}
                      disabled={status === "submitting"}
                      className="w-full h-12 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-base font-mono text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    >
                      {context.vehicles.map((v) => (
                        <option key={v.vehicleId} value={v.vehicleId}>
                          {v.vehiclePlate}
                          {v.alreadySubmitted ? " ✓" : ""} — {v.vehicleName}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-zinc-500">
                      {context.vehicles.filter((v) => !v.alreadySubmitted).length} /{" "}
                      {context.vehicles.length} araç bekliyor
                    </p>
                  </div>
                ) : null}

                <div className="rounded-xl bg-zinc-950/60 border border-zinc-800 p-4 flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-500/15 flex items-center justify-center shrink-0">
                    <Gauge className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-wider text-zinc-500 font-medium">
                      Seçili araç
                    </p>
                    <p className="font-mono font-bold text-base truncate">
                      {selected.vehiclePlate}
                    </p>
                    <p className="text-sm text-zinc-400 truncate">
                      {selected.vehicleName}
                    </p>
                    <p className="text-sm mt-2 text-zinc-300">
                      Son kilometre:{" "}
                      <span className="font-semibold text-zinc-50">
                        {formatKm(selected.previousKilometer)} km
                      </span>
                    </p>
                    {selected.alreadySubmitted && (
                      <p className="text-xs text-emerald-400 mt-1">
                        Bu araç için bu hafta kayıt var — yeniden gönderebilirsiniz.
                      </p>
                    )}
                  </div>
                </div>

                {errorMsg && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300 flex gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    {errorMsg}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="km" className="text-zinc-300">
                    Yeni kilometre <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="km"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder={String(selected.previousKilometer)}
                    value={kmValue}
                    onChange={(e) => {
                      setKmValue(e.target.value);
                      if (fieldError) setFieldError("");
                    }}
                    onBlur={() => validate()}
                    disabled={status === "submitting"}
                    className="h-12 text-lg font-mono bg-zinc-950 border-zinc-700 text-zinc-50 placeholder:text-zinc-600"
                    aria-invalid={!!fieldError}
                  />
                  {fieldError && (
                    <p className="text-sm text-red-400 flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {fieldError}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-zinc-300">
                    Sayaç fotoğrafı{" "}
                    <span className="text-zinc-500 font-normal">(isteğe bağlı)</span>
                  </Label>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => onPhotoChange(e.target.files?.[0] ?? null)}
                  />
                  {photoPreview ? (
                    <div className="relative rounded-xl overflow-hidden border border-zinc-700">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photoPreview}
                        alt="Sayaç önizleme"
                        className="w-full max-h-48 object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          onPhotoChange(null);
                          if (fileRef.current) fileRef.current.value = "";
                        }}
                        className="absolute top-2 right-2 h-8 w-8 rounded-full bg-zinc-950/80 flex items-center justify-center text-zinc-200 hover:bg-zinc-900"
                        aria-label="Fotoğrafı kaldır"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={status === "submitting"}
                      className="w-full h-24 rounded-xl border border-dashed border-zinc-700 bg-zinc-950/40 flex flex-col items-center justify-center gap-1.5 text-zinc-400 hover:border-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      <Camera className="h-6 w-6" />
                      <span className="text-sm">Fotoğraf çek veya seç</span>
                    </button>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={status === "submitting" || !kmValue.trim() || !selectedId}
                  className="w-full h-12 text-base font-semibold"
                >
                  {status === "submitting" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Kaydediliyor…
                    </>
                  ) : (
                    "Kilometreyi Kaydet"
                  )}
                </Button>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
