"use client";

import { createContext, useContext, useEffect, useState } from "react";
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

  useEffect(() => {
    const supabase = createClient();

    async function loadProfile(userId: string) {
      try {
        // Ensure the access token is live before querying.
        // On page load, INITIAL_SESSION can fire with a briefly-stale JWT while
        // the client is still completing its refresh cycle.  getUser() forces a
        // server-validated token, guaranteeing the profiles RLS check passes.
        await supabase.auth.getUser();

        const { data, error } = await supabase
          .from("profiles")
          .select("*, companies(*)")
          .eq("id", userId)
          .single();

        if (error) {
          console.error("Profile fetch error:", error);
        }

        if (data) {
          setProfile({
            id: data.id,
            companyId: data.company_id,
            role: data.role,
            fullName: data.full_name,
            createdAt: data.created_at,
          });
          const comp = data.companies as Record<string, string> | null | undefined;
          if (comp) {
            setCompany({
              id: comp.id,
              name: comp.name,
              createdAt: comp.created_at,
              inviteCode: comp.invite_code,
            });
          } else {
            setCompany(null);
          }
        } else {
          setProfile(null);
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
      const u = session?.user ?? null;
      setUser(u);

      if (event === "SIGNED_OUT") {
        // User signed out: wipe everything and signal ready.
        clearCompanyCache();
        setProfile(null);
        setCompany(null);
        setLoading(false);
      } else if (event === "TOKEN_REFRESHED") {
        // Background token refresh — user identity and profile are unchanged.
        // Do NOT call setLoading(false) here: on page load with an expired token,
        // TOKEN_REFRESHED fires BEFORE INITIAL_SESSION.  Marking loading as done
        // here would cause child components to render with profile=null (showing
        // the lowercase email fallback) before INITIAL_SESSION loads the profile.
        // Do NOT clear company cache: no identity change occurred.
      } else {
        // INITIAL_SESSION, SIGNED_IN, USER_UPDATED, PASSWORD_RECOVERY, etc.
        // Clear the company cache in case the user identity changed, reload profile,
        // then — and only then — signal that the auth layer is fully initialised.
        clearCompanyCache();
        if (u) {
          await loadProfile(u.id);
        } else {
          setProfile(null);
          setCompany(null);
        }
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      // Clear server-side cookies
      await fetch("/api/auth/logout", { method: "POST" });
      
      // Clear client-side session just in case
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Sign out error", err);
    } finally {
      clearCompanyCache();
      setUser(null);
      setProfile(null);
      setCompany(null);
      
      try {
        if (typeof document !== "undefined") {
          document.cookie.split(";").forEach((c) => {
            if (c.trim().startsWith("sb-")) {
              document.cookie = c.replace(/^ +/, "").replace(/=.*/, `=;expires=${new Date(0).toUTCString()};path=/`);
            }
          });
        }
      } catch (e) {
        console.error("Cookie clear error", e);
      }

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
