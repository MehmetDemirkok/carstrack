import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Next.js 16 proxy (replaces middleware.ts).
// Critical rule: NEVER set httpOnly on Supabase session cookies.
// The browser client uses document.cookie to read/write them — httpOnly breaks that.
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
          // Step 1: make downstream server code see the refreshed tokens
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // Step 2: new response that carries the updated request cookies
          supabaseResponse = NextResponse.next({ request });
          // Step 3: write cookies to response — use Supabase's options as-is.
          // Do NOT add httpOnly: Supabase browser client needs document.cookie access.
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Always getUser() (not getSession()) — validates JWT server-side and
  // triggers a token refresh if the access token is expiring.
  let user = null;
  let staleSession = false;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      const code = (error as { code?: string })?.code ?? "";
      if (
        code === "refresh_token_not_found" ||
        code === "refresh_token_already_used"
      ) {
        staleSession = true;
      }
      // "Auth session missing!" is normal for unauthenticated requests — not an error.
    } else {
      user = data?.user ?? null;
    }
  } catch {
    // Network timeout or unexpected error — don't block the request.
  }

  const { pathname } = request.nextUrl;

  const isAuthOnlyPath =
    pathname.startsWith("/login") || pathname.startsWith("/register");

  const isPublicPath =
    isAuthOnlyPath ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/auth/callback") ||
    pathname.startsWith("/privacy");

  // Stale/expired session → wipe sb- cookies, redirect to login
  if (staleSession) {
    const loginUrl = new URL("/login", request.url);
    const redirectResponse = NextResponse.redirect(loginUrl);
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

  // Authenticated on login/register → home
  if (user && isAuthOnlyPath) {
    const redirectResponse = NextResponse.redirect(new URL("/", request.url));
    supabaseResponse.cookies.getAll().forEach(({ name, value, ...rest }) =>
      redirectResponse.cookies.set(
        name,
        value,
        rest as Parameters<typeof redirectResponse.cookies.set>[2]
      )
    );
    return redirectResponse;
  }

  // Return supabaseResponse (not NextResponse.next()) so refreshed tokens
  // are delivered to the browser.
  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|api|favicon\\.ico|manifest\\.json|robots\\.txt|sitemap\\.xml|apple-icon\\.png|icon\\.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)).*)",
  ],
};
