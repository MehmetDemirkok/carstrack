"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { BottomNav } from "./bottom-nav";

const AUTH_PATHS = ["/login", "/register", "/reset-password", "/", "/pricing", "/payment"];

export function ShellWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = AUTH_PATHS.some((p) =>
    p === "/" ? pathname === "/" : pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p)
  );

  if (isAuthPage) {
    return <div className="w-full flex-1 flex flex-col overflow-x-hidden">{children}</div>;
  }

  return (
    <>
      <Sidebar />
      <div className="flex-1 flex flex-col md:ml-64 w-full relative">
        <TopBar />
        <main className="flex-1 overflow-x-hidden pb-20 md:pb-6 w-full">
          {children}
        </main>
        <BottomNav />
      </div>
    </>
  );
}
