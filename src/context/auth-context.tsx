"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
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
      const { data } = await supabase
        .from("profiles")
        .select("*, companies(*)")
        .eq("id", userId)
        .single();

      if (data) {
        setProfile({
          id: data.id,
          companyId: data.company_id,
          role: data.role,
          fullName: data.full_name,
          createdAt: data.created_at,
        });
        const comp = data.companies as Record<string, string>;
        setCompany({
          id: comp.id,
          name: comp.name,
          createdAt: comp.created_at,
        });
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        await loadProfile(u.id);
      } else {
        setProfile(null);
        setCompany(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        await loadProfile(u.id);
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
