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

    async function loadProfile(userId: string, metadataCompanyId?: string) {
      try {
        console.log("loadProfile: Fetching profile for", userId);
        
        // If we have metadata, we can partially set the state immediately to unblock the UI
        if (metadataCompanyId) {
          console.log("loadProfile: Using metadata company_id", metadataCompanyId);
          setCompany({ id: metadataCompanyId, name: "Yükleniyor...", createdAt: "", inviteCode: "" });
        }

        // Use server API route instead of client-side Supabase to avoid
        // browser auth session hanging issues
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const res = await fetch("/api/auth/profile", {
          signal: controller.signal,
          credentials: "same-origin",
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          console.error("Profile API error:", res.status, body);

          if (res.status === 401) {
            // User session is invalid server-side
            console.warn("User session invalid, signing out...");
            supabase.auth.signOut();
            return;
          }

          // If we had metadata, we already set the companyId, so we can proceed
          if (metadataCompanyId) return;
          setProfile(null);
          setCompany(null);
          return;
        }

        const { profile: profileData, company: companyData } = await res.json();

        if (profileData) {
          console.log("loadProfile: Profile found", profileData.fullName);
          setProfile(profileData);

          if (companyData) {
            setCompany(companyData);

            // Auto-migrate: If metadata is missing, update it now for future speed
            if (!metadataCompanyId) {
              console.log("loadProfile: Auto-migrating company_id to metadata...");
              supabase.auth.updateUser({ data: { company_id: companyData.id } })
                .catch(err => console.error("Metadata migration failed:", err));
            }
          } else {
            setCompany(null);
          }
        } else {
          console.log("loadProfile: No profile data");
          setProfile(null);
          setCompany(null);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          console.error("Profile fetch timed out after 10s");
        } else {
          console.error("Failed to load profile", err);
        }
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
      } else if (event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION" || event === "SIGNED_IN") {
        if (!initializedRef.current || event === "SIGNED_IN") {
          if (u) {
            try {
              await loadProfile(u.id, u.user_metadata?.company_id);
            } catch (err) {
              console.error("Auth profile load failed:", err);
            }
          } else {
            setProfile(null);
            setCompany(null);
          }
          setLoading(false);
          initializedRef.current = true;
        }
      } else {
        // Other events: USER_UPDATED, etc.
        if (u) await loadProfile(u.id, u.user_metadata?.company_id);
        setLoading(false);
        initializedRef.current = true;
      }
    });

    // Safety timeout: if after 15 seconds we are still loading, force it to false.
    // This prevents the "Loading..." hang if Supabase events never fire or get stuck.
    const timer = setTimeout(() => {
      if (!initializedRef.current) {
        console.warn("Auth initialization timed out, forcing loading to false");
        setLoading(false);
        initializedRef.current = true;
      }
    }, 15000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
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
