"use client";

import { useState } from "react";
import { UserCog, AlertTriangle, UserX } from "lucide-react";
import { toast } from "sonner";
import { setMemberActive, updateMemberProfile, updateMemberRole } from "@/lib/db";
import type { Profile, UserRole } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RolePicker } from "./role-picker";
import { isDowngrade, roleBadge } from "./team-utils";

export const inputCls =
  "w-full h-11 rounded-2xl border border-border bg-background/60 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

/**
 * Üye düzenleme penceresi. Her açılışta `key` ile yeniden oluşturulduğu için
 * form alanları doğrudan üyenin mevcut değerleriyle başlar.
 */
export function EditMemberDialog({
  member,
  isManager,
  currentUserId,
  managerCount,
  onClose,
  onSaved,
}: {
  member: Profile;
  isManager: boolean;
  currentUserId?: string;
  managerCount: number;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const [name, setName] = useState(member.fullName);
  const [dept, setDept] = useState(member.department ?? "");
  const [role, setRole] = useState<UserRole>(member.role);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDowngrade, setConfirmDowngrade] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const isSelf = member.id === currentUserId;
  const isLastManager = member.role === "manager" && managerCount === 1;
  const roleChanged = isManager && role !== member.role;
  const profileChanged = name.trim() !== member.fullName || dept.trim() !== (member.department ?? "");
  const needsConfirm = roleChanged && isDowngrade(member.role, role);
  const canRemove = isManager && !isSelf && !isLastManager;

  async function remove() {
    setSubmitting(true);
    try {
      await setMemberActive(member.id, false);
      toast.success(`${member.fullName} şirketten çıkarıldı`);
      await onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Üye şirketten çıkarılamadı");
    } finally {
      setSubmitting(false);
    }
  }

  function close() {
    if (!submitting) onClose();
  }

  async function save() {
    if (!name.trim()) { toast.error("İsim boş olamaz"); return; }
    if (!roleChanged && !profileChanged) { onClose(); return; }
    if (needsConfirm && !confirmDowngrade) { setConfirmDowngrade(true); return; }

    setSubmitting(true);
    // Rol önce değiştirilir: son yönetici koruması gibi veritabanı kuralları
    // en sık burada reddeder; reddedilirse ad/departman da yazılmamış olur.
    let roleSaved = false;
    try {
      if (roleChanged) {
        await updateMemberRole(member.id, role);
        roleSaved = true;
      }
      if (profileChanged) {
        await updateMemberProfile(member.id, { fullName: name.trim(), department: dept.trim() });
      }
      toast.success("Üye güncellendi");
      await onSaved();
      onClose();
    } catch {
      if (roleSaved) {
        toast.error("Rol değiştirildi ancak ad/departman kaydedilemedi");
        await onSaved();
      } else if (roleChanged) {
        toast.error("Rol değiştirilemedi, hiçbir değişiklik kaydedilmedi");
      } else {
        toast.error("Ad/departman kaydedilemedi");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) close(); }}>
      <DialogContent className="rounded-3xl p-6 gap-5 sm:max-w-md" showCloseButton={!submitting}>
        <DialogHeader className="flex-row items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl shrink-0">
            <UserCog className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <DialogTitle className="font-bold">Üye Düzenle</DialogTitle>
            <DialogDescription className="text-xs truncate">{member.fullName}</DialogDescription>
          </div>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(e) => { e.preventDefault(); void save(); }}
        >
          <div className="space-y-1.5">
            <label htmlFor="edit-name" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ad Soyad</label>
            <input id="edit-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ad Soyad" className={inputCls} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="edit-dept" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Departman / Ünvan</label>
            <input id="edit-dept" type="text" value={dept} onChange={(e) => setDept(e.target.value)} placeholder="Örn: Lojistik, Dağıtım, Kurye" className={inputCls} />
          </div>

          {/* Rol seçimi — sadece şirket yetkilisi değiştirebilir */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Rol</p>
            {isManager ? (
              <>
                <RolePicker
                  value={role}
                  onChange={(r) => { setRole(r); setConfirmDowngrade(false); }}
                  isDisabled={(r) => isSelf || (isLastManager && r !== "manager")}
                />
                {isSelf && (
                  <p className="text-[11px] text-muted-foreground">Kendi rolünüzü değiştiremezsiniz.</p>
                )}
                {!isSelf && isLastManager && (
                  <p className="text-[11px] text-muted-foreground">Şirketin tek yöneticisi — önce başka birini yönetici yapın.</p>
                )}
                {roleChanged && !needsConfirm && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400">
                    {role === "manager"
                      ? "Bu kullanıcı şirkette yetkili olarak tüm yetkilere sahip olacak."
                      : role === "operator"
                      ? "Bu kullanıcı operatör yetkisiyle filoya erişim sağlayacak."
                      : "Yalnızca ekip listesindeki etiket değişir; yetkiler aynı kalır."}
                  </p>
                )}
                {confirmDowngrade && (
                  <div className="flex gap-2 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3 text-[11px] text-amber-700 dark:text-amber-300">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>
                      {member.fullName} kullanıcısının yetkileri <b>{roleBadge(member.role).label}</b> seviyesinden
                      {" "}<b>{roleBadge(role).label}</b> seviyesine düşürülecek. Onaylamak için tekrar kaydedin.
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/40 text-sm text-muted-foreground">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${roleBadge(member.role).cls}`}>
                  {roleBadge(member.role).label}
                </span>
                <span className="text-xs">Rol değiştirme yetkisi sadece şirket yetkilisine aittir.</span>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={close} disabled={submitting}>İptal</Button>
            <Button type="submit" className="flex-1 rounded-xl bg-mesh hover:opacity-95 text-white border-none" disabled={submitting}>
              {submitting ? "Kaydediliyor..." : confirmDowngrade ? "Onayla ve Kaydet" : "Kaydet"}
            </Button>
          </div>
        </form>

        {/* Tehlikeli bölge — yalnızca yönetici, kendisi ve son yönetici hariç */}
        {canRemove && (
          <div className="border-t border-border/50 pt-4">
            {!confirmRemove ? (
              <button
                type="button"
                onClick={() => setConfirmRemove(true)}
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-1.5 h-10 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
              >
                <UserX className="h-4 w-4" /> Şirketten Çıkar
              </button>
            ) : (
              <div className="space-y-3 rounded-2xl border border-red-500/40 bg-red-500/10 p-3">
                <p className="text-[11px] text-red-700 dark:text-red-300 leading-relaxed">
                  <b>{member.fullName}</b> uygulamaya artık giriş yapamaz ve atanmış araçları kaldırılır.
                  Geçmiş görev, kayıt ve cezalardaki adı korunur. Bu işlemi daha sonra
                  &ldquo;Pasif Üyeler&rdquo; bölümünden geri alabilirsiniz.
                </p>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="flex-1 rounded-xl h-9 text-xs" onClick={() => setConfirmRemove(false)} disabled={submitting}>
                    Vazgeç
                  </Button>
                  <Button type="button" className="flex-1 rounded-xl h-9 text-xs bg-red-600 hover:bg-red-700 text-white border-none" onClick={remove} disabled={submitting}>
                    {submitting ? "Çıkarılıyor..." : "Evet, Çıkar"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
