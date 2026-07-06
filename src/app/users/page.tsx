"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, Car, Route, Pencil, UserCog, X, Plus, Mail, Send, Trash2, IdCard } from "lucide-react";
import { getOverallLicenseStatus, getMostUrgentEntry, daysUntilDate } from "@/lib/license";
import type { DriverLicenseEntry } from "@/lib/types";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import {
  getMembers,
  getDrivers,
  getVehicles,
  getTasks,
  assignVehicle,
  unassignVehicle,
  updateMemberProfile,
  updateMemberRole,
} from "@/lib/db";
import type { Vehicle, VehicleTask, Profile, UserRole } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// ─── Helpers ─────────────────────────────────────────────────

function formatDuration(start: string): string {
  const ms = new Date().getTime() - new Date(start).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins} dk`;
  const hours = Math.floor(mins / 60);
  return `${hours} sa ${mins % 60} dk`;
}

function getInitials(name: string): string {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

const AVATAR_COLORS = [
  "bg-blue-500", "bg-violet-500", "bg-emerald-500",
  "bg-orange-500", "bg-pink-500", "bg-teal-500",
  "bg-indigo-500", "bg-rose-500",
];
function avatarColor(name: string): string {
  const code = (name.charCodeAt(0) ?? 0) + (name.charCodeAt(1) ?? 0);
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

function roleBadge(role: UserRole) {
  if (role === "manager") return { label: "Şirket Yetkilisi", cls: "bg-primary/10 text-primary" };
  if (role === "operator") return { label: "Operatör", cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400" };
  return { label: "Kullanıcı", cls: "bg-muted text-muted-foreground" };
}

function licenseBadge(licenses?: DriverLicenseEntry[]) {
  const status = getOverallLicenseStatus(licenses);
  if (status === "missing") return { label: "Ehliyet bilgisi yok", cls: "bg-muted/50 text-muted-foreground" };

  const urgent = getMostUrgentEntry(licenses);
  if (status === "expired" && urgent) {
    return { label: `${urgent.class} süresi doldu (${new Date(urgent.expiryDate!).toLocaleDateString("tr-TR")})`, cls: "bg-red-500/10 text-red-600 dark:text-red-400" };
  }
  if (status === "expiring" && urgent) {
    return { label: `${urgent.class} ${daysUntilDate(urgent.expiryDate!)} gün sonra doluyor`, cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400" };
  }
  const classesLabel = (licenses ?? []).map((l) => l.class).join(", ");
  return { label: `Ehliyet geçerli (${classesLabel})`, cls: "bg-green-500/10 text-green-600 dark:text-green-400" };
}

type DriverWithAssignment = Profile & { assignedVehicleIds: string[] };

// ─── Page ────────────────────────────────────────────────────

export default function UsersPage() {
  const { profile, user } = useAuth();
  const router = useRouter();

  const [members, setMembers] = useState<Profile[]>([]);
  const [drivers, setDrivers] = useState<DriverWithAssignment[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [activeTasks, setActiveTasks] = useState<VehicleTask[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit dialog
  const [editMember, setEditMember] = useState<Profile | null>(null);
  const [editName, setEditName] = useState("");
  const [editDept, setEditDept] = useState("");
  const [editRole, setEditRole] = useState<UserRole>("user");
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Assign dialog
  const [assignDriverId, setAssignDriverId] = useState<string | null>(null);
  const [addVehicleId, setAddVehicleId] = useState("");
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  // Davet dialog + bekleyen davetler
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("user");
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<
    { id: string; email: string; role: UserRole; created_at: string; expires_at: string }[]
  >([]);

  async function loadInvites() {
    try {
      const res = await fetch("/api/invites");
      if (res.ok) {
        const data = await res.json();
        setPendingInvites(data.invites ?? []);
      }
    } catch {
      /* sessizce yoksay — davet listesi kritik değil */
    }
  }

  useEffect(() => {
    if (user && profile?.role === "manager") loadInvites();
  }, [user?.id, profile?.role]); // eslint-disable-line react-hooks/exhaustive-deps

  async function sendInvite(email: string, role: UserRole) {
    setInviteSubmitting(true);
    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Davet gönderilemedi"); return; }
      toast.success("Davet gönderildi");
      setInviteOpen(false);
      setInviteEmail("");
      setInviteRole("user");
      await loadInvites();
    } catch {
      toast.error("Davet gönderilemedi");
    } finally {
      setInviteSubmitting(false);
    }
  }

  async function revokeInvite(id: string) {
    try {
      const res = await fetch(`/api/invites/${id}`, { method: "DELETE" });
      if (!res.ok) { toast.error("Davet iptal edilemedi"); return; }
      toast.success("Davet iptal edildi");
      await loadInvites();
    } catch {
      toast.error("Davet iptal edilemedi");
    }
  }

  // Live timer
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [m, d, v, t] = await Promise.all([
        getMembers(),
        getDrivers(),
        getVehicles(),
        getTasks({ status: "active" }),
      ]);
      setMembers(m);
      setDrivers(d);
      setVehicles(v);
      setActiveTasks(t);
    } catch {
      toast.error("Veriler yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user) loadAll();
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sadece "user" rolündekiler /tasks'a yönlendirilir; manager ve operator erişebilir
  useEffect(() => {
    if (profile && profile.role === "user") router.replace("/tasks");
  }, [profile, router]);

  if (profile && profile.role === "user") return null;

  const isManager = profile?.role === "manager";

  // Lookup maps
  const assignmentMap = new Map(drivers.map((d) => [d.id, d.assignedVehicleIds]));
  const activeTaskMap = new Map(activeTasks.map((t) => [t.driverId, t]));

  const userCount = members.filter((m) => m.role === "user").length;
  const activeCount = activeTasks.length;
  const managerCount = members.filter((m) => m.role === "manager").length;

  // ── Edit handlers ──────────────────────────────────────────

  function openEdit(member: Profile) {
    setEditMember(member);
    setEditName(member.fullName);
    setEditDept(member.department ?? "");
    setEditRole(member.role);
  }

  async function saveEdit() {
    if (!editMember) return;
    if (!editName.trim()) { toast.error("İsim boş olamaz"); return; }
    setEditSubmitting(true);
    try {
      await updateMemberProfile(editMember.id, { fullName: editName.trim(), department: editDept.trim() });
      if (isManager && editRole !== editMember.role) {
        await updateMemberRole(editMember.id, editRole);
      }
      setEditMember(null);
      toast.success("Profil güncellendi");
      await loadAll();
    } catch {
      toast.error("Güncelleme başarısız");
    } finally {
      setEditSubmitting(false);
    }
  }

  // ── Assign handlers ────────────────────────────────────────

  function openAssign(driverId: string) {
    setAssignDriverId(driverId);
    setAddVehicleId("");
  }

  async function handleAddVehicle() {
    if (!assignDriverId || !addVehicleId) return;
    setAssignSubmitting(true);
    try {
      await assignVehicle(addVehicleId, assignDriverId);
      setAddVehicleId("");
      toast.success("Araç eklendi");
      await loadAll();
    } catch {
      toast.error("Araç eklenemedi");
    } finally {
      setAssignSubmitting(false);
    }
  }

  async function handleRemoveVehicle(vehicleId: string) {
    if (!assignDriverId) return;
    setAssignSubmitting(true);
    try {
      await unassignVehicle(vehicleId, assignDriverId);
      toast.success("Araç kaldırıldı");
      await loadAll();
    } catch {
      toast.error("Araç kaldırılamadı");
    } finally {
      setAssignSubmitting(false);
    }
  }

  const inputCls =
    "w-full h-12 rounded-2xl border border-border bg-background/60 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

  const ROLE_OPTIONS: { value: UserRole; label: string; activeClass: string }[] = [
    { value: "user",     label: "Kullanıcı",       activeClass: "bg-muted border-primary text-primary" },
    { value: "operator", label: "Operatör",         activeClass: "bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400" },
    { value: "manager",  label: "Şirket Yetkilisi", activeClass: "bg-primary/10 border-primary text-primary" },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 pb-32 space-y-6">

      {/* ── Başlık ── */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="bg-mesh p-2.5 rounded-2xl shadow-lg shadow-primary/30 shrink-0">
            <Users className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold">Ekip Takibi</h1>
            <p className="text-sm text-muted-foreground">Üyeleri görüntüle, düzenle ve araç ata</p>
          </div>
        </div>
        {isManager && (
          <Button
            onClick={() => setInviteOpen(true)}
            className="rounded-xl bg-mesh hover:opacity-95 text-white border-none shrink-0 gap-1.5"
          >
            <Mail className="h-4 w-4" /> Davet Et
          </Button>
        )}
      </motion.div>

      {/* ── Bekleyen Davetler ── */}
      {isManager && pendingInvites.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-3xl p-4 border border-border/40 space-y-3"
        >
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Bekleyen Davetler ({pendingInvites.length})
          </p>
          <div className="space-y-2">
            {pendingInvites.map((invite) => (
              <div key={invite.id} className="flex items-center justify-between gap-2 bg-muted/40 rounded-2xl px-4 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{invite.email}</p>
                  <p className="text-xs text-muted-foreground">{roleBadge(invite.role).label}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => sendInvite(invite.email, invite.role)}
                    disabled={inviteSubmitting}
                    title="Yeniden Gönder"
                    className="p-2 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => revokeInvite(invite.id)}
                    title="İptal Et"
                    className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── İstatistikler ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-3 gap-3"
      >
        {[
          { label: "Toplam Üye", value: members.length, Icon: Users, accent: false },
          { label: "Aktif Seyahat", value: activeCount, Icon: Route, accent: activeCount > 0 },
          { label: "Kullanıcı", value: userCount, Icon: Car, accent: false },
        ].map(({ label, value, Icon, accent }) => (
          <div
            key={label}
            className={`glass rounded-2xl p-4 border ${accent ? "border-green-500/30" : "border-border/30"}`}
          >
            <Icon className={`h-4 w-4 mb-2 ${accent ? "text-green-500" : "text-muted-foreground"}`} />
            <p className="text-xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </motion.div>

      {/* ── Üye Listesi ── */}
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-3xl bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : members.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Henüz üye yok</p>
          <p className="text-sm mt-1">Ayarlar sayfasındaki davet koduyla ekip üyesi ekleyebilirsiniz</p>
        </div>
      ) : (
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}
          className="space-y-3"
        >
          {members.map((member) => {
            const isUser = member.role === "user";
            const assignedIds = assignmentMap.get(member.id) ?? [];
            const assignedVehicles = assignedIds
              .map((id) => vehicles.find((v) => v.id === id))
              .filter((v): v is Vehicle => !!v);
            const activeTask = activeTaskMap.get(member.id) ?? null;
            const taskVehicle = activeTask ? vehicles.find((v) => v.id === activeTask.vehicleId) : null;
            const badge = roleBadge(member.role);

            return (
              <motion.div
                key={member.id}
                variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } }}
                className="glass rounded-3xl p-4 border border-border/40"
              >
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className={`h-12 w-12 rounded-2xl ${avatarColor(member.fullName)} flex items-center justify-center shrink-0 shadow-md`}>
                    <span className="text-white font-bold text-sm">{getInitials(member.fullName)}</span>
                  </div>

                  {/* Bilgiler */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-base leading-none">{member.fullName}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </div>

                    {member.department && (
                      <p className="text-xs text-muted-foreground mt-0.5">{member.department}</p>
                    )}

                    {isUser && (() => {
                      const badge = licenseBadge(member.licenses);
                      return (
                        <span className={`mt-1.5 inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium ${badge.cls}`}>
                          <IdCard className="h-3 w-3 shrink-0" /> {badge.label}
                        </span>
                      );
                    })()}

                    {isUser && (
                      <div className="mt-2 space-y-1">
                        {/* Aktif seyahat rozeti */}
                        {activeTask && (
                          <div className="inline-flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 font-medium bg-green-500/10 px-2.5 py-1 rounded-full">
                            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse shrink-0" />
                            Aktif •{" "}
                            {taskVehicle
                              ? `${taskVehicle.brand} ${taskVehicle.model} (${taskVehicle.plate})`
                              : (activeTask.vehiclePlate ?? "Araç")}
                            {" • "}{formatDuration(activeTask.startTime)}
                          </div>
                        )}

                        {/* Atanmış araçlar */}
                        {!activeTask && assignedVehicles.length === 0 && (
                          <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full">
                            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                            Müsait •{" "}
                            <span className="text-amber-500 dark:text-amber-400 font-medium">Araç atanmamış</span>
                          </div>
                        )}

                        {!activeTask && assignedVehicles.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {assignedVehicles.map((v) => (
                              <span key={v.id} className="inline-flex items-center gap-1 text-xs bg-muted/50 text-muted-foreground px-2.5 py-1 rounded-full">
                                <Car className="h-3 w-3 shrink-0" />
                                {v.plate}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Aksiyon butonları */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isUser && (
                      <button
                        onClick={() => openAssign(member.id)}
                        title="Araç Yönet"
                        className="p-2 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                      >
                        <Car className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => openEdit(member)}
                      title="Düzenle"
                      className="p-2 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* ── Düzenle Dialog ── */}
      {editMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !editSubmitting && setEditMember(null)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative bg-card rounded-3xl border border-border/50 shadow-2xl w-full max-w-sm p-6 space-y-5"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <UserCog className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-bold text-base">Üye Düzenle</h2>
                <p className="text-xs text-muted-foreground">{editMember.fullName}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ad Soyad</label>
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Ad Soyad" className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Departman / Ünvan</label>
                <input type="text" value={editDept} onChange={(e) => setEditDept(e.target.value)} placeholder="Örn: Lojistik, Dağıtım, Kurye" className={inputCls} />
              </div>

              {/* Rol seçimi — sadece şirket yetkilisi değiştirebilir */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Rol</label>
                {isManager ? (
                  <>
                    <div className="flex gap-2">
                      {ROLE_OPTIONS.map(({ value, label, activeClass }) => {
                        const isLastManager = editMember.role === "manager" && managerCount === 1;
                        const disabled = editMember.id === user?.id || (isLastManager && value !== "manager");
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setEditRole(value)}
                            disabled={disabled}
                            className={`flex-1 h-10 rounded-xl text-[11px] font-semibold border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                              editRole === value
                                ? activeClass
                                : "bg-background border-border text-muted-foreground hover:border-primary/40"
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                    {editRole !== editMember.role && (
                      <p className="text-[11px] text-amber-500 dark:text-amber-400">
                        {editRole === "manager"
                          ? "Bu kullanıcı şirkette yetkili olarak tüm yetkilere sahip olacak."
                          : editRole === "operator"
                          ? "Bu kullanıcı operatör yetkisiyle filoya erişim sağlayacak."
                          : "Bu kullanıcının yönetici yetkileri kaldırılacak."}
                      </p>
                    )}
                    {editMember.id === user?.id && (
                      <p className="text-[11px] text-muted-foreground">Kendi rolünüzü değiştiremezsiniz.</p>
                    )}
                    {editMember.id !== user?.id && editMember.role === "manager" && managerCount === 1 && (
                      <p className="text-[11px] text-muted-foreground">Şirketin tek yöneticisi — önce başka birini yönetici yapın.</p>
                    )}
                  </>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/40 text-sm text-muted-foreground">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${roleBadge(editMember.role).cls}`}>
                      {roleBadge(editMember.role).label}
                    </span>
                    <span className="text-xs">Rol değiştirme yetkisi sadece şirket yetkilisine aittir.</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setEditMember(null)} disabled={editSubmitting}>İptal</Button>
              <Button className="flex-1 rounded-xl bg-mesh hover:opacity-95 text-white border-none" onClick={saveEdit} disabled={editSubmitting}>
                {editSubmitting ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── Araç Yönet Dialog ── */}
      {assignDriverId && (() => {
        const driver = members.find((m) => m.id === assignDriverId);
        const currentIds = assignmentMap.get(assignDriverId) ?? [];
        const currentVehicles = currentIds.map((id) => vehicles.find((v) => v.id === id)).filter((v): v is Vehicle => !!v);
        const availableVehicles = vehicles.filter((v) => !currentIds.includes(v.id));

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !assignSubmitting && setAssignDriverId(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="relative bg-card rounded-3xl border border-border/50 shadow-2xl w-full max-w-sm p-6 space-y-5"
            >
              {/* Başlık */}
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <Car className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-bold text-base">Araç Yönet</h2>
                  <p className="text-xs text-muted-foreground">{driver?.fullName}</p>
                </div>
              </div>

              {/* Mevcut araçlar */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Atanmış Araçlar{currentVehicles.length > 0 && ` (${currentVehicles.length})`}
                </p>
                {currentVehicles.length === 0 ? (
                  <p className="text-sm text-muted-foreground bg-muted/30 rounded-2xl px-4 py-3">
                    Henüz araç atanmamış
                  </p>
                ) : (
                  <div className="space-y-2">
                    {currentVehicles.map((v) => (
                      <div key={v.id} className="flex items-center justify-between bg-muted/40 rounded-2xl px-4 py-2.5">
                        <div>
                          <p className="text-sm font-semibold">{v.plate}</p>
                          <p className="text-xs text-muted-foreground">{v.brand} {v.model}</p>
                        </div>
                        <button
                          onClick={() => handleRemoveVehicle(v.id)}
                          disabled={assignSubmitting}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Araç ekle */}
              {availableVehicles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Araç Ekle</p>
                  <div className="flex gap-2">
                    <select
                      value={addVehicleId}
                      onChange={(e) => setAddVehicleId(e.target.value)}
                      className="flex-1 h-11 rounded-2xl border border-border bg-background/60 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="">Araç seçin...</option>
                      {availableVehicles.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.plate} — {v.brand} {v.model}
                        </option>
                      ))}
                    </select>
                    <Button
                      onClick={handleAddVehicle}
                      disabled={!addVehicleId || assignSubmitting}
                      className="h-11 px-4 rounded-2xl bg-mesh hover:opacity-95 text-white border-none shrink-0"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {availableVehicles.length === 0 && currentVehicles.length > 0 && (
                <p className="text-xs text-muted-foreground text-center bg-muted/30 rounded-2xl px-4 py-3">
                  Tüm araçlar bu kullanıcıya atanmış
                </p>
              )}

              <Button
                variant="outline"
                className="w-full rounded-xl"
                onClick={() => setAssignDriverId(null)}
                disabled={assignSubmitting}
              >
                Kapat
              </Button>
            </motion.div>
          </div>
        );
      })()}

      {/* ── Davet Et Dialog ── */}
      {inviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !inviteSubmitting && setInviteOpen(false)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative bg-card rounded-3xl border border-border/50 shadow-2xl w-full max-w-sm p-6 space-y-5"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-bold text-base">Ekibe Davet Et</h2>
                <p className="text-xs text-muted-foreground">E-posta ile davet gönder</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">E-posta</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="calisan@sirket.com"
                  className={inputCls}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Rol</label>
                <div className="flex gap-2">
                  {ROLE_OPTIONS.map(({ value, label, activeClass }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setInviteRole(value)}
                      className={`flex-1 h-10 rounded-xl text-[11px] font-semibold border transition-colors ${
                        inviteRole === value ? activeClass : "bg-background border-border text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setInviteOpen(false)} disabled={inviteSubmitting}>İptal</Button>
              <Button
                className="flex-1 rounded-xl bg-mesh hover:opacity-95 text-white border-none"
                onClick={() => sendInvite(inviteEmail.trim(), inviteRole)}
                disabled={inviteSubmitting || !inviteEmail.trim()}
              >
                {inviteSubmitting ? "Gönderiliyor..." : "Davet Gönder"}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
