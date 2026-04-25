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
    } = supabase.auth.onAuthStateChange(async (_event: AuthChangeEvent, session: Session | null) => {
      const u = session?.user ?? null;
      setUser(u);
      // Any auth change must invalidate the per-user company cache in db.ts.
      clearCompanyCache();
      if (u) {
        await loadProfile(u.id);
      } else {
        setProfile(null);
        setCompany(null);
      }
      setLoading(false);
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
