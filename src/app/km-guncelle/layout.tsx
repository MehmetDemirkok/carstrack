import type { Metadata } from "next";
import { noIndexRobots } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Km Güncelle",
  robots: noIndexRobots,
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
