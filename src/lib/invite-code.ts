import { randomBytes } from "crypto";

const INVITE_CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // 0/1/I/O/L karışıklığı olmasın
const INVITE_CODE_LENGTH = 8;

/**
 * Şirket davet kodu (kullanıcı tarafından elle girilir) — kısa, okunması kolay.
 * Math.random() yerine crypto.randomBytes kullanılır: bu kod, doğru tahmin
 * edildiğinde başka bir şirkete katılmayı sağlayan bir yetkilendirme sırrıdır.
 */
export function generateInviteCode(): string {
  const bytes = randomBytes(INVITE_CODE_LENGTH);
  let code = "";
  for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
    code += INVITE_CODE_ALPHABET[bytes[i] % INVITE_CODE_ALPHABET.length];
  }
  return code;
}

/** company_invites için tek kullanımlık, tahmin edilemez e-posta davet token'ı. */
export function generateInviteToken(): string {
  return randomBytes(24).toString("hex");
}
