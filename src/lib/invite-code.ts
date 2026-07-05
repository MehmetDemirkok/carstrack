import { randomBytes } from "crypto";

/** Şirket davet kodu (kullanıcı tarafından elle girilir) — kısa, okunması kolay. */
export function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

/** company_invites için tek kullanımlık, tahmin edilemez e-posta davet token'ı. */
export function generateInviteToken(): string {
  return randomBytes(24).toString("hex");
}
