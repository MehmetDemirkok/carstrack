"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";

const SESSION_KEY = "carstrack:dept-notice-shown";

export function ProfileCompletionNotice() {
  const { profile, loading } = useAuth();
  const router = useRouter();
  const shown = useRef(false);

  useEffect(() => {
    if (loading) return;
    if (!profile) return;
    if (profile.department) return;             // already filled
    if (shown.current) return;                  // already shown this render cycle
    if (sessionStorage.getItem(SESSION_KEY)) return; // already shown this session

    shown.current = true;
    sessionStorage.setItem(SESSION_KEY, "1");

    toast("Profilinizi tamamlayın", {
      description: "Görev raporlarında departman / ünvan bilginiz görünsün diye Ayarlar sayfasını doldurun.",
      duration: 10000,
      action: {
        label: "Ayarlara Git",
        onClick: () => router.push("/settings"),
      },
    });
  }, [loading, profile, router]);

  return null;
}
