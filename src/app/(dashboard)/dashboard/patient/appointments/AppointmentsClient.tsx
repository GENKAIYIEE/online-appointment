"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import Link from "next/link";
import { format, isBefore, startOfDay, isSunday, isSaturday } from "date-fns";
import { formatDatePHT, getTodayPHT } from "@/lib/utils";
import { toast } from "sonner";
import {
  CalendarDays,
  Clock,
  Stethoscope,
  AlertCircle,
  CalendarPlus,
  X,
  Calendar as CalendarIcon,
  ClipboardList,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import {
  cancelAppointment,
  rescheduleAppointment,
  getAvailableSlotsForReschedule,
  deleteCancelledAppointment,
} from "@/actions/appointments";

// ─── Types ──────────────────────────────────────────────────────────────────
type Appointment = {
  id: string;
  status: string;
  service: string | null;
  doctor_name: string | null;
  time_slot: string | null;
  room: string | null;
  notes: string | null;
  consultationDiagnosis: string | null;
  consultationNotes: string | null;
  followUpDate: string | null;
  created_at: string;
  bookedAt?: string | null;
  schedule: {
    id: string;
    date: string;
  };
  subProfile?: {
    id: string;
    firstName: string;
    lastName: string;
    relationship: string;
  } | null;
};

type Tab = "all" | "upcoming" | "completed";

const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "upcoming", label: "Upcoming" },
  { id: "completed", label: "Completed" },
];

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status, isPast }: { status: string; isPast?: boolean }) {
  if (status === "CONFIRMED") {
    if (isPast) {
      return null;
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]">
        <Clock className="w-3 h-3" />
        Arrive 15 mins early
      </span>
    );
  }

  const map: Record<string, string> = {
    COMPLETED: "bg-slate-100 text-slate-600",
    CANCELLED: "bg-red-100 text-red-700",
    NO_SHOW: "bg-red-100 text-red-700",
  };
  const label: Record<string, string> = {
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
    NO_SHOW: "No Show",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap",
        map[status] ?? "bg-slate-100 text-slate-600"
      )}
    >
      {label[status] ?? status}
    </span>
  );
}

