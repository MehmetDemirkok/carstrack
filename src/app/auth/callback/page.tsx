"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Car } from "lucide-react";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handle = async () => {
      const supabase = createClient();
      const search = new URLSearchParams(window.location.search);
      const next = search.get("next") ?? "/";

      // Supabase forwarded an error (e.g. token expired on its side)
      const errorParam = search.get("error") ?? search.get("error_description");
      if (errorParam) {
        router.replace(`/reset-password?error=${encodeURIComponent(errorParam)}`);
        return;
      }

      // Implicit flow: Supabase puts tokens in the URL hash (#access_token=...&refresh_token=...&type=recovery)
      // Hash fragments are never sent to the server, so we must parse them here client-side.
      const hash = window.location.hash.substring(1);
      if (hash.includes("access_token=")) {
        const hashParams = new URLSearchParams(hash);
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) {
            router.replace(`/reset-password?error=${encodeURIComponent(error.message)}`);
          } else {
            router.replace(next);
          }
          return;
        }
      }

      // PKCE flow: Supabase puts an auth code in the query string (?code=...)
      const code = search.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          router.replace(`/reset-password?error=${encodeURIComponent(error.message)}`);
        } else {
          router.replace(next);
        }
        return;
      }

      // Nothing usable — redirect to error
      router.replace(
        `/reset-password?error=${encodeURIComponent(
          "Bağlantı geçersiz veya süresi dolmuş. Lütfen tekrar deneyin."
        )}`
      );
    };

    handle();
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
      <div className="bg-mesh p-4 rounded-3xl shadow-xl shadow-primary/40">
        <Car className="h-8 w-8 text-white drop-shadow" />
      </div>
      <span className="h-7 w-7 rounded-full border-2 border-primary border-r-transparent animate-spin" />
      <p className="text-sm text-muted-foreground">Doğrulanıyor...</p>
    </div>
  );
}
