// Dev-only manuel tetikleyici — production'da 403 döner.
// Kullanım: GET http://localhost:3000/api/cron/fleet-alerts/test
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

export async function GET(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET is not set in .env.local" }, { status: 500 });
  }

  const cronUrl = new URL("/api/cron/fleet-alerts", new URL(req.url).origin);
  const response = await fetch(cronUrl.toString(), {
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
  });

  const body = await response.json();
  return NextResponse.json(body, { status: response.status });
}
