"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Users, Car, Route, Mail, IdCard, SearchX } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";
import { getMembers, getDrivers, getVehicles, getTasks } from "@/lib/db";
import type { Vehicle, VehicleTask, Profile, UserRole } from "@/lib/types";
import { isDriverRole } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { HelpPanel } from "./_components/help-panel";
import { PendingInvites } from "./_components/pending-invites";
import { TeamFilters } from "./_components/team-filters";
import { MemberCard } from "./_components/member-card";
import { EditMemberDialog } from "./_components/edit-member-dialog";
import { AssignVehiclesDialog } from "./_components/assign-vehicles-dialog";
import { InviteDialog } from "./_components/invite-dialog";
import { InactiveMembers } from "./_components/inactive-members";
import {
  buildMemberViews,
  hasLicenseIssue,
  isUnassignedDriver,
  matchesFilter,
  matchesSearch,
  sortDrivers,
  sortManagement,
  type DriverWithAssignment,
  type InviteResult,
  type MemberView,
  type PendingInvite,
  type TeamFilter,
} from "./_components/team-utils";

export default function UsersPage() {
  const { profile, user } = useAuth();
  const router = useRouter();

  const [members, setMembers] = useState<Profile[]>([]);
  const [drivers, setDrivers] = useState<DriverWithAssignment[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [activeTasks, setActiveTasks] = useState<VehicleTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);

  const [editMember, setEditMember] = useState<Profile | null>(null);
  const [assignDriver, setAssignDriver] = useState<Profile | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [filter, setFilter] = useState<TeamFilter>("all");

  const isDriver = !!profile && isDriverRole(profile.role);
  const isManager = profile?.role === "manager";

  // ── Veri yükleme ───────────────────────────────────────────

  const loadAll = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
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
  }, []);

  // İşlem sonrası yenilemeler listeyi iskelete döndürmeden sessizce yapılır.
  const refresh = useCallback(() => loadAll({ silent: true }), [loadAll]);

  const loadInvites = useCallback(async () => {
    try {
      const res = await fetch("/api/invites");
      if (res.ok) {
        const data = await res.json();
        setPendingInvites(data.invites ?? []);
      }
    } catch {
      /* sessizce yoksay — davet listesi kritik değil */
    }
  }, []);

  useEffect(() => {
    // Sürücü rolü zaten /tasks'a yönlendirilecek; gereksiz sorgu atma.
    if (!user || isDriver) return;
    loadAll();
  }, [user?.id, isDriver]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (user && isManager) loadInvites();
  }, [user?.id, isManager]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sadece sürücü rolündekiler ("user"/"sofor") /tasks'a yönlendirilir; manager ve operator erişebilir
  useEffect(() => {
    if (isDriver) router.replace("/tasks");
  }, [isDriver, router]);

  // Panelden "Davet gönder" ile gelindiğinde dialog doğrudan açılsın.
  useEffect(() => {
    if (!isManager) return;
    if (new URLSearchParams(window.location.search).get("invite") !== "1") return;
    setInviteOpen(true);
    router.replace("/users", { scroll: false });
  }, [isManager, router]);

  // ── Davetler ───────────────────────────────────────────────

  async function sendInvite(email: string, role: UserRole): Promise<InviteResult> {
    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; resent?: boolean };
      if (!res.ok) {
        const error = data.error || "Davet gönderilemedi";
        toast.error("Davet gönderilemedi", { description: error });
        return { ok: false, error };
      }
      toast.success(data.resent ? "Davet yeniden gönderildi" : "Davet gönderildi", {
        description: data.resent ? "Bağlantı yenilendi, 7 gün daha geçerli." : undefined,
      });
      await loadInvites();
      return { ok: true };
    } catch {
      toast.error("Davet gönderilemedi");
      return { ok: false, error: "Bağlantı hatası, lütfen tekrar deneyin." };
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

  // ── Liste: görünüm, sayımlar, filtre ───────────────────────

  // Pasif (şirketten çıkarılmış) üyeler ana listede, sayımlarda ve yönetici
  // hesabında yer almaz; ayrı "Pasif Üyeler" bölümünde gösterilir.
  const activeMembers = useMemo(() => members.filter((m) => !m.deactivatedAt), [members]);
  const inactiveMembers = useMemo(() => members.filter((m) => !!m.deactivatedAt), [members]);

  const views = useMemo(
    () => buildMemberViews(activeMembers, drivers, vehicles, activeTasks),
    [activeMembers, drivers, vehicles, activeTasks],
  );

  const counts = useMemo<Record<TeamFilter, number>>(() => ({
    all: views.length,
    management: views.filter((v) => !v.isDriver).length,
    drivers: views.filter((v) => v.isDriver).length,
    active: views.filter((v) => !!v.activeTask).length,
    unassigned: views.filter(isUnassignedDriver).length,
    license: views.filter(hasLicenseIssue).length,
  }), [views]);

  const { management, driverViews } = useMemo(() => {
    const visible = views.filter((v) => matchesFilter(v, filter) && matchesSearch(v, deferredQuery));
    return {
      management: visible.filter((v) => !v.isDriver).sort(sortManagement),
      driverViews: visible.filter((v) => v.isDriver).sort(sortDrivers),
    };
  }, [views, filter, deferredQuery]);

  const managerCount = useMemo(() => activeMembers.filter((m) => m.role === "manager").length, [activeMembers]);
  const visibleCount = management.length + driverViews.length;

  if (isDriver) return null;

  function toggleFilter(f: TeamFilter) {
    setFilter((cur) => (cur === f ? "all" : f));
  }

  const stats: { filter: TeamFilter; label: string; value: number; Icon: React.ElementType; tone: "neutral" | "green" | "amber" | "red" }[] = [
    { filter: "all", label: "Toplam Üye", value: counts.all, Icon: Users, tone: "neutral" },
    { filter: "active", label: "Aktif Seyahat", value: counts.active, Icon: Route, tone: counts.active > 0 ? "green" : "neutral" },
    { filter: "unassigned", label: "Araçsız Sürücü", value: counts.unassigned, Icon: Car, tone: counts.unassigned > 0 ? "amber" : "neutral" },
    { filter: "license", label: "Ehliyet Uyarısı", value: counts.license, Icon: IdCard, tone: counts.license > 0 ? "red" : "neutral" },
  ];

  const TONE: Record<string, { border: string; icon: string }> = {
    neutral: { border: "border-border/30", icon: "text-muted-foreground" },
    green: { border: "border-green-500/30", icon: "text-green-500" },
    amber: { border: "border-amber-500/30", icon: "text-amber-500" },
    red: { border: "border-red-500/30", icon: "text-red-500" },
  };

  function renderGroup(title: string, items: MemberView[], showTitle: boolean) {
    if (items.length === 0) return null;
    return (
      <section className="space-y-3" aria-label={title}>
        {showTitle && (
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
            {title} ({items.length})
          </h2>
        )}
        <ul className="space-y-3">
          {items.map((view) => (
            <MemberCard
              key={view.member.id}
              view={view}
              onEdit={() => setEditMember(view.member)}
              onAssign={() => setAssignDriver(view.member)}
            />
          ))}
        </ul>
      </section>
    );
  }

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

      <HelpPanel />

      {isManager && (
        <PendingInvites invites={pendingInvites} onResend={sendInvite} onRevoke={revokeInvite} />
      )}

      {/* ── İstatistikler (tıklanınca filtreler) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map(({ filter: f, label, value, Icon, tone }) => {
          const selected = filter === f && f !== "all";
          return (
            <button
              key={label}
              type="button"
              onClick={() => toggleFilter(f)}
              aria-pressed={selected}
              className={cn(
                "glass rounded-2xl p-4 border text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 hover:border-primary/40",
                TONE[tone].border,
                selected && "ring-2 ring-primary/50",
              )}
            >
              <Icon className={cn("h-4 w-4 mb-2", TONE[tone].icon)} />
              <p className="text-xl font-bold tabular-nums">{loading ? "–" : value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </button>
          );
        })}
      </div>

      {/* ── Arama + filtre ── */}
      {!loading && activeMembers.length > 0 && (
        <TeamFilters
          query={query}
          onQueryChange={setQuery}
          filter={filter}
          onFilterChange={setFilter}
          counts={counts}
        />
      )}

      {/* ── Üye Listesi ── */}
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-3xl bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : activeMembers.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Henüz üye yok</p>
          {isManager && (
            <Button variant="outline" className="mt-4 rounded-xl gap-1.5" onClick={() => setInviteOpen(true)}>
              <Mail className="h-4 w-4" /> İlk ekip üyesini davet et
            </Button>
          )}
        </div>
      ) : visibleCount === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <SearchX className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Bu aramaya uyan üye yok</p>
          <Button
            variant="outline"
            className="mt-4 rounded-xl"
            onClick={() => { setQuery(""); setFilter("all"); }}
          >
            Filtreleri temizle
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {renderGroup("Yönetim", management, driverViews.length > 0)}
          {renderGroup("Sürücüler", driverViews, management.length > 0)}
        </div>
      )}

      {!loading && (
        <InactiveMembers members={inactiveMembers} canReactivate={isManager} onChanged={refresh} />
      )}

      {/* ── Pencereler ── */}
      {editMember && (
        <EditMemberDialog
          key={editMember.id}
          member={editMember}
          isManager={isManager}
          currentUserId={user?.id}
          managerCount={managerCount}
          onClose={() => setEditMember(null)}
          onSaved={refresh}
        />
      )}

      {assignDriver && (
        <AssignVehiclesDialog
          key={assignDriver.id}
          driver={assignDriver}
          drivers={drivers}
          vehicles={vehicles}
          onClose={() => setAssignDriver(null)}
          onChanged={refresh}
        />
      )}

      {isManager && (
        <InviteDialog
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          onSend={sendInvite}
          pendingEmails={pendingInvites.map((i) => i.email)}
        />
      )}
    </div>
  );
}
