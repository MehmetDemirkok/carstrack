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

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|api|favicon\\.ico|manifest\\.json|robots\\.txt|sitemap\\.xml|apple-icon\\.png|icon\\.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)).*)",
  ],
};
