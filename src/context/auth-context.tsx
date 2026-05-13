"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { clearCompanyCache } from "@/lib/db";
import type { Profile, Company } from "@/lib/types";

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  company: Company | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  company: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const initializedRef = useRef(false);

  useEffect(() => {
    const supabase = createClient();

    // Load profile directly via the browser Supabase client.
    // This avoids the cookie-timing race that occurs when an API route is called
    // immediately after signInWithPassword (cookies may not have reached the server yet).
    async function loadProfile(userId: string, metadataCompanyId?: string) {
      try {
        if (metadataCompanyId) {
          setCompany({ id: metadataCompanyId, name: "Yükleniyor...", createdAt: "", inviteCode: "", plan: "free" });
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("id, company_id, role, full_name, department, avatar_url, notify_by_email, created_at, companies(id, name, created_at, invite_code, plan, plan_expires_at, stripe_sub_id, stripe_customer_id)")
          .eq("id", userId)
          .single();

        if (error || !data) {
          console.error("loadProfile error:", error?.message ?? "no data");
          if (metadataCompanyId) return;
          setProfile(null);
          setCompany(null);
          return;
        }

        const comp = (
          Array.isArray(data.companies) ? data.companies[0] : data.companies
        ) as Record<string, string> | null | undefined;

        setProfile({
          id: data.id,
          companyId: data.company_id,
          role: data.role as "manager" | "driver",
          fullName: data.full_name,
          department: (data.department as string) || "",
          avatarUrl: (data.avatar_url as string) || undefined,
          notifyByEmail: data.notify_by_email !== false,
          createdAt: data.created_at,
        });

        if (comp?.id) {
          setCompany({
            id: comp.id,
            name: comp.name,
            createdAt: comp.created_at,
            inviteCode: comp.invite_code,
            plan: (comp.plan as string) || "free",
            planExpiresAt: comp.plan_expires_at as string | undefined,
            stripeSubId: comp.stripe_sub_id as string | undefined,
            stripeCustomerId: comp.stripe_customer_id as string | undefined,
          } as import("@/lib/types").Company);
          // Back-fill company_id into user metadata for faster loads next time
          if (!metadataCompanyId) {
            supabase.auth.updateUser({ data: { company_id: comp.id } })
              .catch((err: unknown) => console.error("Metadata migration failed:", err));
          }
        } else {
          setCompany(null);
        }
      } catch (err) {
        console.error("Failed to load profile", err);
        setProfile(null);
        setCompany(null);
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
      console.log("Auth event:", event, session?.user?.id);
      const u = session?.user ?? null;
      setUser(u);

      if (event === "SIGNED_OUT") {
        clearCompanyCache();
        setProfile(null);
        setCompany(null);
        setLoading(false);
        initializedRef.current = true;
        // If the sign-out was triggered by a stale/invalid token, redirect to login
        if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
          window.location.href = "/login";
        }
      } else if (event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION" || event === "SIGNED_IN") {
        if (!initializedRef.current || event === "SIGNED_IN") {
          if (u) {
            // Unblock the UI immediately — pages can start fetching with companyId
            // from metadata without waiting for the full profile Supabase query.
            const metaCompanyId = u.user_metadata?.company_id as string | undefined;
            if (metaCompanyId) {
              // Partial company so requireCompanyId() returns instantly
              setCompany(prev => prev ?? { id: metaCompanyId, name: "", createdAt: "", inviteCode: "", plan: "free" });
            }
            setLoading(false);
            initializedRef.current = true;
            // Load full profile in background — updates profile + fills company name
            loadProfile(u.id, metaCompanyId).catch((err) =>
              console.error("Auth profile load failed:", err)
            );
          } else {
            setProfile(null);
            setCompany(null);
            setLoading(false);
            initializedRef.current = true;
          }
        }
      } else {
        // Other events: USER_UPDATED, etc. — non-blocking profile refresh
        if (u) loadProfile(u.id, u.user_metadata?.company_id).catch(() => {});
        if (!initializedRef.current) {
          setLoading(false);
          initializedRef.current = true;
        }
      }
    });

    // Safety timeout: force-unblock the UI if Supabase events never fire.
    // 5s is enough — INITIAL_SESSION normally fires in < 500ms.
    const timer = setTimeout(() => {
      if (!initializedRef.current) {
        console.warn("Auth initialization timed out, forcing loading to false");
        setLoading(false);
        initializedRef.current = true;
      }
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const signOut = async () => {
    try {
      // Client-side first: clears in-memory session and removes cookies via browser client
      const supabase = createClient();
      await supabase.auth.signOut();
      // Server-side: ensures sb- cookies are wiped in the response
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Sign out error", err);
    } finally {
      clearCompanyCache();
      setUser(null);
      setProfile(null);
      setCompany(null);
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, company, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
