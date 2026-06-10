import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Next.js 16 proxy (replaces middleware.ts).
//
// PERFORMANCE NOTE: We use getSession() here (local JWT check, no network call)
// instead of getUser() (network call to Supabase Auth server).
// getUser() was causing 400-500ms latency on every request in production,
// blocking auth initialization and data fetches.
// Security: API routes that need identity verification still call getUser().
// This proxy is only responsible for redirects.
export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, {
              ...options,
              // Ensure Secure flag in production (HTTPS required).
              // Do NOT add httpOnly — browser client needs document.cookie access.
              secure: process.env.NODE_ENV === "production",
            })
          );
        },
      },
    }
  );

  // getSession() is a local operation — reads JWT from cookie, no network call.
  // This keeps the proxy under 1ms instead of 400-500ms.
  let user = null;
  let staleSession = false;
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      const code = (error as { code?: string })?.code ?? "";
      if (
        code === "refresh_token_not_found" ||
        code === "refresh_token_already_used"
      ) {
        staleSession = true;
      }
    } else {
      user = session?.user ?? null;
    }
  } catch {
    // Unexpected error — don't block the request.
  }

  const { pathname } = request.nextUrl;

  // Static / crawler-facing files must NEVER be redirected to login.
  // The matcher regex should already exclude these, but an explicit guard
  // ensures correctness even if the matcher is bypassed in some edge case.
  const isStaticAsset =
    pathname === "/sitemap.xml" ||
    pathname === "/robots.txt" ||
    pathname === "/manifest.json" ||
    pathname.endsWith(".ico") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".txt") ||
    pathname.endsWith(".xml");

  if (isStaticAsset) return supabaseResponse;

  const isAuthOnlyPath =
    pathname.startsWith("/login") || pathname.startsWith("/register");

  const isPublicPath =
    isAuthOnlyPath ||
    pathname === "/" ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/auth/callback") ||
    pathname.startsWith("/privacy");

  // Stale/expired session → wipe sb- cookies, redirect to login
  if (staleSession) {
    const redirectResponse = NextResponse.redirect(
      new URL("/login", request.url)
    );
    request.cookies
      .getAll()
      .filter(({ name }) => name.startsWith("sb-"))
      .forEach(({ name }) =>
        redirectResponse.cookies.set(name, "", { maxAge: 0, path: "/" })
      );
    return redirectResponse;
  }

  // Unauthenticated on a protected page → login
  if (!user && !isPublicPath) {
    const redirectResponse = NextResponse.redirect(
      new URL("/login", request.url)
    );
    supabaseResponse.cookies.getAll().forEach(({ name, value, ...rest }) =>
      redirectResponse.cookies.set(
        name,
        value,
        rest as Parameters<typeof redirectResponse.cookies.set>[2]
      )
    );
    return redirectResponse;
  }

  // Authenticated on login/register or landing page → dashboard
  if (user && (isAuthOnlyPath || pathname === "/")) {
    const redirectResponse = NextResponse.redirect(new URL("/dashboard", request.url));
    supabaseResponse.cookies.getAll().forEach(({ name, value, ...rest }) =>
      redirectResponse.cookies.set(
        name,
        value,
        rest as Parameters<typeof redirectResponse.cookies.set>[2]
      )
    );
    return redirectResponse;
  }

  // ── Rol bazlı erişim ──────────────────────────────────────────
  // Sürücüler (role = 'user') yalnızca kendi sayfalarına erişebilir.
  // Aşağıdaki sayfalar yalnızca yönetici/operatöre açıktır. Rol JWT'de
  // tutulmadığından, DB sorgusunu YALNIZCA bu sayfalara girişte yaparız
  // (sürücü/yönetici normal akışına gecikme bindirmez).
  const isManagerOnlyPath =
    pathname.startsWith("/analytics") ||
    pathname.startsWith("/history") ||
    pathname.startsWith("/users") ||
    pathname.startsWith("/vehicles/new");

  if (user && isManagerOnlyPath) {
    let role: string | null = null;
    try {
      const { data: prof } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      role = (prof?.role as string) ?? null;
    } catch {
      // Sorgu başarısızsa engellemeyiz (mevcut akışı bozmamak için).
    }
    if (role === "user") {
      const redirectResponse = NextResponse.redirect(new URL("/dashboard", request.url));
      supabaseResponse.cookies.getAll().forEach(({ name, value, ...rest }) =>
        redirectResponse.cookies.set(
          name,
          value,
          rest as Parameters<typeof redirectResponse.cookies.set>[2]
        )
      );
      return redirectResponse;
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|api|favicon\\.ico|manifest\\.json|robots\\.txt|sitemap\\.xml|apple-icon\\.png|icon\\.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)).*)",
  ],
};