// ─── Appointment Card ─────────────────────────────────────────────────────────
function AppointmentCard({
  appointment,
  onReschedule,
  onCancel,
  onViewNotes,
  onRemove,
}: {
  appointment: Appointment;
  onReschedule: () => void;
  onCancel: () => void;
  onViewNotes: () => void;
  onRemove: () => void;
}) {
  const todayPHT = getTodayPHT();
  const rawDate = new Date(appointment.schedule.date);
  const isPast = rawDate.getTime() < todayPHT.getTime();

  return (
    <Card className={cn(
      "border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 group",
      isPast && "opacity-60 grayscale-[0.2]"
    )}>
      <CardContent className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          {/* Left: Icon + Info */}
          <div className="flex gap-4 flex-1 min-w-0">
            <div className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-emerald-100 transition-colors">
              <Stethoscope className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <h3 className="font-semibold text-slate-900 truncate">
                {appointment.service ?? "General Consultation"}
              </h3>
              <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-1.5">
                <Stethoscope className="w-3 h-3 shrink-0" />
                <span className="truncate">
                  {appointment.doctor_name ?? "Assigned Doctor"}
                </span>
              </p>
              {/* Patient indicator — who this appointment is for */}
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                <span className="text-slate-300">👤</span>
                {appointment.subProfile
                  ? <span className="text-emerald-700 font-medium">{appointment.subProfile.firstName} {appointment.subProfile.lastName} <span className="text-slate-400 font-normal">({appointment.subProfile.relationship})</span></span>
                  : <span className="text-slate-500">Myself</span>
                }
              </p>
              <div className="flex flex-col gap-1.5 mt-3 text-sm text-slate-600">
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  Booked On: {formatDatePHT(appointment.bookedAt ?? appointment.created_at, "MMMM d, yyyy")}
                </span>
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  Schedule: {formatDatePHT(appointment.schedule.date, "MMMM d, yyyy")}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  Time: {appointment.time_slot ?? "TBD"}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Badge + Actions */}
          <div className="flex sm:flex-col items-center sm:items-end gap-3 shrink-0">
            <StatusBadge status={appointment.status} isPast={isPast} />
            {appointment.status === "CONFIRMED" && isPast && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                Past
              </span>
            )}
            {appointment.status === "CONFIRMED" && !isPast && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onReschedule}
                  id={`reschedule-btn-${appointment.id}`}
                  className="text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 text-xs h-8 px-3"
                >
                  Reschedule
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onCancel}
                  id={`cancel-btn-${appointment.id}`}
                  className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300 text-xs h-8 px-3"
                >
                  Cancel
                </Button>
              </div>
            )}
            {appointment.status === "COMPLETED" && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onViewNotes}
                  className="text-slate-700 border-slate-200 hover:bg-slate-50 text-xs h-8 px-3"
                >
                  <ClipboardList className="w-3.5 h-3.5 mr-1.5" /> View Consultation Notes
                </Button>
              </div>
            )}
            {(appointment.status === "CANCELLED" || appointment.status === "NO_SHOW") && (
              <div className="flex gap-2 mt-1 sm:mt-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onRemove}
                  className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300 text-xs h-8 px-3"
                >
                  Remove
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Client Component ─────────────────────────────────────────────────────
export default function AppointmentsClient({
  appointments,
  dbError,
}: {
  appointments: Appointment[];
  dbError: boolean;
}) {
  const [localAppointments, setLocalAppointments] = useState(appointments);
  const router = useRouter();

  useEffect(() => {
    setLocalAppointments(appointments);
  }, [appointments]);

  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 10000);
    return () => clearInterval(interval);
  }, [router]);

  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Reschedule modal
  const [rescheduleAppt, setRescheduleAppt] = useState<Appointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<Date | undefined>(undefined);
  const [rescheduleTimeSlot, setRescheduleTimeSlot] = useState("");
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isFetchingSlots, setIsFetchingSlots] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);

  // Cancel modal
  const [cancelAppt, setCancelAppt] = useState<Appointment | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // Remove modal
  const [removeAppt, setRemoveAppt] = useState<Appointment | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  // Notes modal
  const [notesAppt, setNotesAppt] = useState<Appointment | null>(null);

  // Fetch available slots when reschedule date changes
  useEffect(() => {
    if (!rescheduleDate || !rescheduleAppt) return;

    let cancelled = false;
    const fetchSlots = async () => {
      setIsFetchingSlots(true);
      setRescheduleTimeSlot("");
      try {
        const slots = await getAvailableSlotsForReschedule(
          format(rescheduleDate, "yyyy-MM-dd"),
          rescheduleAppt.id
        );
        if (!cancelled) setAvailableSlots(slots);
      } catch {
        if (!cancelled) toast.error("Failed to load available time slots.");
        if (!cancelled) setAvailableSlots([]);
      } finally {
        if (!cancelled) setIsFetchingSlots(false);
      }
    };

    fetchSlots();
    return () => { cancelled = true; };
  }, [rescheduleDate, rescheduleAppt]);

  // Use Manila "today" for filtering upcoming appointments
  const todayPHT = getTodayPHT();
  const filtered = localAppointments.filter((appt) => {
    // Compare in Manila time
    const rawDate = new Date(appt.schedule.date);
    
    const todayMs = todayPHT.getTime();
    const apptMs = rawDate.getTime();
    if (activeTab === "upcoming") {
      return (
        apptMs >= todayMs &&
        appt.status !== "COMPLETED" &&
        appt.status !== "CANCELLED" &&
        appt.status !== "NO_SHOW"
      );
    }
    if (activeTab === "completed") {
      return appt.status === "COMPLETED" || appt.status === "NO_SHOW";
    }
    return true;
  });

  // Handlers
  const handleTabChange = (tabId: Tab) => {
    setActiveTab(tabId);
    setCurrentPage(1); // Reset to first page when changing tabs
  };

  const openReschedule = (appt: Appointment) => {
    setRescheduleAppt(appt);
    setRescheduleDate(undefined);
    setRescheduleTimeSlot("");
    setAvailableSlots([]);
  };

  const closeReschedule = () => {
    setRescheduleAppt(null);
    setRescheduleDate(undefined);
    setRescheduleTimeSlot("");
    setAvailableSlots([]);
  };

  const handleConfirmReschedule = async () => {
    if (!rescheduleAppt || !rescheduleDate || !rescheduleTimeSlot) return;
    setIsRescheduling(true);
    try {
      const result = await rescheduleAppointment(
        rescheduleAppt.id,
        format(rescheduleDate, "yyyy-MM-dd"),
        rescheduleTimeSlot
      );
      if (result.success) {
        toast.success("Appointment rescheduled successfully!");
        closeReschedule();
      } else {
        toast.error(result.error ?? "Failed to reschedule appointment.");
      }
    } catch {
      toast.error("An unexpected error occurred.");
    } finally {
      setIsRescheduling(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelAppt) return;
    setIsCancelling(true);
    try {
      const result = await cancelAppointment(cancelAppt.id);
      if (result.success) {
        toast.success("Appointment cancelled successfully!");
        setCancelAppt(null);
      } else {
        toast.error(result.error ?? "Failed to cancel appointment.");
      }
    } catch {
      toast.error("An unexpected error occurred.");
    } finally {
      setIsCancelling(false);
    }
  };

  const handleConfirmRemove = async () => {
    if (!removeAppt) return;
    setIsRemoving(true);
    try {
      const result = await deleteCancelledAppointment(removeAppt.id);
      if (result.success) {
        toast.success("Appointment removed successfully!");
        setLocalAppointments(prev => prev.filter(a => a.id !== removeAppt.id));
        setRemoveAppt(null);
      } else {
        toast.error(result.error ?? "Failed to remove appointment.");
      }
    } catch {
      toast.error("An unexpected error occurred.");
    } finally {
      setIsRemoving(false);
    }
  };

  const emptyMessage =
    activeTab === "upcoming"
      ? "You have no upcoming appointments."
      : activeTab === "completed"
      ? "You have no completed appointments yet."
      : "You haven't booked any appointments yet.";

  return (
    <>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Appointments</h1>
          <p className="text-slate-500 mt-1 text-sm">
            View and manage all your appointments.
          </p>
        </div>

        {/* DB Error */}
        {dbError && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
            <div>
              <h3 className="font-semibold">Unable to load your appointments</h3>
              <p className="text-sm mt-0.5">
                We're having trouble connecting to the database. Please try
                refreshing the page.
              </p>
            </div>
          </div>
        )}

        {!dbError && (
          <>
            {/* Filter Tabs */}
            <div className="flex gap-2 flex-wrap">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  id={`tab-${tab.id}`}
                  onClick={() => handleTabChange(tab.id)}
                  className={cn(
                    "px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
                    activeTab === tab.id
                      ? "bg-emerald-600 text-white shadow-sm shadow-emerald-200"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                  )}
                >
                  {tab.label}
                  {activeTab === tab.id && localAppointments.length > 0 && (
                    <span className="ml-2 bg-white/20 text-white text-xs font-semibold rounded-full px-1.5 py-0.5">
                      {filtered.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* List or Empty State */}
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-slate-200 text-center">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-4">
                  <CalendarDays className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800 mb-1">
                  No appointments found
                </h3>
                <p className="text-sm text-slate-500 mb-6 max-w-sm">
                  {emptyMessage}
                </p>
                <Link href="/dashboard/patient/book">
                  <Button
                    id="book-appointment-link"
                    className="bg-emerald-600 hover:bg-emerald-700 flex items-center gap-2 shadow-sm"
                  >
                    <CalendarPlus className="w-4 h-4" />
                    Book an Appointment
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-3">
                  {filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((appt) => (
                    <AppointmentCard
                      key={appt.id}
                      appointment={appt}
                      onReschedule={() => openReschedule(appt)}
                      onCancel={() => setCancelAppt(appt)}
                      onViewNotes={() => setNotesAppt(appt)}
                      onRemove={() => setRemoveAppt(appt)}
                    />
                  ))}
                </div>

                {/* Pagination Controls */}
                {Math.ceil(filtered.length / ITEMS_PER_PAGE) > 1 && (
                  <div className="flex items-center justify-between pt-2">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="text-slate-600 border-slate-200 hover:bg-slate-50"
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-slate-500 font-medium">
                      Page {currentPage} of {Math.ceil(filtered.length / ITEMS_PER_PAGE)}
                    </span>
                    <Button
                      variant="outline"
                      onClick={() => setCurrentPage((p) => Math.min(Math.ceil(filtered.length / ITEMS_PER_PAGE), p + 1))}
                      disabled={currentPage === Math.ceil(filtered.length / ITEMS_PER_PAGE)}
                      className="text-slate-600 border-slate-200 hover:bg-slate-50"
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Reschedule Modal ──────────────────────────────────────────────── */}
      {rescheduleAppt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reschedule-modal-title"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeReschedule}
          />

          {/* Panel */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between shrink-0">
              <div>
                <h2
                  id="reschedule-modal-title"
                  className="text-lg font-bold text-slate-900"
                >
                  Reschedule Appointment
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  <span className="font-medium text-slate-700">
                    {rescheduleAppt.service ?? "General Consultation"}
                  </span>{" "}
                  · currently{" "}
                  {formatDatePHT(rescheduleAppt.schedule.date, "MMM d, yyyy")}{" "}
                  at {rescheduleAppt.time_slot}
                </p>
              </div>
              <button
                onClick={closeReschedule}
                id="close-reschedule-modal"
                className="text-slate-400 hover:text-slate-600 transition-colors rounded-lg p-1 hover:bg-slate-100 ml-4 shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto flex-1">
              <div className="flex flex-col md:flex-row gap-6">
                {/* Calendar */}
                <div className="flex-1">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5 text-emerald-600" />
                    Select New Date
                  </p>
                  <div className="bg-slate-50 rounded-xl border border-slate-200 inline-block p-1">
                    <Calendar
                      mode="single"
                      selected={rescheduleDate}
                      onSelect={setRescheduleDate}
                      disabled={(date) =>
                        isBefore(date, startOfDay(new Date())) ||
                        isSaturday(date) ||
                        isSunday(date)
                      }
                      classNames={{
                        selected:
                          "bg-emerald-600 text-white hover:bg-emerald-600 hover:text-white focus:bg-emerald-600 focus:text-white",
                        today: "bg-slate-100 text-slate-900",
                      }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Clinic is open Monday to Friday only.
                  </p>
                </div>

                {/* Time Slots */}
                <div className="flex-1">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-600" />
                    Available Time Slots
                  </p>

                  {!rescheduleDate ? (
                    <div className="flex flex-col items-center justify-center h-48 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <CalendarIcon className="w-10 h-10 mb-2 opacity-20" />
                      <p className="text-sm">
                        Pick a date to see available slots.
                      </p>
                    </div>
                  ) : isFetchingSlots ? (
                    <div className="grid grid-cols-2 gap-2">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <div
                          key={i}
                          className="h-11 bg-slate-100 rounded-lg animate-pulse"
                        />
                      ))}
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <AlertCircle className="w-7 h-7 mb-2 text-slate-400" />
                      <p className="font-medium text-slate-700 text-sm">
                        No slots available
                      </p>
                      <p className="text-xs text-slate-500">
                        Please select another date.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {availableSlots.map((slot) => (
                        <button
                          key={slot}
                          onClick={() => setRescheduleTimeSlot(slot)}
                          className={cn(
                            "py-2.5 px-2 rounded-lg text-sm font-medium transition-all duration-150",
                            rescheduleTimeSlot === slot
                              ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                              : "bg-white border border-slate-200 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50"
                          )}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 shrink-0 bg-slate-50/60">
              <Button
                variant="outline"
                onClick={closeReschedule}
                disabled={isRescheduling}
                id="reschedule-cancel-btn"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmReschedule}
                disabled={!rescheduleDate || !rescheduleTimeSlot || isRescheduling}
                id="reschedule-confirm-btn"
                className="bg-emerald-600 hover:bg-emerald-700 min-w-[160px]"
              >
                {isRescheduling ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Rescheduling…
                  </span>
                ) : (
                  "Confirm Reschedule"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Cancel Confirmation Modal ─────────────────────────────────────── */}
      {cancelAppt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-modal-title"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !isCancelling && setCancelAppt(null)}
          />

          {/* Panel */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-8">
              {/* Icon */}
              <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mb-5 mx-auto">
                <AlertCircle className="w-7 h-7 text-red-500" />
              </div>

              <h2
                id="cancel-modal-title"
                className="text-xl font-bold text-slate-900 text-center mb-2"
              >
                Cancel Appointment?
              </h2>
              <p className="text-slate-500 text-center text-sm mb-2">
                Are you sure you want to cancel this appointment?
              </p>
              <p className="text-center text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 mb-6">
                {cancelAppt.service ?? "General Consultation"} ·{" "}
                {formatDatePHT(cancelAppt.schedule.date, "MMM d, yyyy")} at{" "}
                {cancelAppt.time_slot ?? "TBD"}
              </p>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setCancelAppt(null)}
                  disabled={isCancelling}
                  id="cancel-go-back-btn"
                  className="flex-1"
                >
                  Go Back
                </Button>
                <Button
                  onClick={handleConfirmCancel}
                  disabled={isCancelling}
                  id="cancel-confirm-btn"
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  {isCancelling ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Cancelling…
                    </span>
                  ) : (
                    "Yes, Cancel"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Remove Confirmation Modal ─────────────────────────────────────── */}
      {removeAppt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !isRemoving && setRemoveAppt(null)}
          />

          {/* Panel */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-8">
              {/* Icon */}
              <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mb-5 mx-auto">
                <AlertCircle className="w-7 h-7 text-red-500" />
              </div>

              <h2 className="text-xl font-bold text-slate-900 text-center mb-2">
                Remove Appointment?
              </h2>
              <p className="text-slate-500 text-center text-sm mb-2">
                This will permanently remove this {removeAppt.status === "NO_SHOW" ? "No Show" : "cancelled"} appointment from your records. This cannot be undone.
              </p>
              <p className="text-center text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 mb-6">
                {removeAppt.service ?? "General Consultation"} ·{" "}
                {formatDatePHT(removeAppt.schedule.date, "MMM d, yyyy")} at{" "}
                {removeAppt.time_slot ?? "TBD"}
              </p>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setRemoveAppt(null)}
                  disabled={isRemoving}
                  className="flex-1"
                >
                  Keep
                </Button>
                <Button
                  onClick={handleConfirmRemove}
                  disabled={isRemoving}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  {isRemoving ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Removing…
                    </span>
                  ) : (
                    "Yes, Remove"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Consultation Notes Modal ─────────────────────────────────────── */}
      {notesAppt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setNotesAppt(null)}
          />

          {/* Panel */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Consultation Summary
                  </h2>
                  <p className="text-sm text-slate-500">
                    {formatDatePHT(notesAppt.schedule.date, "MMMM d, yyyy")} • {notesAppt.service ?? "General"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setNotesAppt(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors rounded-lg p-1 hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <p className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-slate-400" />
                Dr. {notesAppt.doctor_name || "Assigned Doctor"}
              </p>

              {(!notesAppt.consultationDiagnosis && !notesAppt.consultationNotes && !notesAppt.followUpDate) ? (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
                  <p className="text-sm text-slate-500">
                    Your doctor did not add any consultation notes for this visit.
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 mb-1">Diagnosis:</h4>
                    <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                      {notesAppt.consultationDiagnosis || <span className="italic text-slate-400">No diagnosis provided</span>}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 mb-1">Notes:</h4>
                    <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 whitespace-pre-wrap">
                      {notesAppt.consultationNotes || <span className="italic text-slate-400">No notes provided</span>}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 mb-1">Follow-up Date:</h4>
                    <p className="text-sm text-slate-600">
                      {notesAppt.followUpDate 
                        ? formatDatePHT(notesAppt.followUpDate, "MMMM d, yyyy") 
                        : <span className="italic text-slate-400">No follow-up needed</span>}
                    </p>
                  </div>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <Button onClick={() => setNotesAppt(null)} variant="outline">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
