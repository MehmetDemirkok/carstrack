import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );

  await supabase.auth.signOut();

  // Wipe every sb- cookie in the response — browser deletes them on receipt.
  const response = NextResponse.json({ success: true });
  cookieStore.getAll().forEach((cookie) => {
    if (cookie.name.startsWith("sb-")) {
      response.cookies.set(cookie.name, "", { maxAge: 0, path: "/" });
    }
  });

  return response;
}
