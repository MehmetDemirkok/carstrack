import { createBrowserClient } from "@supabase/ssr";

// createBrowserClient handles its own internal deduplication per URL+key.
// Do NOT use a module-level singleton — stale instances survive Fast Refresh
// in development and can hold expired sessions.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
