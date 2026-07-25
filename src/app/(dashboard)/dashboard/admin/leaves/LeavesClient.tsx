"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  ClockIcon,
  CalendarOff,
  Loader2,
  User,
  MessageSquare,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Filter,
  Calendar as CalendarIcon,
  X,
} from "lucide-react";
import { approveLeaveRequest, rejectLeaveRequest, getPaginatedLeaveRequests, getLeaveRequestsCounts, type LeaveRequest } from "@/actions/leave";
import { getAllDoctorsList } from "@/actions/users";
import { formatDatePHT } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  if (status === "APPROVED") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="w-3.5 h-3.5" /> Approved
      </span>
    );
  }
  if (status === "REJECTED") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-600 border border-red-200">
        <XCircle className="w-3.5 h-3.5" /> Rejected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
      <ClockIcon className="w-3.5 h-3.5" /> Pending Review
    </span>
  );
}

// ─── Leave Card ───────────────────────────────────────────────────────────────
function LeaveCard({
  leave,
  onApprove,
  onReject,
  processingId,
}: {
  leave: LeaveRequest;
  onApprove: (id: string, note: string) => void;
  onReject: (id: string, note: string) => void;
  processingId: string | null;
}) {
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);
  const isPending = leave.status === "PENDING";
  const isProcessing = processingId === leave.id;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200">
      {/* Top row */}
      <div className="flex flex-col sm:flex-row justify-between gap-3 mb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={leave.status} />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-slate-500" />
            </div>
            <div>
              <p className="font-semibold text-slate-800">{leave.doctorName}</p>
              <p className="text-xs text-slate-500">Filed on {formatDatePHT(leave.createdAt, "MMM d, yyyy")}</p>
            </div>
          </div>
        </div>

        <div className="text-right shrink-0">
          <p className="text-sm font-semibold text-slate-700">
            {formatDatePHT(leave.startDate, "MMM d, yyyy")}
          </p>
          {leave.startDate !== leave.endDate && (
            <p className="text-sm text-slate-500">
              to {formatDatePHT(leave.endDate, "MMM d, yyyy")}
            </p>
          )}
        </div>
      </div>

      {/* Reason */}
      <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 mb-4">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Reason</p>
        <p className="text-sm text-slate-700">{leave.reason}</p>
      </div>

      {/* Reviewed note (for resolved) */}
      {!isPending && leave.reviewNote && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-4">
          <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-1">Admin Note</p>
          <p className="text-sm text-blue-700">{leave.reviewNote}</p>
        </div>
      )}

      {/* Admin actions */}
      {isPending && (
        <div className="space-y-3">
          {/* Warning */}
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
            <span>
              Approving will automatically block all clinic slots for the leave period and cancel any confirmed appointments. Affected patients will be notified instantly.
            </span>
          </div>

          {/* Optional note toggle */}
          <button
            type="button"
            onClick={() => setShowNote((p) => !p)}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            {showNote ? "Hide note" : "Add optional note to doctor"}
          </button>

          {showNote && (
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional note for the doctor (visible in their leave history)..."
              rows={2}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 resize-none"
            />
          )}

          {/* Action buttons */}
          <div className="flex gap-2 flex-wrap">
            <Button
              id={`approve-leave-${leave.id}`}
              size="sm"
              disabled={isProcessing}
              onClick={() => onApprove(leave.id, note)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 flex-1"
            >
              {isProcessing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              Approve Leave
            </Button>
            <Button
              id={`reject-leave-${leave.id}`}
              size="sm"
              variant="outline"
              disabled={isProcessing}
              onClick={() => onReject(leave.id, note)}
              className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 gap-1.5 flex-1"
            >
              {isProcessing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <XCircle className="w-3.5 h-3.5" />
              )}
              Reject
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Client Component ────────────────────────────────────────────────────
export function LeavesClient({ 
  initialLeaves,
  initialTotalPages,
  initialCounts
}: { 
  initialLeaves: LeaveRequest[];
  initialTotalPages: number;
  initialCounts: { pending: number; resolved: number };
}) {
  const router = useRouter();
  const [leaves, setLeaves] = useState<LeaveRequest[]>(initialLeaves);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"pending" | "resolved">("pending");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [counts, setCounts] = useState(initialCounts);
  const [isLoading, setIsLoading] = useState(false);
  const [doctors, setDoctors] = useState<{ id: string; name: string }[]>([]);
  
  // Filters
  const [dateFilter, setDateFilter] = useState<string>("");
  const [doctorIdFilter, setDoctorIdFilter] = useState<string>("ALL");

  useEffect(() => {
    getAllDoctorsList().then(setDoctors).catch(console.error);
  }, []);

  const fetchLeaves = useCallback(async (
    tab: "pending" | "resolved", 
    page: number, 
    hideLoading = false,
    dFilter = dateFilter,
    docFilter = doctorIdFilter
  ) => {
    try {
      if (!hideLoading) setIsLoading(true);
      const actualDocFilter = docFilter === "ALL" ? undefined : docFilter;
      const actualDateFilter = dFilter || undefined;

      const [data, newCounts] = await Promise.all([
        getPaginatedLeaveRequests(tab, page, 10, actualDateFilter, actualDocFilter),
        getLeaveRequestsCounts(actualDateFilter, actualDocFilter)
      ]);
      setLeaves(data.leaves);
      setTotalPages(data.totalPages);
      setCounts(newCounts);
    } catch (error) {
      console.error("Failed to fetch leaves", error);
    } finally {
      if (!hideLoading) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchLeaves(activeTab, currentPage, true);
    }, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, [fetchLeaves, activeTab, currentPage, dateFilter, doctorIdFilter]);

  const handleTabChange = (tab: "pending" | "resolved") => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setCurrentPage(1);
    fetchLeaves(tab, 1);
  };

  const handleApplyFilters = (newDate: string, newDocId: string) => {
    setDateFilter(newDate);
    setDoctorIdFilter(newDocId);
    setCurrentPage(1);
    fetchLeaves(activeTab, 1, false, newDate, newDocId);
  };

  const setDateFilterQuick = (daysOffset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const newDate = `${yyyy}-${mm}-${dd}`;
    handleApplyFilters(newDate, doctorIdFilter);
  };

  const clearFilters = () => {
    handleApplyFilters("", "ALL");
  };

  const handleApprove = async (id: string, note: string) => {
    setProcessingId(id);
    const result = await approveLeaveRequest(id, note);
    setProcessingId(null);

    if (result.success) {
      const msg =
        result.affectedAppointments && result.affectedAppointments > 0
          ? `✅ Leave approved. ${result.affectedAppointments} appointment(s) automatically cancelled and patients notified.`
          : "✅ Leave approved. Slots blocked. No existing appointments were affected.";
      toast.success(msg, { duration: 6000 });
      fetchLeaves(activeTab, currentPage);
      router.refresh();
    } else {
      toast.error(result.error || "Failed to approve leave request.");
    }
  };

  const handleReject = async (id: string, note: string) => {
    setProcessingId(id);
    const result = await rejectLeaveRequest(id, note);
    setProcessingId(null);

    if (result.success) {
      toast.success("Leave request rejected.");
      fetchLeaves(activeTab, currentPage);
      router.refresh();
    } else {
      toast.error(result.error || "Failed to reject leave request.");
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 tracking-tight">
            Leave Requests
          </h1>
          <p className="text-slate-500 mt-1">
            Review and approve doctor leave requests. Approved leaves automatically block slots and notify patients.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {counts.pending > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
              <ClockIcon className="w-3.5 h-3.5" /> {counts.pending} Pending
            </span>
          )}
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col lg:flex-row gap-4 lg:items-end">
        
        {/* Quick Date Filters */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</label>
          <div className="flex flex-wrap items-center gap-2">
            <input 
              type="date"
              value={dateFilter}
              onChange={(e) => handleApplyFilters(e.target.value, doctorIdFilter)}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-colors"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDateFilterQuick(0)}
              className={`h-10 px-3 ${dateFilter === new Date().toISOString().split('T')[0] ? 'bg-slate-100 border-slate-300 text-slate-900' : 'text-slate-600'}`}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDateFilterQuick(1)}
              className="h-10 px-3 text-slate-600"
            >
              Tomorrow
            </Button>
          </div>
        </div>

        {/* Doctor Filter */}
        <div className="space-y-1.5 lg:w-64">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Doctor</label>
          <select
            value={doctorIdFilter}
            onChange={(e) => handleApplyFilters(dateFilter, e.target.value)}
            className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-colors"
          >
            <option value="ALL">All Doctors</option>
            {doctors.map(doc => (
              <option key={doc.id} value={doc.id}>Dr. {doc.name}</option>
            ))}
          </select>
        </div>

        {/* Clear Filters */}
        {(dateFilter || doctorIdFilter !== "ALL") && (
          <Button
            variant="ghost"
            onClick={clearFilters}
            className="h-10 text-slate-500 hover:text-slate-800"
          >
            <X className="w-4 h-4 mr-1.5" />
            Clear Filters
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => handleTabChange("pending")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "pending"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Pending{" "}
          {counts.pending > 0 && (
            <span className="ml-1.5 bg-amber-500 text-white text-xs rounded-full px-1.5 py-0.5">
              {counts.pending}
            </span>
          )}
        </button>
        <button
          onClick={() => handleTabChange("resolved")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "resolved"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Resolved ({counts.resolved})
        </button>
      </div>

      {/* Content */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          </div>
        ) : leaves.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
            {activeTab === "pending" ? (
              <>
                <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <CalendarOff className="w-7 h-7 text-emerald-500" />
                </div>
                <h3 className="text-lg font-semibold text-slate-700">All Clear!</h3>
                <p className="text-slate-500 text-sm mt-1">No pending leave requests at this time.</p>
              </>
            ) : (
              <p className="text-slate-400 text-sm">No resolved leave requests yet.</p>
            )}
          </div>
        ) : (
          leaves.map((leave) => (
            <LeaveCard
              key={leave.id}
              leave={leave}
              onApprove={handleApprove}
              onReject={handleReject}
              processingId={processingId}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-6 border-t border-slate-100">
          <p className="text-sm text-slate-500">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newPage = Math.max(1, currentPage - 1);
                setCurrentPage(newPage);
                fetchLeaves(activeTab, newPage);
              }}
              disabled={currentPage === 1 || isLoading}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newPage = Math.min(totalPages, currentPage + 1);
                setCurrentPage(newPage);
                fetchLeaves(activeTab, newPage);
              }}
              disabled={currentPage === totalPages || isLoading}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
