"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { BottomNav } from "./bottom-nav";

const SIDEBAR_COLLAPSED_KEY = "carstrack:sidebar-collapsed";

const AUTH_PATHS = [
  "/login",
  "/register",
  "/reset-password",
  "/",
  "/privacy",
  "/sss",
  "/ozellikler",
  "/arac-bakim-takip",
  "/km-guncelle",
];

export function ShellWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = AUTH_PATHS.some((p) =>
    p === "/" ? pathname === "/" : pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p)
  );

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (saved === "1") {
      // Read external storage on mount — legitimate use of setState in effect
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSidebarCollapsed(true);
    }
  }, []);

  const toggleSidebarCollapsed = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      return next;
    });
  };

  if (isAuthPage) {
    return <div className="w-full flex-1 flex flex-col overflow-x-hidden">{children}</div>;
  }

  return (
    <>
      <Sidebar collapsed={sidebarCollapsed} onToggleCollapsed={toggleSidebarCollapsed} />
      <div
        className={`flex-1 flex flex-col w-full relative transition-[margin-left] duration-300 ease-in-out ${
          sidebarCollapsed ? "md:ml-20" : "md:ml-64"
        }`}
      >
        <TopBar />
        <main className="flex-1 overflow-x-hidden pb-20 md:pb-6 w-full">
          {children}
        </main>
        <BottomNav />
      </div>
    </>
  );
}
