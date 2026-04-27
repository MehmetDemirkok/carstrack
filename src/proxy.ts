import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Safety timeout for getUser to prevent proxy from hanging the entire request
  const userPromise = supabase.auth.getUser();
  const timeoutPromise = new Promise<{ data: { user: null }, error: Error }>((_, reject) => 
    setTimeout(() => reject(new Error("Auth timeout")), 5000)
  );

  let user = null;
  try {
    const { data } = await Promise.race([userPromise, timeoutPromise]) as any;
    user = data?.user;
  } catch (err) {
    console.error("Proxy auth timeout or error:", err);
  }

  const { pathname } = request.nextUrl;
  // isAuthOnlyPath: pages that redirect logged-in users away (login/register)
  const isAuthOnlyPath = pathname.startsWith("/login") || pathname.startsWith("/register");
  // isPublicPath: pages accessible without a session (includes reset-password — user arrives via email link)
  const isPublicPath = isAuthOnlyPath || pathname.startsWith("/reset-password") || pathname === "/";

  if (!user && !isPublicPath) {
    const redirectResponse = NextResponse.redirect(new URL("/login", request.url));
    supabaseResponse.cookies.getAll().forEach(({ name, value, ...options }) => {
      redirectResponse.cookies.set(name, value, options as Parameters<typeof redirectResponse.cookies.set>[2]);
    });
    return redirectResponse;
  }

  if (user && isAuthOnlyPath) {
    const redirectResponse = NextResponse.redirect(new URL("/vehicles", request.url));
    supabaseResponse.cookies.getAll().forEach(({ name, value, ...options }) => {
      redirectResponse.cookies.set(name, value, options as Parameters<typeof redirectResponse.cookies.set>[2]);
    });
    return redirectResponse;
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json|api).*)"],
};