"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, Clock, CheckCircle, Stethoscope, FileText, Activity, CalendarDays } from "lucide-react";
import { toggleAvailability, getDoctorQueue, getDoctorSummaryCards, markAsServing, markAsNoShow } from "@/actions/doctor";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatDatePHT } from "@/lib/utils";
import { UserX } from "lucide-react";

type Summary = {
  totalPatients: number;
  waiting: number;
  completed: number;
  noShow: number;
};

type QueueItem = {
  id: string;
  patientName: string;
  age: number | null;
  initials: string;
  service: string;
  time: string;
  type: string;
  status: string;
  scheduleDate: string;
};

export function DoctorConsoleClient({
  doctorId,
  doctorName,
  assignedServiceName,
  isAvailable: initialAvailability,
  initialSummary,
  initialTodayQueue,
  initialUpcomingQueue,
}: {
  doctorId: string;
  doctorName: string;
  assignedServiceName?: string;
  isAvailable: boolean;
  initialSummary: Summary;
  initialTodayQueue: QueueItem[];
  initialUpcomingQueue: QueueItem[];
}) {
  const router = useRouter();
  const [isAvailable, setIsAvailable] = useState(initialAvailability);
  const [summary, setSummary] = useState<Summary>(initialSummary);
  const [todayQueue, setTodayQueue] = useState<QueueItem[]>(initialTodayQueue);
  const [upcomingQueue, setUpcomingQueue] = useState<QueueItem[]>(initialUpcomingQueue);
  const [quickActionModal, setQuickActionModal] = useState<"lab" | "prescript" | "medcert" | null>(null);
  const [noShowAppt, setNoShowAppt] = useState<QueueItem | null>(null);
  const [isMarkingNoShow, setIsMarkingNoShow] = useState(false);

  const fetchQueue = useCallback(async () => {
    try {
      const [newSummary, newQueue] = await Promise.all([
        getDoctorSummaryCards(doctorId),
        getDoctorQueue(doctorId),
      ]);
      const safeSummary: Summary = { ...newSummary as any, noShow: (newSummary as any).noShow ?? 0 };
      setSummary(safeSummary);
      setTodayQueue(newQueue.today);
      setUpcomingQueue(newQueue.upcoming);
    } catch (e) {
      console.error(e);
    }
  }, [doctorId]);

  // Poll every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchQueue, 30000);
    return () => clearInterval(interval);
  }, [fetchQueue]);

  const handleToggleAvailability = async () => {
    const newStatus = !isAvailable;
    setIsAvailable(newStatus);
    const result = await toggleAvailability(doctorId, newStatus);
    if (!result.success) {
      setIsAvailable(!newStatus);
      toast.error("Failed to update availability");
    } else {
      toast.success(`You are now ${newStatus ? "Available" : "Unavailable"}`);
    }
  };

  const handleOpenFile = async (appointmentId: string) => {
    const result = await markAsServing(appointmentId, doctorId);
    if (result.success) {
      router.push(`/dashboard/doctor/consultation/${appointmentId}`);
    } else {
      toast.error("Failed to open file");
    }
  };

  const handleMarkNoShow = async () => {
    if (!noShowAppt) return;
    setIsMarkingNoShow(true);
    try {
      const result = await markAsNoShow(noShowAppt.id);
      if (result.success) {
        toast.success("Patient marked as No Show");
        await fetchQueue();
      } else {
        toast.error(result.error ?? "Failed to mark as No Show");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsMarkingNoShow(false);
      setNoShowAppt(null);
    }
  };

  // Sort completed and no show to the bottom within today's queue
  const sortedTodayQueue = [...todayQueue].sort((a, b) => {
    const aIsDone = a.status === "COMPLETED" || a.status === "NO_SHOW";
    const bIsDone = b.status === "COMPLETED" || b.status === "NO_SHOW";
    if (aIsDone && !bIsDone) return 1;
    if (!aIsDone && bIsDone) return -1;
    return 0;
  });

  const allActivePatients = [...todayQueue, ...upcomingQueue].filter(
    q => q.status !== "COMPLETED" && q.status !== "NO_SHOW"
  );

  const renderPatientCard = (patient: QueueItem, showDate = false) => {
    const isCompleted = patient.status === "COMPLETED";
    const isNoShow = patient.status === "NO_SHOW";
    const isDone = isCompleted || isNoShow;

    return (
      <div
        key={patient.id}
        className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border transition-all ${
          isDone
            ? "bg-slate-50 border-slate-100 opacity-75"
            : "bg-white border-slate-200 hover:border-green-300 shadow-sm hover:shadow-md"
        }`}
      >
        <div className="flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
              isCompleted 
                ? "bg-slate-200 text-slate-500" 
                : isNoShow
                ? "bg-red-100 text-red-600"
                : "bg-green-100 text-green-700"
            }`}
          >
            {patient.initials}
          </div>
          <div>
            <h4 className="font-bold text-slate-900">
              {patient.patientName}{" "}
              <span className="text-sm font-normal text-slate-500">
                ({patient.age !== null ? `${patient.age} yrs` : "N/A"})
              </span>
            </h4>
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 mt-1">
              <span className="flex items-center gap-1.5">
                <Stethoscope className="w-4 h-4 text-slate-400" /> {patient.service}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-400" /> {patient.time}
              </span>
              {showDate && (
                <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
                  <CalendarDays className="w-4 h-4 text-emerald-500" />
                  {formatDatePHT(patient.scheduleDate, "MMM d, yyyy")}
                </span>
              )}
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                  patient.type === "ONLINE"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {patient.type.replace("_", "-")}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 sm:mt-0 flex items-center gap-3 w-full sm:w-auto flex-wrap sm:flex-nowrap">
          {isCompleted ? (
            <div className="bg-slate-200 text-slate-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide text-center">
              Completed
            </div>
          ) : isNoShow ? (
            <div className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide text-center border border-red-200">
              No Show
            </div>
          ) : (
            <>
              <div className="bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wide text-center hidden sm:block">
                Waiting
              </div>
              <button
                onClick={() => setNoShowAppt(patient)}
                className="px-3 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 flex-1 sm:flex-none bg-white border-2 border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
              >
                No Show
              </button>
            </>
          )}

          {!isNoShow && (
            <button
              onClick={() => handleOpenFile(patient.id)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 flex-1 sm:flex-none ${
                isCompleted
                  ? "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  : "bg-green-600 hover:bg-green-700 text-white shadow-sm"
              }`}
            >
              <FileText className="w-4 h-4" />
              {isCompleted ? "View File" : "Open File"}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 tracking-tight">
            Doctor's Console
          </h1>
          <p className="text-slate-500 mt-1">
            {doctorName} • {assignedServiceName || "Unassigned"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleToggleAvailability}
            className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all flex items-center gap-2 ${
              isAvailable
                ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${isAvailable ? "bg-emerald-500" : "bg-red-500"}`} />
            {isAvailable ? "Available" : "Unavailable"}
          </button>

          <div className="bg-slate-100 text-slate-700 px-4 py-2 rounded-full text-sm font-medium border border-slate-200">
            {summary.waiting} Waiting Today
          </div>
        </div>
      </div>

      {/* SUMMARY CARDS — Today only */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs md:text-sm font-medium text-slate-500">Total Patients</div>
            <div className="text-2xl md:text-3xl font-bold text-slate-900">{summary.totalPatients}</div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs md:text-sm font-medium text-slate-500">Waiting</div>
            <div className="text-2xl md:text-3xl font-bold text-slate-900">{summary.waiting}</div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center shrink-0">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs md:text-sm font-medium text-slate-500">Completed</div>
            <div className="text-2xl md:text-3xl font-bold text-slate-900">{summary.completed}</div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center shrink-0">
            <UserX className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs md:text-sm font-medium text-slate-500">No Show</div>
            <div className="text-2xl md:text-3xl font-bold text-slate-900">{summary.noShow}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        {/* MAIN QUEUE AREA */}
        <div className="xl:col-span-3 space-y-6">

          {/* SECTION 1: TODAY'S QUEUE */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50/50 p-4 flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-slate-800">Today's Queue</h3>
                <p className="text-xs text-slate-500 mt-0.5">Patients scheduled for today</p>
              </div>
              <span className="text-xs font-bold bg-green-100 text-green-700 px-3 py-1 rounded-full">
                {sortedTodayQueue.length} patient{sortedTodayQueue.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="p-4 space-y-3">
              {sortedTodayQueue.length === 0 ? (
                <div className="text-center py-12 text-slate-500 border-2 border-dashed border-slate-200 rounded-lg">
                  <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="font-medium">No patients in queue for today.</p>
                  <p className="text-sm mt-1">Check Upcoming for future appointments.</p>
                </div>
              ) : (
                sortedTodayQueue.map((patient) => renderPatientCard(patient, false))
              )}
            </div>
          </div>

          {/* SECTION 2: UPCOMING APPOINTMENTS */}
          {upcomingQueue.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 bg-blue-50/50 p-4 flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-slate-800">Upcoming Appointments</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Future confirmed appointments</p>
                </div>
                <span className="text-xs font-bold bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                  {upcomingQueue.length} upcoming
                </span>
              </div>

              <div className="p-4 space-y-3">
                {upcomingQueue.map((patient) => renderPatientCard(patient, true))}
              </div>
            </div>
          )}
        </div>

        {/* QUICK ACTIONS */}
        <div className="xl:col-span-1 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50/50 p-4">
              <h3 className="font-semibold text-slate-800">Quick Actions</h3>
            </div>
            <div className="p-4 flex flex-col gap-3">
              <button
                onClick={() => toast.info("Lab Test Requests — Coming Soon")}
                className="w-full bg-white border border-slate-200 hover:border-green-500 hover:bg-green-50 text-slate-700 font-medium py-3 px-4 rounded-lg text-sm transition-all flex items-center gap-3 text-left"
              >
                <Activity className="w-5 h-5 text-green-600" />
                Request Lab Test
                <span className="ml-auto text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">Soon</span>
              </button>
              <button
                onClick={() => toast.info("E-Prescription — Coming Soon")}
                className="w-full bg-white border border-slate-200 hover:border-green-500 hover:bg-green-50 text-slate-700 font-medium py-3 px-4 rounded-lg text-sm transition-all flex items-center gap-3 text-left"
              >
                <FileText className="w-5 h-5 text-green-600" />
                E-Prescription
                <span className="ml-auto text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">Soon</span>
              </button>
              <button
                onClick={() => toast.info("Medical Certificate — Coming Soon")}
                className="w-full bg-white border border-slate-200 hover:border-green-500 hover:bg-green-50 text-slate-700 font-medium py-3 px-4 rounded-lg text-sm transition-all flex items-center gap-3 text-left"
              >
                <FileText className="w-5 h-5 text-green-600" />
                Medical Certificate
                <span className="ml-auto text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">Soon</span>
              </button>
            </div>
          </div>

          {/* Upcoming count mini-card */}
          {upcomingQueue.length > 0 && (
            <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
              <div className="flex items-center gap-3">
                <CalendarDays className="w-6 h-6 text-blue-600 shrink-0" />
                <div>
                  <div className="text-sm font-semibold text-blue-900">
                    {upcomingQueue.length} upcoming appointment{upcomingQueue.length !== 1 ? "s" : ""}
                  </div>
                  <div className="text-xs text-blue-600 mt-0.5">
                    Next: {formatDatePHT(upcomingQueue[0].scheduleDate, "MMM d")} at {upcomingQueue[0].time}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* QUICK ACTION MODALS */}
      {/* Quick Action modals removed — features are Coming Soon */}

      {/* ── No Show Confirmation Modal ─────────────────────────────────────── */}
      <Dialog open={!!noShowAppt} onOpenChange={(open) => !open && !isMarkingNoShow && setNoShowAppt(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">Mark as No Show?</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mb-4">
              <p className="font-semibold text-slate-800 text-sm">Patient: {noShowAppt?.patientName}</p>
              <p className="text-slate-600 text-sm mt-1">Service: {noShowAppt?.service}</p>
              <p className="text-slate-600 text-sm mt-1">
                Schedule: {noShowAppt ? formatDatePHT(noShowAppt.scheduleDate, "MMM d, yyyy") : ""} at {noShowAppt?.time}
              </p>
            </div>
            <p className="text-sm text-slate-600">
              This patient will be notified and the slot will remain closed. This cannot be undone.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <button
              onClick={() => setNoShowAppt(null)}
              disabled={isMarkingNoShow}
              className="px-4 py-2 rounded-lg text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleMarkNoShow}
              disabled={isMarkingNoShow}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 hover:bg-red-700 text-white flex items-center justify-center gap-2"
            >
              {isMarkingNoShow ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Marking...
                </>
              ) : (
                "No Show"
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
