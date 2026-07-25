"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  CalendarDays,
  Search,
  RefreshCw,
  Loader2,
  Wifi,
  UserCheck,
  Filter,
  ChevronLeft,
  ChevronRight,
  CalendarSearch,
  BookOpen,
  Clock,
  Archive,
  ArchiveRestore,
  Trash2,
  AlertTriangle,
  ShieldAlert,
  Eye,
  EyeOff,
  CheckCircle2,
  Download,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatDatePHT } from "@/lib/utils";
import type { AdminAppointmentRow } from "@/actions/appointments";
import {
  archiveAppointment,
  restoreAppointment,
  permanentDeleteAppointment,
  bulkArchiveAppointments,
  bulkRestoreAppointments,
  bulkPermanentDeleteAppointments,
} from "@/actions/appointments";
import { exportAppointmentsToPDF } from "@/lib/exportPdf";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    CONFIRMED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    COMPLETED: "bg-blue-50 text-blue-700 border-blue-200",
    CANCELLED: "bg-red-50 text-red-700 border-red-200",
    NO_SHOW: "bg-amber-50 text-amber-700 border-amber-200",
  };
  const labels: Record<string, string> = {
    CONFIRMED: "Confirmed",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
    NO_SHOW: "No Show",
  };
  return (
    <Badge className={cn("text-xs font-semibold border", styles[status] ?? "bg-slate-50 text-slate-700 border-slate-200")}>
      {labels[status] ?? status}
    </Badge>
  );
}

function formatBookedAt(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-PH", {
      timeZone: "Asia/Manila",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(iso));
  } catch {
    return "—";
  }
}

// ─── Permanent Delete Dialog ──────────────────────────────────────────────────

interface DeleteDialogProps {
  targets: AdminAppointmentRow[] | null;
  onClose: () => void;
  onDeleted: () => void;
}

