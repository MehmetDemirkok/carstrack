"use client";

import { Bell, Moon, Sun } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 6) return "İyi geceler";
  if (h < 12) return "Günaydın";
  if (h < 18) return "İyi günler";
  return "İyi akşamlar";
}

export function TopBar() {
  const { theme, setTheme } = useTheme();
  const { profile } = useAuth();

  const initials = profile?.fullName ? getInitials(profile.fullName) : "?";
  const firstName = profile?.fullName?.split(" ")[0] ?? "...";
  const greeting = getGreeting();

  return (
    <header className="sticky top-0 z-50 w-full glass border-b border-border/30">
      <div className="flex h-14 items-center justify-between px-4 md:px-8 w-full">
        <Link href="/settings" className="flex items-center gap-3 tap-highlight-transparent group">
          <Avatar className="h-9 w-9 ring-gradient">
            <AvatarFallback className="bg-mesh text-white font-bold text-sm">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col leading-none">
            <span className="text-[10px] text-muted-foreground font-medium">
              {greeting},
            </span>
            <span className="text-sm font-bold mt-1 font-outfit tracking-tight">
              <span className="text-gradient">{firstName}</span>
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full h-9 w-9 hover:bg-primary/10 transition-transform active:scale-90"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-amber-500" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-indigo-300" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="relative rounded-full h-9 w-9 hover:bg-primary/10"
          >
            <Bell className="h-4 w-4 text-muted-foreground" />
            <motion.span
              animate={{ scale: [1, 1.4, 1] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-destructive border-2 border-background shadow-sm"
            />
            <motion.span
              animate={{ scale: [1, 2.2], opacity: [0.6, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
              className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-destructive/60"
            />
          </Button>
        </div>
      </div>
    </header>
  );
}
