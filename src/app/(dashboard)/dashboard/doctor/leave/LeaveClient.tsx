"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { CalendarOff, PlusCircle, ClockIcon, CheckCircle2, XCircle, AlertCircle, Loader2, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { fileLeaveRequest, cancelLeaveRequest, getPaginatedMyLeaveRequests, type LeaveRequest } from "@/actions/leave";
import { formatDatePHT } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";

// ─── Status Badge ──────────────────────────────────────────────────────────────
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

// ─── Main Client Component ────────────────────────────────────────────────────
export function LeaveClient({ 
  initialLeaves,
  initialTotalPages
}: { 
  initialLeaves: LeaveRequest[];
  initialTotalPages: number;
}) {
  const router = useRouter();
  const [leaves, setLeaves] = useState<LeaveRequest[]>(initialLeaves);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(initialTotalPages);

  const fetchLeaves = useCallback(async (page: number) => {
    try {
      const data = await getPaginatedMyLeaveRequests(page, 10);
      setLeaves(data.leaves);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error("Failed to fetch leaves", error);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchLeaves(currentPage);
    }, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, [fetchLeaves, currentPage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate || !reason.trim()) {
      toast.error("Please fill in all fields.");
      return;
    }
    setIsSubmitting(true);
    const toastId = toast.loading("Submitting leave request...");
    
    try {
      const result = await fileLeaveRequest({ startDate, endDate, reason });
      if (result.success) {
        toast.success("Leave request submitted successfully! The admin will review it shortly.", { id: toastId });
        setShowForm(false);
        setStartDate("");
        setEndDate("");
        setReason("");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to submit leave request.", { id: toastId });
      }
    } catch (error) {
      toast.error("An unexpected error occurred.", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async (id: string) => {
    setCancellingId(id);
    const toastId = toast.loading("Withdrawing leave request...");
    
    try {
      const result = await cancelLeaveRequest(id);
      if (result.success) {
        toast.success("Leave request cancelled.", { id: toastId });
        setLeaves((prev) => prev.filter((l) => l.id !== id));
      } else {
        toast.error(result.error || "Failed to cancel leave request.", { id: toastId });
      }
    } catch (error) {
      toast.error("An unexpected error occurred.", { id: toastId });
    } finally {
      setCancellingId(null);
    }
  };

  const pending = leaves.filter((l) => l.status === "PENDING");
  const resolved = leaves.filter((l) => l.status !== "PENDING");

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 tracking-tight">
            Leave Requests
          </h1>
          <p className="text-slate-500 mt-1">File and track your leave requests for admin approval.</p>
        </div>
        <Button
          onClick={() => setShowForm((p) => !p)}
          className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
          id="file-leave-btn"
        >
          <PlusCircle className="w-4 h-4" />
          {showForm ? "Close Form" : "File Leave Request"}
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
              <CalendarOff className="w-4 h-4 text-amber-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-800">New Leave Request</h2>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2.5 text-sm text-amber-800">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <span>Once approved, all your available slots in the selected date range will be automatically closed and any confirmed appointments will be notified.</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Start Date</label>
                <input
                  type="date"
                  id="leave-start-date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">End Date</label>
                <input
                  type="date"
                  id="leave-end-date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Reason for Leave</label>
              <textarea
                id="leave-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Medical conference in Manila, Family emergency, Personal medical leave..."
                rows={3}
                className="flex w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 resize-none"
                required
              />
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
                {isSubmitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                ) : (
                  "Submit Request"
                )}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Pending requests */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest">
          Pending Review ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-slate-400 text-sm">
            No pending leave requests.
          </div>
        ) : (
          pending.map((leave) => (
            <div
              key={leave.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <StatusBadge status={leave.status} />
                </div>
                <p className="font-semibold text-slate-800 mt-1">
                  {formatDatePHT(leave.startDate, "MMM d, yyyy")}
                  {leave.startDate !== leave.endDate && (
                    <> — {formatDatePHT(leave.endDate, "MMM d, yyyy")}</>
                  )}
                </p>
                <p className="text-sm text-slate-500 line-clamp-2">{leave.reason}</p>
                <p className="text-xs text-slate-400">
                  Filed on {formatDatePHT(leave.createdAt, "MMM d, yyyy")}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={cancellingId === leave.id}
                onClick={() => handleCancel(leave.id)}
                className="shrink-0 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 gap-1.5"
                id={`cancel-leave-${leave.id}`}
              >
                {cancellingId === leave.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                Withdraw
              </Button>
            </div>
          ))
        )}
      </section>

      {/* Resolved requests */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest">
          History ({resolved.length})
        </h2>
        {resolved.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-slate-400 text-sm">
            No resolved leave requests yet.
          </div>
        ) : (
          resolved.map((leave) => (
            <div
              key={leave.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4 shadow-sm opacity-80"
            >
              <div className="space-y-1">
                <StatusBadge status={leave.status} />
                <p className="font-semibold text-slate-800 mt-1">
                  {formatDatePHT(leave.startDate, "MMM d, yyyy")}
                  {leave.startDate !== leave.endDate && (
                    <> — {formatDatePHT(leave.endDate, "MMM d, yyyy")}</>
                  )}
                </p>
                <p className="text-sm text-slate-500">{leave.reason}</p>
                {leave.reviewNote && (
                  <p className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 mt-2">
                    <span className="font-medium text-slate-700">Admin note:</span> {leave.reviewNote}
                  </p>
                )}
                <p className="text-xs text-slate-400">
                  Reviewed on {leave.reviewedAt ? formatDatePHT(leave.reviewedAt, "MMM d, yyyy") : "—"}
                </p>
              </div>
            </div>
          ))
        )}
      </section>

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
                fetchLeaves(newPage);
              }}
              disabled={currentPage === 1}
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
                fetchLeaves(newPage);
              }}
              disabled={currentPage === totalPages}
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
