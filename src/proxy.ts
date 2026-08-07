import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Read `sub` from the access token JWT without touching `session.user`.
 * Accessing `session.user` on the server triggers Supabase's insecure-session warning.
 * Signature verification is intentionally skipped here — this proxy only drives redirects;
 * API routes still call getUser() for authenticated mutations.
 */
function userIdFromAccessToken(accessToken: string): string | null {
  try {
    const [, payload] = accessToken.split(".");
    if (!payload) return null;
    const json = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    ) as { sub?: unknown };
    return typeof json.sub === "string" ? json.sub : null;
  } catch {
    return null;
  }
}

// Next.js 16 proxy (replaces middleware.ts).
//
// PERFORMANCE: getSession() is local (cookie JWT). We never read session.user —
// only access_token → decode `sub` — so the insecure-user warning stays silent.
// getUser()/getClaims() with HS256 would add ~400–500ms per request.
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

  let userId: string | null = null;
  let staleSession = false;
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    if (error) {
      const code = (error as { code?: string })?.code ?? "";
      if (
        code === "refresh_token_not_found" ||
        code === "refresh_token_already_used"
      ) {
        staleSession = true;
      }
    } else if (session?.access_token) {
      userId = userIdFromAccessToken(session.access_token);
    }
  } catch {
    // Unexpected error — don't block the request.
  }

  const { pathname } = request.nextUrl;

  // Static / crawler-facing files must NEVER be redirected to login.
  // The matcher regex should already exclude these, but an explicit guard
  // ensures correctness even if the matcher is bypassed in some edge case.
  const isStaticAsset =
    pathname === "/sw.js" ||
    pathname === "/sitemap.xml" ||
    pathname === "/robots.txt" ||
    pathname === "/manifest.json" ||
    pathname.endsWith(".ico") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".txt") ||
    pathname.endsWith(".xml") ||
    pathname.endsWith(".html");

  if (isStaticAsset) return supabaseResponse;

  const isAuthOnlyPath =
    pathname.startsWith("/login") || pathname.startsWith("/register");

  const isPublicPath =
    isAuthOnlyPath ||
    pathname === "/" ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/auth/callback") ||
    pathname.startsWith("/privacy") ||
    pathname.startsWith("/sss") ||
    pathname.startsWith("/ozellikler") ||
    pathname.startsWith("/arac-bakim-takip");

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
  if (!userId && !isPublicPath) {
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

  // E-posta daveti (?invite=<token>) ile gelindiyse, cihazda başka bir
  // hesabın oturumu açık olsa bile davet formunu bastırmayız — aynı bilgisayarı
  // birden fazla kişi kullanıyor olabilir (ör. ortak ofis PC'si). Yeni üye
  // formu kendi hesabıyla giriş yaparak eski oturumun yerini alır.
  const isRegisterWithInvite =
    pathname.startsWith("/register") &&
    request.nextUrl.searchParams.has("invite");

  // Authenticated on login/register or landing page → dashboard
  if (userId && (isAuthOnlyPath || pathname === "/") && !isRegisterWithInvite) {
    const redirectResponse = NextResponse.redirect(
      new URL("/dashboard", request.url)
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

  if (userId && isManagerOnlyPath) {
    let role: string | null = null;
    try {
      const { data: prof } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();
      role = (prof?.role as string) ?? null;
    } catch {
      // Sorgu başarısızsa engellemeyiz (mevcut akışı bozmamak için).
    }
    if (role === "user") {
      const redirectResponse = NextResponse.redirect(
        new URL("/dashboard", request.url)
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
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|api|sw\\.js|favicon\\.ico|manifest\\.json|robots\\.txt|sitemap\\.xml|apple-icon\\.png|icon\\.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|html)).*)",
  ],
};
