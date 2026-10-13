"use client";

import { useRouter } from "next/navigation";
import { FeedbackDialog } from "@/components/feedback-dialog";

/**
 * Bildirimlerden doğrudan geri bildirim formuna iniş noktası.
 * Form bir dialog olduğu için burada açık başlatılır; kapatınca panoya dönülür.
 */
export default function FeedbackPage() {
  const router = useRouter();
  return (
    <div className="min-h-[60vh]">
      <FeedbackDialog open onOpenChange={() => router.replace("/dashboard")} />
    </div>
  );
}
