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
          } catch (_) {
            // Ignore if setting cookies fails
          }
        },
      },
    }
  );

  // Sign out on the server, this clears the session and cookies
  await supabase.auth.signOut();

  // Also manually wipe any remaining sb- cookies to be absolutely sure
  cookieStore.getAll().forEach((cookie) => {
    if (cookie.name.startsWith("sb-")) {
      cookieStore.set(cookie.name, "", { maxAge: 0, path: "/" });
    }
  });

  return NextResponse.json({ success: true });
}
