"use client";

import { Bell, Moon, Sun } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import Link from "next/link";
import { useLanguage } from "@/context/language-context";
import { useAuth } from "@/context/auth-context";

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function TopBar() {
  const { theme, setTheme } = useTheme();
  const { t } = useLanguage();
  const { profile } = useAuth();

  const initials = profile?.fullName ? getInitials(profile.fullName) : "?";
  const firstName = profile?.fullName?.split(" ")[0] ?? "...";

  return (
    <header className="sticky top-0 z-50 w-full glass border-b border-border/30">
      <div className="flex h-14 items-center justify-between px-4 md:px-8 w-full">
        <Link href="/settings" className="flex items-center gap-3 tap-highlight-transparent">
          <Avatar className="h-9 w-9 ring-2 ring-primary/20 shadow-sm">
            <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground leading-none font-medium">
              {t("topbar_welcome")}
            </span>
            <span className="text-sm font-bold leading-none mt-1 font-outfit">
              {firstName}
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full h-9 w-9 hover:bg-primary/10"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-muted-foreground" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-muted-foreground" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="relative rounded-full h-9 w-9 hover:bg-primary/10"
          >
            <Bell className="h-4 w-4 text-muted-foreground" />
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-destructive border-2 border-background shadow-sm"
            />
          </Button>
        </div>
      </div>
    </header>
  );
}