function PermanentDeleteDialog({ targets, onClose, onDeleted }: DeleteDialogProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!targets || targets.length === 0) {
      setPassword("");
      setError("");
      setShowPassword(false);
      setLoading(false);
    }
  }, [targets]);

  if (!targets || targets.length === 0) return null;

  const handleDelete = async () => {
    if (!password.trim()) {
      setError("Please enter your password.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = targets.length === 1
        ? await permanentDeleteAppointment(targets[0].id, password)
        : await bulkPermanentDeleteAppointments(targets.map(t => t.id), password);
        
      if (result.success) {
        onDeleted();
        onClose();
      } else {
        setError(result.error ?? "Failed to delete. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    // Backdrop
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
      >
        {/* Header */}
        <div className="flex items-start gap-4 p-6 border-b border-red-100 bg-red-50 rounded-t-2xl">
          <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h2 id="delete-dialog-title" className="text-lg font-bold text-red-800">Permanent Delete</h2>
            <p className="text-sm text-red-600 mt-0.5">
              This action <strong>cannot be undone</strong>. The record will be permanently deleted.
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Appointment info */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              {targets.length > 1 ? "Appointments to Delete" : "Appointment to Delete"}
            </p>
            {targets.length > 1 ? (
              <p className="font-semibold text-slate-800">{targets.length} appointments selected</p>
            ) : (
              <>
                <p className="font-semibold text-slate-800">{targets[0].patientName}</p>
                <p className="text-sm text-slate-500">{targets[0].service} · {formatDatePHT(targets[0].date, "MMM d, yyyy")} · {targets[0].time}</p>
              </>
            )}
          </div>

          {/* Warning */}
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-700 leading-relaxed">
              Once deleted, all associated consultation notes and notifications will also be removed.
            </p>
          </div>

          {/* Password field */}
          <div className="space-y-2">
            <label htmlFor="delete-password" className="block text-sm font-semibold text-slate-700">
              Enter your Admin Password to confirm:
            </label>
            <div className="relative">
              <input
                id="delete-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleDelete()}
                placeholder="••••••••"
                className={cn(
                  "w-full pr-10 pl-4 py-2.5 text-sm rounded-lg border bg-white focus:outline-none focus:ring-2 transition",
                  error
                    ? "border-red-400 focus:ring-red-300"
                    : "border-slate-200 focus:ring-red-300"
                )}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {error && (
              <p className="text-xs text-red-600 font-medium flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                {error}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 pb-6">
          <Button
            id="btn-cancel-delete"
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            id="btn-confirm-delete"
            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            onClick={handleDelete}
            disabled={loading || !password.trim()}
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" />Deleting…</>
            ) : (
              <><Trash2 className="w-4 h-4 mr-2" />Permanent Delete</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

type TabId = "ONLINE" | "WALK_IN" | "ARCHIVES";
type DateFilterType = "SCHEDULE" | "BOOKING";

const TABS: {
  id: TabId;
  label: string;
  icon: any;
  borderColor: string;
  textColor: string;
  badgeBg: string;
}[] = [
  {
    id: "ONLINE",
    label: "Online Appointments",
    icon: Wifi,
    borderColor: "border-indigo-600",
    textColor: "text-indigo-700",
    badgeBg: "bg-indigo-100 text-indigo-700",
  },
  {
    id: "WALK_IN",
    label: "Walk-in Appointments",
    icon: UserCheck,
    borderColor: "border-emerald-600",
    textColor: "text-emerald-700",
    badgeBg: "bg-emerald-100 text-emerald-700",
  },
  {
    id: "ARCHIVES",
    label: "Archives",
    icon: Archive,
    borderColor: "border-amber-500",
    textColor: "text-amber-700",
    badgeBg: "bg-amber-100 text-amber-700",
  },
];

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ tab, dateFilterType }: { tab: TabId; dateFilterType: DateFilterType }) {
  const isArchives = tab === "ARCHIVES";
  const msg = isArchives
    ? "No archived appointments found."
    : dateFilterType === "BOOKING"
    ? "No bookings found for the selected date."
    : `No ${tab === "ONLINE" ? "online" : "walk-in"} appointments found.`;

  return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
      {isArchives ? (
        <Archive className="w-14 h-14 mb-4 opacity-30" />
      ) : (
        <CalendarSearch className="w-14 h-14 mb-4 opacity-30" />
      )}
      <p className="text-lg font-semibold text-slate-500">{msg}</p>
      <p className="text-sm mt-1">
        {isArchives ? "Archive an appointment to see it here." : "Try adjusting your filters or selecting a different date."}
      </p>
    </div>
  );
}

// ─── Summary Cards ────────────────────────────────────────────────────────────

interface SummaryCardsProps {
  activeTab: TabId;
  dateFilterType: DateFilterType;
  dateFilter: string;
  onlineTotalCount: number;
  onlineHasMore: boolean;
  walkInTotalCount: number;
  walkInHasMore: boolean;
  archivesTotalCount: number;
  archivesHasMore: boolean;
}

function SummaryCards({
  activeTab,
  dateFilterType,
  dateFilter,
  onlineTotalCount,
  onlineHasMore,
  walkInTotalCount,
  walkInHasMore,
  archivesTotalCount,
  archivesHasMore,
}: SummaryCardsProps) {
  const isBookingMode = dateFilterType === "BOOKING" && activeTab !== "ARCHIVES";
  const dateLabel = dateFilter ? formatDatePHT(`${dateFilter}T00:00:00Z`, "MMMM d, yyyy") : null;

  const cards = [
    {
      label: isBookingMode ? (dateLabel ? `Online Bookings on ${dateLabel}` : "Online Bookings") : "Online Appointments",
      count: onlineTotalCount,
      hasMore: onlineHasMore,
      subtitle: isBookingMode ? "patients who booked online" : undefined,
      bg: isBookingMode ? "from-violet-50 border-violet-100" : "from-indigo-50 border-indigo-100",
      iconBg: isBookingMode ? "bg-violet-100" : "bg-indigo-100",
      countColor: isBookingMode ? "text-violet-700" : "text-indigo-700",
      labelColor: isBookingMode ? "text-violet-500" : "text-slate-500",
      icon: isBookingMode ? BookOpen : Wifi,
      iconColor: isBookingMode ? "text-violet-600" : "text-indigo-600",
    },
    {
      label: isBookingMode ? (dateLabel ? `Walk-ins Registered on ${dateLabel}` : "Walk-ins Registered") : "Walk-in Appointments",
      count: walkInTotalCount,
      hasMore: walkInHasMore,
      subtitle: isBookingMode ? "walk-ins registered by staff" : undefined,
      bg: isBookingMode ? "from-teal-50 border-teal-100" : "from-emerald-50 border-emerald-100",
      iconBg: isBookingMode ? "bg-teal-100" : "bg-emerald-100",
      countColor: isBookingMode ? "text-teal-700" : "text-emerald-700",
      labelColor: isBookingMode ? "text-teal-500" : "text-slate-500",
      icon: isBookingMode ? Clock : UserCheck,
      iconColor: isBookingMode ? "text-teal-600" : "text-emerald-600",
    },
    {
      label: "Archived Records",
      count: archivesTotalCount,
      hasMore: archivesHasMore,
      subtitle: "can be restored anytime",
      bg: "from-amber-50 border-amber-100",
      iconBg: "bg-amber-100",
      countColor: "text-amber-700",
      labelColor: "text-amber-500",
      icon: Archive,
      iconColor: "text-amber-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card
            key={card.label}
            className={cn("border shadow-sm transition-all duration-300 bg-gradient-to-br to-white", card.bg)}
          >
            <CardContent className="flex items-center gap-4 pt-5 pb-5">
              <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0", card.iconBg)}>
                <Icon className={cn("w-5 h-5", card.iconColor)} />
              </div>
              <div>
                <p className={cn("text-xs font-semibold uppercase tracking-wide", card.labelColor)}>
                  {card.label}
                </p>
                <p className={cn("text-2xl font-extrabold", card.countColor)}>
                  {card.count}
                  {card.hasMore && <span className="text-base font-medium ml-0.5">+</span>}
                </p>
                {card.subtitle && (
                  <p className="text-xs text-slate-400 mt-0.5">{card.subtitle}</p>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface AdminAppointmentsClientProps {
  initialOnline: { data: AdminAppointmentRow[]; totalPages: number; totalCount: number };
  initialWalkIn: { data: AdminAppointmentRow[]; totalPages: number; totalCount: number };
  initialArchives: { data: AdminAppointmentRow[]; totalPages: number; totalCount: number };
}

export function AdminAppointmentsClient({ initialOnline, initialWalkIn, initialArchives }: AdminAppointmentsClientProps) {
  const [activeTab, setActiveTab] = useState<TabId>("ONLINE");

  // Per-tab state
  const [onlineData, setOnlineData] = useState<AdminAppointmentRow[]>(initialOnline.data);
  const [onlineTotalPages, setOnlineTotalPages] = useState(initialOnline.totalPages);
  const [onlineTotalCount, setOnlineTotalCount] = useState(initialOnline.totalCount);
  const [onlinePage, setOnlinePage] = useState(1);

  const [walkInData, setWalkInData] = useState<AdminAppointmentRow[]>(initialWalkIn.data);
  const [walkInTotalPages, setWalkInTotalPages] = useState(initialWalkIn.totalPages);
  const [walkInTotalCount, setWalkInTotalCount] = useState(initialWalkIn.totalCount);
  const [walkInPage, setWalkInPage] = useState(1);

  const [archivesData, setArchivesData] = useState<AdminAppointmentRow[]>(initialArchives.data);
  const [archivesTotalPages, setArchivesTotalPages] = useState(initialArchives.totalPages);
  const [archivesTotalCount, setArchivesTotalCount] = useState(initialArchives.totalCount);
  const [archivesPage, setArchivesPage] = useState(1);

  // Filter state
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [dateFilterType, setDateFilterType] = useState<DateFilterType>("SCHEDULE");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(false);

  // Action state
  const [actionLoading, setActionLoading] = useState<string | null>(null); // appointment id being actioned
  const [deleteTarget, setDeleteTarget] = useState<AdminAppointmentRow[] | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Derived
  const currentPage =
    activeTab === "ONLINE" ? onlinePage : activeTab === "WALK_IN" ? walkInPage : archivesPage;
  const totalPages =
    activeTab === "ONLINE" ? onlineTotalPages : activeTab === "WALK_IN" ? walkInTotalPages : archivesTotalPages;
  const rows = activeTab === "ONLINE" ? onlineData : activeTab === "WALK_IN" ? walkInData : archivesData;
  const isArchivesTab = activeTab === "ARCHIVES";

  const setCurrentPage = (p: number) => {
    if (activeTab === "ONLINE") setOnlinePage(p);
    else if (activeTab === "WALK_IN") setWalkInPage(p);
    else setArchivesPage(p);
  };

  // Toast helper
  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchTab = useCallback(
    async (tab: TabId, page: number, bg = false) => {
      if (!bg) setLoading(true);
      try {
        const params = new URLSearchParams({ type: tab, page: String(page), dateFilterType });
        if (search.trim()) params.set("search", search.trim());
        if (dateFilter && tab !== "ARCHIVES") params.set("date", dateFilter);
        if (statusFilter !== "ALL" && tab !== "ARCHIVES") params.set("status", statusFilter);

        const res = await fetch(`/api/admin/appointments?${params.toString()}`);
        if (!res.ok) return;
        const json = await res.json();

        if (tab === "ONLINE") {
          setOnlineData(json.data); setOnlineTotalPages(json.totalPages); setOnlineTotalCount(json.totalCount ?? 0);
        } else if (tab === "WALK_IN") {
          setWalkInData(json.data); setWalkInTotalPages(json.totalPages); setWalkInTotalCount(json.totalCount ?? 0);
        } else {
          setArchivesData(json.data); setArchivesTotalPages(json.totalPages); setArchivesTotalCount(json.totalCount ?? 0);
        }
      } finally {
        if (!bg) setLoading(false);
      }
    },
    [search, dateFilter, dateFilterType, statusFilter]
  );

  // isMounted ref — prevents the page-change effect from firing on first render
  const isMounted = useRef(false);

  // Stable refreshAll — wrapped in useCallback so the auto-refresh interval
  // always has the latest page values and never captures a stale closure.
  const refreshAll = useCallback(
    (bg = false) => {
      fetchTab("ONLINE", onlinePage, bg);
      fetchTab("WALK_IN", walkInPage, bg);
      fetchTab("ARCHIVES", archivesPage, bg);
    },
    [fetchTab, onlinePage, walkInPage, archivesPage]
  );

  // Filter change → reset pages to 1 and refetch all three tabs
  useEffect(() => {
    setSelectedIds(new Set());
    setOnlinePage(1); setWalkInPage(1); setArchivesPage(1);
    fetchTab("ONLINE", 1);
    fetchTab("WALK_IN", 1);
    fetchTab("ARCHIVES", 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, dateFilter, dateFilterType, statusFilter]);

  // Page / tab change → only refetch the active tab.
  // Skip on first mount (isMounted guard) to avoid duplicating the
  // initial SSR data fetch that already happened on the server.
  useEffect(() => {
    setSelectedIds(new Set());
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }
    fetchTab(activeTab, currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlinePage, walkInPage, archivesPage, activeTab]);

  // Auto-refresh every 30s — refreshAll is stable so no stale closure risk
  useEffect(() => {
    const id = setInterval(() => refreshAll(true), 30_000);
    return () => clearInterval(id);
  }, [refreshAll]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleArchive = async (row: AdminAppointmentRow) => {
    setActionLoading(row.id);
    const result = await archiveAppointment(row.id);
    setActionLoading(null);
    if (result.success) {
      showToast(`"${row.patientName}" has been archived.`, "success");
      refreshAll();
    } else {
      showToast(result.error ?? "Failed to archive.", "error");
    }
  };

  const handleRestore = async (row: AdminAppointmentRow) => {
    setActionLoading(row.id);
    const result = await restoreAppointment(row.id);
    setActionLoading(null);
    if (result.success) {
      showToast(`"${row.patientName}" has been restored.`, "success");
      refreshAll();
    } else {
      showToast(result.error ?? "Failed to restore.", "error");
    }
  };

  const handleClear = () => {
    setSearch(""); setDateFilter(""); setStatusFilter("ALL"); setDateFilterType("SCHEDULE");
  };

  const hasActiveFilters = search || dateFilter || statusFilter !== "ALL" || dateFilterType !== "SCHEDULE";
  const isBookingMode = dateFilterType === "BOOKING";

  const handleBulkArchive = async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    setLoading(true);
    const result = await bulkArchiveAppointments(ids);
    setLoading(false);
    if (result.success) {
      showToast(`${ids.length} appointments archived.`, "success");
      setSelectedIds(new Set());
      refreshAll();
    } else {
      showToast(result.error ?? "Failed to archive.", "error");
    }
  };

  const handleBulkRestore = async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    setLoading(true);
    const result = await bulkRestoreAppointments(ids);
    setLoading(false);
    if (result.success) {
      showToast(`${ids.length} appointments restored.`, "success");
      setSelectedIds(new Set());
      refreshAll();
    } else {
      showToast(result.error ?? "Failed to restore.", "error");
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    const targets = rows.filter(r => selectedIds.has(r.id));
    setDeleteTarget(targets);
  };

  const toggleSelectAll = () => {
    if (rows.length === 0) return;
    const allVisibleSelected = rows.every(r => selectedIds.has(r.id));
    if (allVisibleSelected) {
      setSelectedIds(new Set());
    } else {
      const newSet = new Set(selectedIds);
      rows.forEach(r => newSet.add(r.id));
      setSelectedIds(newSet);
    }
  };

  const toggleRowSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const allVisibleSelected = rows.length > 0 && rows.every(r => selectedIds.has(r.id));

  return (
    <>
      {/* ── Permanent Delete Dialog ──────────────────────────────────────── */}
      <PermanentDeleteDialog
        targets={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDeleted={() => {
          showToast("Appointments have been permanently deleted.", "success");
          setSelectedIds(new Set());
          refreshAll();
        }}
      />

      {/* ── Toast Notification ───────────────────────────────────────────── */}
      {toast && (
        <div
          className={cn(
            "fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl text-sm font-semibold animate-in slide-in-from-bottom-4 duration-300",
            toast.type === "success"
              ? "bg-emerald-600 text-white"
              : "bg-red-600 text-white"
          )}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <AlertTriangle className="w-4 h-4" />
          )}
          {toast.message}
        </div>
      )}

      <div className="space-y-6 animate-in fade-in duration-500">
        {/* ── Page Header ─────────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 via-slate-700 to-slate-900 tracking-tight">
              Appointments
            </h1>
            <p className="text-slate-500 mt-1 font-medium">
              {isArchivesTab
                ? "Archived appointments. You can restore or permanently delete them."
                : isBookingMode
                ? "Tracking patients who booked on a specific date."
                : "View and monitor all online and walk-in appointments."}
            </p>
          </div>
          <div className="flex items-center gap-2 self-start md:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const tabName = activeTab === "ONLINE" ? "Online" : activeTab === "WALK_IN" ? "Walk-in" : "Archived";
                exportAppointmentsToPDF(rows, tabName);
                showToast("PDF exported successfully", "success");
              }}
              disabled={loading || rows.length === 0}
              className="flex items-center gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:text-indigo-800"
            >
              <Download className="w-4 h-4" />
              Export PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refreshAll()}
              disabled={loading}
              className="flex items-center gap-2"
              id="btn-refresh-appointments"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>

        {/* ── Summary Cards ───────────────────────────────────────────────── */}
        <SummaryCards
          activeTab={activeTab}
          dateFilterType={dateFilterType}
          dateFilter={dateFilter}
          onlineTotalCount={onlineTotalCount}
          onlineHasMore={onlineTotalPages > 1}
          walkInTotalCount={walkInTotalCount}
          walkInHasMore={walkInTotalPages > 1}
          archivesTotalCount={archivesTotalCount}
          archivesHasMore={archivesTotalPages > 1}
        />

        {/* ── Filters (hidden for Archives tab) ───────────────────────────── */}
        {!isArchivesTab && (
          <Card className="bg-white/70 backdrop-blur-sm border-slate-200/70 shadow-sm">
            <CardContent className="pt-4 pb-4">
              {/* Date filter mode toggle */}
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Filter date by:</span>
                <div className="flex rounded-lg overflow-hidden border border-slate-200 text-xs font-semibold">
                  <button
                    id="btn-filter-by-schedule"
                    onClick={() => setDateFilterType("SCHEDULE")}
                    className={cn(
                      "px-3 py-1.5 transition-colors flex items-center gap-1.5",
                      dateFilterType === "SCHEDULE" ? "bg-indigo-600 text-white" : "bg-white text-slate-500 hover:bg-slate-50"
                    )}
                  >
                    <CalendarDays className="w-3.5 h-3.5" />
                    Scheduled Date
                  </button>
                  <button
                    id="btn-filter-by-booking"
                    onClick={() => setDateFilterType("BOOKING")}
                    className={cn(
                      "px-3 py-1.5 transition-colors flex items-center gap-1.5 border-l border-slate-200",
                      dateFilterType === "BOOKING" ? "bg-violet-600 text-white" : "bg-white text-slate-500 hover:bg-slate-50"
                    )}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    Booking Date
                  </button>
                </div>
                {isBookingMode && (
                  <span className="text-xs text-violet-600 font-medium bg-violet-50 border border-violet-200 rounded-full px-2 py-0.5">
                    Showing who booked on selected date
                  </span>
                )}
              </div>

              {/* Filter row */}
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    id="input-search-appointments"
                    type="text"
                    placeholder="Search patient name…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 transition"
                  />
                </div>
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    id="input-date-filter"
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className={cn(
                      "pl-9 pr-3 py-2 text-sm rounded-lg border bg-white focus:outline-none transition w-full sm:w-auto",
                      isBookingMode ? "border-violet-200 focus:ring-2 focus:ring-violet-300" : "border-slate-200 focus:ring-2 focus:ring-indigo-300"
                    )}
                  />
                </div>
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <select
                    id="select-status-filter"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 transition appearance-none w-full sm:w-auto"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="CONFIRMED">Confirmed</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                    <option value="NO_SHOW">No Show</option>
                  </select>
                </div>
                {hasActiveFilters && (
                  <Button id="btn-clear-filters" variant="ghost" size="sm" onClick={handleClear} className="text-slate-500 hover:text-red-600 hover:bg-red-50 text-xs">
                    Clear All
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Tabs + Table ─────────────────────────────────────────────────── */}
        <Card className="bg-white/70 backdrop-blur-sm border-slate-200/70 shadow-sm overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-slate-200 bg-slate-50/60 px-4 pt-4 gap-2 overflow-x-auto no-scrollbar whitespace-nowrap">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const count =
                tab.id === "ONLINE" ? onlineTotalCount : tab.id === "WALK_IN" ? walkInTotalCount : archivesTotalCount;
              const hasMore =
                (tab.id === "ONLINE" ? onlineTotalPages : tab.id === "WALK_IN" ? walkInTotalPages : archivesTotalPages) > 1;
              return (
                <button
                  key={tab.id}
                  id={`tab-${tab.id.toLowerCase()}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-semibold transition-all duration-200 border-b-2",
                    isActive
                      ? `${tab.borderColor} ${tab.textColor} bg-white shadow-sm`
                      : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-white/60"
                  )}
                >
                  <Icon className={cn("w-4 h-4", isActive ? tab.textColor : "text-slate-400")} />
                  {tab.label}
                  <span className={cn("ml-1 px-2 py-0.5 rounded-full text-xs font-bold", isActive ? tab.badgeBg : "bg-slate-200 text-slate-500")}>
                    {count}{hasMore ? "+" : ""}
                  </span>
                </button>
              );
            })}
          </div>

          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-20 text-slate-400">
                <Loader2 className="w-7 h-7 animate-spin mr-3" />
                <span className="font-medium">Loading appointments…</span>
              </div>
            ) : rows.length === 0 ? (
              <EmptyState tab={activeTab} dateFilterType={dateFilterType} />
            ) : (
              <div className="overflow-x-auto">
                {/* ── Bulk Action Bar ────────────────────────────────────────────── */}
                {selectedIds.size > 0 && (
                  <div className="bg-indigo-50 border-b border-indigo-100 px-4 py-3 flex items-center justify-between animate-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-indigo-900 bg-indigo-200/50 px-2.5 py-1 rounded-md">
                        {selectedIds.size} selected
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isArchivesTab ? (
                        <>
                          <Button
                            size="sm"
                            onClick={handleBulkRestore}
                            disabled={loading}
                            className="bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 hover:border-emerald-300"
                          >
                            <ArchiveRestore className="w-4 h-4 mr-2" />
                            Restore Selected
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleBulkDelete}
                            disabled={loading}
                            className="bg-red-600 hover:bg-red-700 text-white shadow-sm"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Selected
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          onClick={handleBulkArchive}
                          disabled={loading}
                          className="bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300 shadow-sm"
                        >
                          <Archive className="w-4 h-4 mr-2" />
                          Archive Selected
                        </Button>
                      )}
                    </div>
                  </div>
                )}
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80 border-b border-slate-200">
                      <TableHead className="w-12 px-4 text-center">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          checked={allVisibleSelected}
                          onChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead className="font-semibold text-slate-600 px-3">Patient Name</TableHead>
                      <TableHead className="font-semibold text-slate-600 px-2">Service</TableHead>
                      <TableHead className="font-semibold text-slate-600 px-2 whitespace-nowrap">Scheduled Date</TableHead>
                      <TableHead className="font-semibold text-slate-600 px-2">Time</TableHead>
                      <TableHead className="font-semibold text-slate-600 px-2">Doctor</TableHead>
                      <TableHead className={cn("font-semibold px-2 whitespace-nowrap", isBookingMode ? "text-violet-600" : "text-slate-600")}>
                        {isBookingMode ? "📅 Booked On" : "Booked On"}
                      </TableHead>
                      <TableHead className="font-semibold text-slate-600 px-2">Status</TableHead>
                      <TableHead className="font-semibold text-slate-600 px-3 text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, i) => {
                      const isActioning = actionLoading === row.id;
                      return (
                        <TableRow
                          key={row.id}
                          className={cn(
                            "transition-colors hover:bg-slate-50/70",
                            i % 2 === 0 ? "bg-white" : "bg-slate-50/30",
                            isArchivesTab && "opacity-80"
                          )}
                        >
                          {/* Checkbox */}
                          <TableCell className="px-4 text-center">
                            <input
                              type="checkbox"
                              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                              checked={selectedIds.has(row.id)}
                              onChange={() => toggleRowSelect(row.id)}
                            />
                          </TableCell>

                          {/* Patient name */}
                          <TableCell className="font-medium text-slate-800 py-3 px-3">
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                                isArchivesTab ? "bg-amber-100 text-amber-700" :
                                activeTab === "ONLINE" ? "bg-indigo-100 text-indigo-700" : "bg-emerald-100 text-emerald-700"
                              )}>
                                {row.patientName.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-sm whitespace-nowrap">{row.patientName}</span>
                            </div>
                          </TableCell>

                          {/* Service */}
                          <TableCell className="text-sm text-slate-600 px-2">
                            <Badge variant="outline" className="text-[11px] font-medium text-slate-600 border-slate-200 px-1.5 py-0">
                              {row.service}
                            </Badge>
                          </TableCell>

                          {/* Scheduled date */}
                          <TableCell className="text-sm text-slate-600 whitespace-nowrap px-2">
                            <div className="flex items-center gap-1.5">
                              <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                              {formatDatePHT(row.date, "MMM d, yyyy")}
                            </div>
                          </TableCell>

                          {/* Time */}
                          <TableCell className="text-sm text-slate-600 whitespace-nowrap font-mono px-2">
                            {row.time}
                          </TableCell>

                          {/* Doctor */}
                          <TableCell className="text-sm text-slate-500 max-w-[120px] truncate px-2">
                            {row.doctor}
                          </TableCell>

                          {/* Booked On */}
                          <TableCell className="text-sm whitespace-nowrap px-2">
                            <div className={cn("flex items-center gap-1.5", isBookingMode ? "text-violet-700 font-medium" : "text-slate-500")}>
                              <Clock className={cn("w-3.5 h-3.5", isBookingMode ? "text-violet-400" : "text-slate-300")} />
                              {formatBookedAt(row.bookedAt)}
                            </div>
                          </TableCell>

                          {/* Status */}
                          <TableCell className="px-2">
                            <StatusBadge status={row.status} />
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="px-3">
                            <div className="flex items-center justify-center gap-1.5">
                              {isArchivesTab ? (
                                // Archives tab: Restore + Permanent Delete
                                <>
                                  <Button
                                    id={`btn-restore-${row.id}`}
                                    size="sm"
                                    variant="outline"
                                    disabled={isActioning}
                                    onClick={() => handleRestore(row)}
                                    className="h-7 px-2 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-400 gap-1"
                                  >
                                    {isActioning ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArchiveRestore className="w-3 h-3" />}
                                    Restore
                                  </Button>
                                  <Button
                                    id={`btn-delete-${row.id}`}
                                    size="sm"
                                    variant="outline"
                                    disabled={isActioning}
                                    onClick={() => setDeleteTarget([row])}
                                    className="h-7 px-2 text-xs text-red-700 border-red-200 hover:bg-red-50 hover:border-red-400 gap-1"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    Delete
                                  </Button>
                                </>
                              ) : (
                                // Online/Walk-in tabs: Archive + Permanent Delete
                                <>
                                  <Button
                                    id={`btn-archive-${row.id}`}
                                    size="sm"
                                    variant="outline"
                                    disabled={isActioning}
                                    onClick={() => handleArchive(row)}
                                    className="h-7 px-2 text-xs text-amber-700 border-amber-200 hover:bg-amber-50 hover:border-amber-400 gap-1"
                                  >
                                    {isActioning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Archive className="w-3 h-3" />}
                                    Archive
                                  </Button>
                                  <Button
                                    id={`btn-delete-${row.id}`}
                                    size="sm"
                                    variant="outline"
                                    disabled={isActioning}
                                    onClick={() => setDeleteTarget([row])}
                                    className="h-7 px-2 text-xs text-red-700 border-red-200 hover:bg-red-50 hover:border-red-400 gap-1"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    Delete
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && !loading && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50/60">
                <p className="text-sm text-slate-500">
                  Page <span className="font-semibold text-slate-700">{currentPage}</span> of{" "}
                  <span className="font-semibold text-slate-700">{totalPages}</span>
                </p>
                <div className="flex gap-2">
                  <Button
                    id="btn-prev-page"
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="flex items-center gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" /> Prev
                  </Button>
                  <Button
                    id="btn-next-page"
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-1"
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
