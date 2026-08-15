"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format, differenceInYears, isBefore, startOfDay } from "date-fns";
import { Users, User, CheckCircle2, Printer, X, AlertTriangle, Info, CalendarClock, CalendarIcon } from "lucide-react";
import { registerWalkIn, getStaffSummaryCards, getTodayAppointments, getAwaitingVitalsAppointments, getUpcomingAppointments, staffCancelAppointment, staffRescheduleAppointment, staffRecordVitals, type UpcomingAppointment } from "@/actions/staff";
import { getBookedSlots, getUpcomingLeavesForService } from "@/actions/book-appointment";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn, formatDatePHT, isTimeSlotPassedPHT } from "@/lib/utils";

type Summary = {
  totalAppointments: number;
  maleCount: number;
  femaleCount: number;
};

type TodayAppointment = {
  id: string;
  patientName: string;
  age: number | null;
  sex: string;
  service: string;
  doctor: string;
  time: string;
  status: string;
  date: string | null;
  type: string;
};

type Service = {
  id: string;
  name: string;
  doctor_name: string;
  assignedDoctor?: {
    id: string;
    name: string;
  } | null;
};

type SlipData = {
  fullName: string;
  service: string;
  date: string;
  timeSlot: string;
  doctor: string;
};

// Helper to validate date selection for <input type="date">
// Note: <input type="date"> returns YYYY-MM-DD strings. We parse them as local dates
// to check day-of-week, matching the user's intent (the calendar they see).
function validateSelectedDate(dateString: string, serviceName?: string, leaveDateObjects?: Date[]): { isValid: boolean; error?: string } {
  // Parse YYYY-MM-DD as local date (matching what the calendar picker shows the user)
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const dayOfWeek = date.getDay(); // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat

  if (serviceName === "Ultrasound") {
    if (dayOfWeek !== 4) {
      return { isValid: false, error: "Ultrasound is exclusively available on Thursdays." };
    }
  } else {
    // Disable Friday, Saturday, Sunday
    if (dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6) {
      return { isValid: false, error: "Clinic is open Monday to Thursday only." };
    }
  }

  // Disable past dates
  const today = startOfDay(new Date());
  const selectedDate = startOfDay(date);
  if (isBefore(selectedDate, today)) {
    return { isValid: false, error: "Cannot select a past date." };
  }

  // Disable today if past 4:30 PM local time
  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (isToday) {
    const isPastCutoff =
      now.getHours() > 16 ||
      (now.getHours() === 16 && now.getMinutes() >= 30);
    if (isPastCutoff) {
      return { isValid: false, error: "It is past 4:30 PM. No more slots available today." };
    }
  }

  // Check against leaves
  if (leaveDateObjects && leaveDateObjects.length > 0) {
    const isLeave = leaveDateObjects.some(d =>
      d.getFullYear() === date.getFullYear() &&
      d.getMonth() === date.getMonth() &&
      d.getDate() === date.getDate()
    );
    if (isLeave) {
      return { isValid: false, error: "The doctor is on leave on this date." };
    }
  }

  return { isValid: true };
}

export function StaffDeskClient({
  initialSummary,
  initialTodayAppointments,
  initialAwaitingVitals,
  services,
  clinicConfig,
  initialUpcomingAppointments,
}: {
  initialSummary: Summary;
  initialTodayAppointments: { data: TodayAppointment[]; totalPages: number; currentPage: number };
  initialAwaitingVitals: { data: TodayAppointment[]; totalPages: number; currentPage: number };
  services: Service[];
  clinicConfig: { allSlots: string[]; ultrasoundSlots: string[] };
  initialUpcomingAppointments: { data: UpcomingAppointment[]; totalPages: number; currentPage: number };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [summary, setSummary] = useState(initialSummary);
  const [todayAppointments, setTodayAppointments] = useState(initialTodayAppointments.data);
  const [awaitingVitals, setAwaitingVitals] = useState(initialAwaitingVitals.data);
  const [upcomingAppointments, setUpcomingAppointments] = useState<UpcomingAppointment[]>(initialUpcomingAppointments.data);
  const [upcomingFilter, setUpcomingFilter] = useState<"ALL" | "WALK_IN" | "ONLINE">("ALL");
  const [todayFilter, setTodayFilter] = useState<"ALL" | "WALK_IN" | "ONLINE">("ALL");

  useEffect(() => { setTodayAppointments(initialTodayAppointments.data); }, [initialTodayAppointments]);
  useEffect(() => { setAwaitingVitals(initialAwaitingVitals.data); }, [initialAwaitingVitals]);
  useEffect(() => { setUpcomingAppointments(initialUpcomingAppointments.data); }, [initialUpcomingAppointments]);

  const handleAwaitingPageChange = (newPage: number) => {
    if (newPage < 1 || newPage > initialAwaitingVitals.totalPages) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("awaitingPage", newPage.toString());
    router.push(`/dashboard/staff?${params.toString()}`, { scroll: false });
  };

  const handleTodayPageChange = (newPage: number) => {
    if (newPage < 1 || newPage > initialTodayAppointments.totalPages) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("todayPage", newPage.toString());
    router.push(`/dashboard/staff?${params.toString()}`, { scroll: false });
  };

  const handleUpcomingPageChange = (newPage: number) => {
    if (newPage < 1 || newPage > initialUpcomingAppointments.totalPages) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("upcomingPage", newPage.toString());
    router.push(`/dashboard/staff?${params.toString()}`, { scroll: false });
  };

  // Form fields
  const [fullName, setFullName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [age, setAge] = useState<number | "">("");
  const [sex, setSex] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [address, setAddress] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState("");
  const [timeSlot, setTimeSlot] = useState("");

  // Slots state
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [isFetchingSlots, setIsFetchingSlots] = useState(false);
  const [slotFetchError, setSlotFetchError] = useState<string | null>(null);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSlipModal, setShowSlipModal] = useState(false);
  const [slipData, setSlipData] = useState<SlipData | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Manage modal state
  // We use `any` or a union type here because it can be an UpcomingAppointment or a TodayAppointment
  const [manageTarget, setManageTarget] = useState<any | null>(null);
  const [manageView, setManageView] = useState<"options" | "reschedule" | "cancel" | "triage">("options");
  const [manageLoading, setManageLoading] = useState(false);
  // Reschedule form fields
  const [mgServiceId, setMgServiceId] = useState("");
  const [mgDate, setMgDate] = useState("");
  const [mgTimeSlot, setMgTimeSlot] = useState("");
  const [mgBookedSlots, setMgBookedSlots] = useState<string[]>([]);
  const [mgIsFetchingSlots, setMgIsFetchingSlots] = useState(false);
  const [mgSlotError, setMgSlotError] = useState<string | null>(null);

  // Triage modal state
  const [trBloodPressure, setTrBloodPressure] = useState("");
  const [trTemperature, setTrTemperature] = useState("");
  const [trHeartRate, setTrHeartRate] = useState("");
  const [trRespiratoryRate, setTrRespiratoryRate] = useState("");
  const [trO2Sat, setTrO2Sat] = useState("");
  const [trHeightCm, setTrHeightCm] = useState("");
  const [trWeightKg, setTrWeightKg] = useState("");
  const [trChiefComplaint, setTrChiefComplaint] = useState("");
  const [trSubmitting, setTrSubmitting] = useState(false);
  const [trErrors, setTrErrors] = useState<Record<string, string>>({});

  const selectedService = services.find((s) => s.id === serviceId);

  // Leaves state
  const [upcomingLeaves, setUpcomingLeaves] = useState<any[]>([]);
  const [mgUpcomingLeaves, setMgUpcomingLeaves] = useState<any[]>([]);

  useEffect(() => {
    async function fetchLeaves() {
      if (!serviceId) {
        setUpcomingLeaves([]);
        return;
      }
      const serviceName = services.find((s) => s.id === serviceId)?.name;
      if (!serviceName) return;
      try {
        const leaves = await getUpcomingLeavesForService(serviceName);
        setUpcomingLeaves(leaves);
      } catch {
        console.error("Failed to fetch leaves");
      }
    }
    fetchLeaves();
  }, [serviceId, services]);

  useEffect(() => {
    async function fetchMgLeaves() {
      if (!mgServiceId) {
        setMgUpcomingLeaves([]);
        return;
      }
      const serviceName = services.find((s) => s.id === mgServiceId)?.name;
      if (!serviceName) return;
      try {
        const leaves = await getUpcomingLeavesForService(serviceName);
        setMgUpcomingLeaves(leaves);
      } catch {
        console.error("Failed to fetch leaves");
      }
    }
    fetchMgLeaves();
  }, [mgServiceId, services]);

  // Process leave dates for Validation & Calendar (Walk-in Form)
  const leaveDateObjects: Date[] = [];
  upcomingLeaves.forEach(leave => {
    let curr = new Date(leave.startDate);
    const end = new Date(leave.endDate);
    while (curr <= end) {
      leaveDateObjects.push(new Date(curr.getUTCFullYear(), curr.getUTCMonth(), curr.getUTCDate()));
      curr.setUTCDate(curr.getUTCDate() + 1);
    }
  });

  // Process leave dates for Validation & Calendar (Reschedule Form)
  const mgLeaveDateObjects: Date[] = [];
  mgUpcomingLeaves.forEach(leave => {
    let curr = new Date(leave.startDate);
    const end = new Date(leave.endDate);
    while (curr <= end) {
      mgLeaveDateObjects.push(new Date(curr.getUTCFullYear(), curr.getUTCMonth(), curr.getUTCDate()));
      curr.setUTCDate(curr.getUTCDate() + 1);
    }
  });

  // Auto-calculate age from birthday
  useEffect(() => {
    if (birthday) {
      const years = differenceInYears(new Date(), new Date(birthday));
      setAge(years);
    } else {
      setAge("");
    }
  }, [birthday]);

  // Fetch booked slots from DB
  const fetchBookedSlots = useCallback(async (d: string, sid: string) => {
    if (!d || !sid) {
      setBookedSlots([]);
      setTimeSlot("");
      return;
    }
    
    setIsFetchingSlots(true);
    setSlotFetchError(null);
    setTimeSlot(""); // reset selection

    const serviceName = services.find((s) => s.id === sid)?.name;
    if (!serviceName) {
      setIsFetchingSlots(false);
      return;
    }

    try {
      const result = await getBookedSlots(d, serviceName);
      if (result.error) {
        setSlotFetchError(result.error);
        setBookedSlots([]);
      } else {
        setBookedSlots(result.bookedSlots);
      }
    } catch {
      setSlotFetchError("Failed to fetch slots");
      setBookedSlots([]);
    } finally {
      setIsFetchingSlots(false);
    }
  }, [services]);

  const refreshData = useCallback(async (isBackground = false) => {
    try {
      const [newSummary, newToday, newAwaiting, newUpcoming] = await Promise.all([
        getStaffSummaryCards(),
        getTodayAppointments(initialTodayAppointments.currentPage),
        getAwaitingVitalsAppointments(initialAwaitingVitals.currentPage),
        getUpcomingAppointments(initialUpcomingAppointments.currentPage),
      ]);
      setSummary(newSummary);
      setTodayAppointments(newToday.data);
      setAwaitingVitals(newAwaiting.data);
      setUpcomingAppointments(newUpcoming.data);
    } catch {
      if (!isBackground) toast.error("Failed to refresh data");
    }
  }, [initialTodayAppointments.currentPage, initialAwaitingVitals.currentPage, initialUpcomingAppointments.currentPage]);

  const openManageModal = (appt: any) => {
    setManageTarget(appt);
    setManageView("options");
    setMgServiceId("");
    setMgDate("");
    setMgTimeSlot("");
    setMgBookedSlots([]);
    setMgSlotError(null);
    setTrBloodPressure("");
    setTrTemperature("");
    setTrHeartRate("");
    setTrRespiratoryRate("");
    setTrO2Sat("");
    setTrHeightCm("");
    setTrWeightKg("");
    setTrChiefComplaint("");
    setTrErrors({});
  };

  const closeManageModal = () => setManageTarget(null);

  const fetchMgSlots = useCallback(async (d: string, sid: string) => {
    if (!d || !sid) { setMgBookedSlots([]); setMgTimeSlot(""); return; }
    const svc = services.find(s => s.id === sid);
    if (!svc) return;
    setMgIsFetchingSlots(true);
    setMgSlotError(null);
    setMgTimeSlot("");
    try {
      const result = await getBookedSlots(d, svc.name);
      if (result.error) { setMgSlotError(result.error); setMgBookedSlots([]); }
      else setMgBookedSlots(result.bookedSlots);
    } catch { setMgSlotError("Failed to fetch slots"); setMgBookedSlots([]); }
    finally { setMgIsFetchingSlots(false); }
  }, [services]);

  const handleStaffCancel = async () => {
    if (!manageTarget) return;
    setManageLoading(true);
    const result = await staffCancelAppointment(manageTarget.id);
    setManageLoading(false);
    if (result.success) {
      toast.success("Appointment cancelled successfully.");
      closeManageModal();
      await refreshData();
    } else {
      toast.error(result.error || "Failed to cancel appointment.");
    }
  };

  const handleStaffReschedule = async () => {
    if (!manageTarget || !mgServiceId || !mgDate || !mgTimeSlot) {
      toast.error("Please fill in all reschedule fields.");
      return;
    }
    setManageLoading(true);
    const result = await staffRescheduleAppointment({
      appointmentId: manageTarget.id,
      newServiceId: mgServiceId,
      newDateString: mgDate,
      newTimeSlot: mgTimeSlot,
    });
    setManageLoading(false);
    if (result.success) {
      toast.success("Appointment rescheduled successfully.");
      closeManageModal();
      await refreshData();
    } else {
      toast.error(result.error || "Failed to reschedule appointment.");
    }
  };

  const validateVitals = () => {
    const e: Record<string, string> = {};
    
    if (trBloodPressure.trim() && !/^\d{2,3}\/\d{2,3}$/.test(trBloodPressure.trim())) {
      e.bloodPressure = "Must be systolic/diastolic (e.g. 120/80)";
    }
    
    if (trTemperature.trim()) {
      const temp = parseFloat(trTemperature);
      if (isNaN(temp) || temp < 30 || temp > 45) {
        e.temperature = "Must be a valid number between 30 and 45";
      }
    }
    
    if (trHeartRate.trim()) {
      const hr = parseInt(trHeartRate);
      if (isNaN(hr) || hr < 30 || hr > 250) {
        e.heartRate = "Must be between 30 and 250";
      }
    }

    if (trRespiratoryRate.trim()) {
      const rr = parseInt(trRespiratoryRate);
      if (isNaN(rr) || rr < 8 || rr > 60) {
        e.respiratoryRate = "Must be between 8 and 60";
      }
    }

    if (trO2Sat.trim()) {
      const o2 = parseInt(trO2Sat);
      if (isNaN(o2) || o2 < 50 || o2 > 100) {
        e.o2Sat = "Must be between 50 and 100";
      }
    }

    if (trHeightCm.trim()) {
      const h = parseFloat(trHeightCm);
      if (isNaN(h) || h < 20 || h > 300) {
        e.heightCm = "Must be a valid number between 20 and 300";
      }
    }

    if (trWeightKg.trim()) {
      const w = parseFloat(trWeightKg);
      if (isNaN(w) || w < 1 || w > 500) {
        e.weightKg = "Must be a valid number between 1 and 500";
      }
    }

    setTrErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRecordVitals = async () => {
    if (!manageTarget) return;
    if (!validateVitals()) return;
    setTrSubmitting(true);
    const vitalsData = {
      bloodPressure: trBloodPressure.trim() || null,
      temperature: trTemperature.trim() || null,
      heartRate: trHeartRate.trim() || null,
      respiratoryRate: trRespiratoryRate.trim() || null,
      o2Sat: trO2Sat.trim() || null,
      heightCm: trHeightCm.trim() ? parseFloat(trHeightCm) : null,
      weightKg: trWeightKg.trim() ? parseFloat(trWeightKg) : null,
    };
    const result = await staffRecordVitals(manageTarget.id, vitalsData, trChiefComplaint);
    setTrSubmitting(false);
    if (result.success) {
      toast.success("Vital signs recorded successfully.");
      closeManageModal();
      await refreshData();
    } else {
      toast.error(result.error || "Failed to record vital signs.");
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      refreshData(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [refreshData]);

  const resetForm = () => {
    setFullName(""); setBirthday(""); setAge(""); setSex("");
    setContactNumber(""); setAddress(""); setServiceId("");
    setDate(""); setTimeSlot(""); setBookedSlots([]);
    setErrors({});
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = "Full Name is required";
    if (!birthday) e.birthday = "Birthday is required";
    if (!sex) e.sex = "Sex is required";
    if (!contactNumber.trim()) {
      e.contactNumber = "Contact Number is required";
    } else if (!/^\d{11}$/.test(contactNumber.trim())) {
      e.contactNumber = "Contact number must be exactly 11 digits";
    }
    if (!address.trim()) e.address = "Address is required";
    if (!serviceId) e.serviceId = "Service is required";
    if (!date) e.date = "Date is required";
    if (!timeSlot) e.timeSlot = "Time Slot is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (!selectedService?.assignedDoctor) {
      toast.error("This service has no assigned doctor. Please select another service or contact admin.");
      return;
    }

    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = async () => {
    setShowConfirmModal(false);
    setIsSubmitting(true);
    try {
      const result = await registerWalkIn({
        fullName,
        birthday,
        age: age as number,
        sex,
        contactNumber,
        address,
        serviceId,
        date,
        timeSlot,
      });

      if (result.success && result.data) {
        toast.success("Walk-in appointment assigned successfully!");
        setSlipData(result.data.slip);
        setShowSlipModal(true);
        resetForm();
        await refreshData();
      } else {
        toast.error(result.error || "Registration failed");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReprintSlip = (wi: TodayAppointment | UpcomingAppointment, selectedDate: string) => {
    setSlipData({
      fullName: wi.patientName,
      service: wi.service,
      date: selectedDate,
      timeSlot: wi.time,
      doctor: wi.doctor,
    });
    setShowSlipModal(true);
  };

  const handlePrint = async () => {
    const element = document.getElementById("print-slip");
    if (!element) return;
    
    try {
      setIsGeneratingPDF(true);
      const htmlToImage = await import("html-to-image");
      const { jsPDF } = await import("jspdf");
      
      // html-to-image properly renders modern CSS like lab() and oklch()
      const imgData = await htmlToImage.toPng(element, { 
        quality: 1.0,
        pixelRatio: 2,
      });
      
      const img = new Image();
      img.src = imgData;
      await new Promise((resolve) => {
        img.onload = resolve;
      });
      
      // Calculate true physical size in mm based on standard 96 DPI
      const pxToMm = 25.4 / 96;
      // img is 2x scaled due to pixelRatio: 2, so divide by 2 to get physical size
      const printWidthMm = (img.width / 2) * pxToMm;
      const printHeightMm = (img.height / 2) * pxToMm;
      
      // Use standard A4 size so browser doesn't try to auto-scale it up
      const a4WidthMm = 210;
      
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });
      
      // Align the small slip to the top-left of the A4 page
      const xOffset = 15; // 15mm from left
      const yOffset = 15; // 15mm from top
      
      pdf.addImage(imgData, "PNG", xOffset, yOffset, printWidthMm, printHeightMm);
      
      // Auto-download the PDF
      pdf.save(`Appointment_Slip_${slipData?.fullName?.replace(/\s+/g, '_') || 'Patient'}.pdf`);
      toast.success("Appointment slip downloaded successfully!");
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      toast.error("Failed to generate PDF slip.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const todayString = new Date().toISOString().split("T")[0];

  const inputCls = (field: string) =>
    `w-full px-3 py-2 border rounded-md text-sm outline-none transition-all ${
      errors[field]
        ? "border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500"
        : "border-slate-200 focus:border-green-500 focus:ring-1 focus:ring-green-500"
    }`;

  // Slot calculations
  const currentSlots = selectedService?.name === "Ultrasound" ? clinicConfig.ultrasoundSlots : clinicConfig.allSlots;
  
  const getPassedSlotsCount = (selectedDateStr: string, slots: string[], booked: string[]) => {
    if (!selectedDateStr) return 0;
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', year: 'numeric', month: 'numeric', day: 'numeric' });
    const parts = formatter.formatToParts(now);
    const phtYear = parseInt(parts.find(p => p.type === 'year')?.value || '0', 10);
    const phtMonth = parseInt(parts.find(p => p.type === 'month')?.value || '1', 10) - 1;
    const phtDay = parseInt(parts.find(p => p.type === 'day')?.value || '1', 10);
    
    const selectedDateObj = new Date(selectedDateStr);
    const isToday = selectedDateObj.getFullYear() === phtYear && selectedDateObj.getMonth() === phtMonth && selectedDateObj.getDate() === phtDay;
    
    if (isToday) {
      return slots.filter(slot => isTimeSlotPassedPHT(slot) && !booked.includes(slot)).length;
    }
    return 0;
  };

  const passedSlotsCount = getPassedSlotsCount(date, currentSlots, bookedSlots);
  const availableCount = currentSlots.length - bookedSlots.length - passedSlotsCount;
  const slotCountColor =
    availableCount === 0
      ? "text-red-600 font-medium"
      : availableCount <= 5
      ? "text-orange-500 font-medium"
      : "text-emerald-600 font-medium";

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 tracking-tight">
          Staff Desk
        </h1>
        <p className="text-slate-500 mt-1">
          Register walk-in patients and assign appointments. •{" "}
          <span suppressHydrationWarning>{format(new Date(), "MMMM d, yyyy")}</span>
        </p>
      </div>

      {/* SECTION 1: SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center shrink-0">
            <CalendarClock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-medium text-slate-500">Upcoming Appointments</div>
            <div className="text-2xl font-bold text-slate-900">{upcomingAppointments.length}</div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-medium text-slate-500">Total Appointments Today</div>
            <div className="text-2xl font-bold text-slate-900">{summary.totalAppointments}</div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center shrink-0">
            <User className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-medium text-slate-500">Male Patients</div>
            <div className="text-2xl font-bold text-slate-900">{summary.maleCount}</div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-pink-50 text-pink-600 rounded-full flex items-center justify-center shrink-0">
            <User className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-medium text-slate-500">Female Patients</div>
            <div className="text-2xl font-bold text-slate-900">{summary.femaleCount}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
        {/* SECTION 2: REGISTER WALK-IN FORM */}
        <div className="xl:col-span-2">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50/50 p-4">
              <h3 className="font-semibold text-slate-800">Register Walk-in Patient</h3>
              <p className="text-xs text-slate-500 mt-1">Encode from the patient's hard copy ITR form.</p>
            </div>
            <form onSubmit={handleOpenConfirm} className="p-4 space-y-4">

              {/* Full Name */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Full Name <span className="text-red-500">*</span></label>
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls("fullName")} placeholder="e.g. Juan Dela Cruz" />
                {errors.fullName && <p className="text-xs text-red-500">{errors.fullName}</p>}
              </div>

              {/* Birthday + Age */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Birthday <span className="text-red-500">*</span></label>
                  <input type="date" value={birthday} max={todayString} onChange={(e) => setBirthday(e.target.value)} className={inputCls("birthday")} />
                  {errors.birthday && <p className="text-xs text-red-500">{errors.birthday}</p>}
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Age</label>
                  <input type="text" value={age} readOnly className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm bg-slate-50 text-emerald-700 font-bold cursor-not-allowed" placeholder="Auto-calculated" />
                </div>
              </div>

              {/* Sex */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Sex <span className="text-red-500">*</span></label>
                <div className="flex gap-4 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="sex" value="Male" checked={sex === "Male"} onChange={() => setSex("Male")} className="w-4 h-4 accent-green-600" />
                    <span className="text-sm">Male</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="sex" value="Female" checked={sex === "Female"} onChange={() => setSex("Female")} className="w-4 h-4 accent-green-600" />
                    <span className="text-sm">Female</span>
                  </label>
                </div>
                {errors.sex && <p className="text-xs text-red-500">{errors.sex}</p>}
              </div>

              {/* Contact Number */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Contact Number <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={contactNumber} 
                  maxLength={11}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setContactNumber(val);
                  }} 
                  className={inputCls("contactNumber")} 
                  placeholder="09XXXXXXXXX" 
                />
                {errors.contactNumber && <p className="text-xs text-red-500">{errors.contactNumber}</p>}
              </div>

              {/* Address */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Address <span className="text-red-500">*</span></label>
                <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} className={`${inputCls("address")} resize-none`} placeholder="Barangay, Municipality, Province" />
                {errors.address && <p className="text-xs text-red-500">{errors.address}</p>}
              </div>

              {/* Service */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Service Needed <span className="text-red-500">*</span></label>
                <select value={serviceId} onChange={(e) => { 
                  setServiceId(e.target.value); 
                  setDate(""); // reset date on service change
                  setTimeSlot(""); 
                }} className={inputCls("serviceId")}>
                  <option value="">Select Service</option>
                  {services.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
                </select>
                {errors.serviceId && <p className="text-xs text-red-500">{errors.serviceId}</p>}
              </div>

              {/* Assigned Doctor (auto-filled) */}
              {selectedService && (
                <div className={cn("p-3 border rounded-md", selectedService.assignedDoctor ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100")}>
                  <p className={cn("text-xs mb-0.5 font-medium", selectedService.assignedDoctor ? "text-emerald-600" : "text-red-600")}>Assigned Doctor</p>
                  <p className={cn("text-sm font-bold", selectedService.assignedDoctor ? "text-emerald-900" : "text-red-900")}>
                    {selectedService.assignedDoctor?.name || "No Doctor Assigned"}
                  </p>
                </div>
              )}

              {/* Date */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Select Date <span className="text-red-500">*</span></label>
                <Popover>
                  <PopoverTrigger
                    disabled={!serviceId}
                    className={cn(
                      "flex h-10 w-full items-center justify-start rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-normal transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-green-500 disabled:cursor-not-allowed disabled:opacity-50",
                      !date && "text-slate-500",
                      errors.date && "border-red-400 focus-visible:ring-red-500 text-red-900"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(new Date(date), "MMMM d, yyyy") : <span>Pick a date</span>}
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date ? new Date(date) : undefined}
                      onSelect={(d) => {
                        if (!d) {
                          setDate("");
                          setTimeSlot("");
                          setBookedSlots([]);
                          return;
                        }
                        const dateStr = format(d, "yyyy-MM-dd");
                        const validation = validateSelectedDate(dateStr, selectedService?.name, leaveDateObjects);
                        if (!validation.isValid) {
                          toast.error(validation.error);
                          return;
                        }
                        setDate(dateStr);
                        if (serviceId) fetchBookedSlots(dateStr, serviceId);
                      }}
                      disabled={(d) => {
                        const day = d.getDay();
                        const isPast = startOfDay(d) < startOfDay(new Date());
                        if (isPast) return true;
                        
                        const isLeave = leaveDateObjects.some(ld => 
                          ld.getFullYear() === d.getFullYear() &&
                          ld.getMonth() === d.getMonth() &&
                          ld.getDate() === d.getDate()
                        );
                        if (isLeave) return true;

                        if (selectedService?.name === "Ultrasound") {
                          return day !== 4; // Only Thursday
                        }
                        return day === 0 || day === 5 || day === 6; // Mon-Thu only
                      }}
                      modifiers={{
                        leave: leaveDateObjects
                      }}
                      modifiersClassNames={{
                        leave: "text-amber-500 bg-amber-50 font-bold line-through opacity-80"
                      }}
                    />
                  </PopoverContent>
                </Popover>
                {errors.date && <p className="text-xs text-red-500">{errors.date}</p>}
                
                {/* Information Alerts */}
                <div className="mt-2 flex flex-col gap-1.5">
                  <p className="text-[11px] text-slate-500 flex items-start gap-1">
                    <Info className="w-3.5 h-3.5 shrink-0" /> Clinic is open Monday to Thursday, 8:00 AM to 5:00 PM only.
                  </p>
                  {upcomingLeaves.map((leave, idx) => {
                    const startStr = format(new Date(leave.startDate), "MMM d");
                    const endStr = format(new Date(leave.endDate), "MMM d");
                    const returnDate = new Date(leave.endDate);
                    returnDate.setUTCDate(returnDate.getUTCDate() + 1);
                    const returnStr = format(returnDate, "MMM d");
                    return (
                      <div key={idx} className="flex items-start gap-1.5 text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded p-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                        <span>
                          <strong>Doctor on Leave:</strong> {startStr} to {endStr}. Returns on <strong>{returnStr}</strong>.
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Time Slot */}
              {date && serviceId ? (
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-slate-700">Select Time Slot <span className="text-red-500">*</span></label>
                    {!isFetchingSlots && !slotFetchError && (
                      <span className={cn("text-xs", slotCountColor)}>{availableCount} available</span>
                    )}
                  </div>
                  {isFetchingSlots ? (
                    <div className="h-10 border border-slate-200 rounded-md flex items-center justify-center text-sm text-slate-400 bg-slate-50">
                      Loading slots...
                    </div>
                  ) : slotFetchError ? (
                    <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      {slotFetchError}
                    </div>
                  ) : availableCount === 0 ? (
                    <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      No slots available for this date. Please select another date.
                    </div>
                  ) : (
                    <select value={timeSlot} onChange={(e) => setTimeSlot(e.target.value)} className={inputCls("timeSlot")}>
                      <option value="">Select Time</option>
                      {(() => {
                        const now = new Date();
                        const formatter = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', year: 'numeric', month: 'numeric', day: 'numeric' });
                        const parts = formatter.formatToParts(now);
                        const phtYear = parseInt(parts.find(p => p.type === 'year')?.value || '0', 10);
                        const phtMonth = parseInt(parts.find(p => p.type === 'month')?.value || '1', 10) - 1;
                        const phtDay = parseInt(parts.find(p => p.type === 'day')?.value || '1', 10);
                        
                        const selectedDateObj = new Date(date);
                        const isToday = selectedDateObj.getFullYear() === phtYear && selectedDateObj.getMonth() === phtMonth && selectedDateObj.getDate() === phtDay;

                        return currentSlots.map((slot) => {
                          const isTaken = bookedSlots.includes(slot);
                          const isPassed = isToday && isTimeSlotPassedPHT(slot);
                          const disabled = isTaken || isPassed;
                          const labelSuffix = isTaken ? "(Taken)" : isPassed ? "(Passed)" : "";
                          
                          return (
                            <option 
                              key={slot} 
                              value={slot} 
                              disabled={disabled}
                              className={disabled ? "text-slate-400 bg-slate-50" : ""}
                            >
                              {slot} {labelSuffix}
                            </option>
                          )
                        });
                      })()}
                    </select>
                  )}
                  {errors.timeSlot && <p className="text-xs text-red-500">{errors.timeSlot}</p>}
                </div>
              ) : (
                <div className="text-xs text-slate-400 text-center py-2 bg-slate-50 rounded border border-dashed border-slate-200">
                  Select a service and date to load available time slots.
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || isFetchingSlots || availableCount === 0 || (!!selectedService && !selectedService.assignedDoctor)}
                className="w-full mt-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-md text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Assigning...</span>
                ) : (
                  <><CheckCircle2 className="w-4 h-4" /> Assign Appointment</>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN: LISTS */}
        <div className="xl:col-span-3 flex flex-col gap-6">
          
          {/* SECTION 2.5: AWAITING VITALS */}
          <div className="bg-white rounded-xl border border-blue-200 shadow-sm overflow-hidden flex flex-col">
            <div className="border-b border-blue-100 bg-blue-50/50 p-4">
              <h3 className="font-semibold text-blue-900">Awaiting Vitals (Check-in Queue)</h3>
              <p className="text-xs text-blue-700 mt-1">Patients who have arrived or been registered and need vitals recorded before seeing the doctor.</p>
            </div>
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-sm text-left">
                <thead className="bg-blue-50/30 border-b border-blue-100 text-blue-700">
                  <tr>
                    <th className="px-4 py-3 font-medium">#</th>
                    <th className="px-4 py-3 font-medium">Patient Name</th>
                    <th className="px-4 py-3 font-medium">Sex</th>
                    <th className="px-4 py-3 font-medium">Service</th>
                    <th className="px-4 py-3 font-medium">Time</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-50">
                  {awaitingVitals.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-blue-400">
                        No patients awaiting vitals.
                      </td>
                    </tr>
                  ) : (
                    awaitingVitals.map((appt, idx) => (
                      <tr key={appt.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-4 py-3 text-blue-400 font-mono text-xs">{(initialAwaitingVitals.currentPage - 1) * 10 + idx + 1}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">{appt.patientName}</td>
                        <td className="px-4 py-3 text-slate-600">{appt.sex}</td>
                        <td className="px-4 py-3 text-slate-600">{appt.service}</td>
                        <td className="px-4 py-3 text-slate-600 font-mono text-xs">{appt.time}</td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                            NEEDS VITALS
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={appt.type === "WALK_IN" ? "border-amber-200 text-amber-700 bg-amber-50" : "border-blue-200 text-blue-700 bg-blue-50"}>
                            {appt.type === "WALK_IN" ? "Walk-In" : "Online"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => openManageModal(appt as any)}
                            className="text-xs text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-md transition-all font-medium shadow-sm"
                          >
                            Record Vitals
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {/* PAGINATION: AWAITING VITALS */}
            {initialAwaitingVitals.totalPages > 1 && (
              <div className="px-5 py-3 border-t border-blue-100 flex items-center justify-between bg-blue-50/30 mt-auto">
                <span className="text-sm text-blue-600">
                  Page {initialAwaitingVitals.currentPage} of {initialAwaitingVitals.totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAwaitingPageChange(initialAwaitingVitals.currentPage - 1)}
                    disabled={initialAwaitingVitals.currentPage <= 1}
                    className="px-3 py-1.5 border border-blue-200 text-blue-700 rounded-md text-sm font-medium hover:bg-blue-50 disabled:opacity-50 transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => handleAwaitingPageChange(initialAwaitingVitals.currentPage + 1)}
                    disabled={initialAwaitingVitals.currentPage >= initialAwaitingVitals.totalPages}
                    className="px-3 py-1.5 border border-blue-200 text-blue-700 rounded-md text-sm font-medium hover:bg-blue-50 disabled:opacity-50 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 3: TODAY'S WALK-IN LIST */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="border-b border-slate-100 bg-slate-50/50 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h3 className="font-semibold text-slate-800">Today's Appointments</h3>
              <div className="flex bg-white rounded-lg border border-slate-200 p-1">
                <button onClick={() => setTodayFilter("ALL")} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${todayFilter === "ALL" ? "bg-slate-100 text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`}>All</button>
                <button onClick={() => setTodayFilter("WALK_IN")} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${todayFilter === "WALK_IN" ? "bg-slate-100 text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`}>Walk-in</button>
                <button onClick={() => setTodayFilter("ONLINE")} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${todayFilter === "ONLINE" ? "bg-slate-100 text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`}>Online</button>
              </div>
            </div>
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">#</th>
                    <th className="px-4 py-3 font-medium">Patient Name</th>
                    <th className="px-4 py-3 font-medium">Age</th>
                    <th className="px-4 py-3 font-medium">Sex</th>
                    <th className="px-4 py-3 font-medium">Service</th>
                    <th className="px-4 py-3 font-medium">Doctor</th>
                    <th className="px-4 py-3 font-medium">Time</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Slip</th>
                    <th className="px-4 py-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {todayAppointments.filter(appt => todayFilter === "ALL" || appt.type === todayFilter).length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-4 py-10 text-center text-slate-400">
                        No appointments for today.
                      </td>
                    </tr>
                  ) : (
                    todayAppointments.filter(appt => todayFilter === "ALL" || appt.type === todayFilter).map((appt, idx) => (
                      <tr key={appt.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 text-slate-400 font-mono text-xs">{(initialTodayAppointments.currentPage - 1) * 10 + idx + 1}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">{appt.patientName}</td>
                        <td className="px-4 py-3 text-slate-600">{appt.age ?? "—"}</td>
                        <td className="px-4 py-3 text-slate-600">{appt.sex}</td>
                        <td className="px-4 py-3 text-slate-600">{appt.service}</td>
                        <td className="px-4 py-3 text-slate-600">{appt.doctor}</td>
                        <td className="px-4 py-3 text-slate-600 font-mono text-xs">{appt.time}</td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary" className={
                            appt.status === "CONFIRMED" ? "bg-green-100 text-green-700 hover:bg-green-100" :
                            appt.status === "COMPLETED" ? "bg-slate-100 text-slate-700 hover:bg-slate-100" :
                            appt.status === "CANCELLED" ? "bg-red-100 text-red-700 hover:bg-red-100" : ""
                          }>
                            {appt.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-xs">
                            {appt.type}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {appt.type === "WALK_IN" && (
                            <button
                              onClick={() => handleReprintSlip(appt as any, appt.date ?? "")}
                              className="flex items-center gap-1 text-xs text-slate-500 hover:text-green-700 hover:bg-green-50 px-2 py-1 rounded border border-slate-200 hover:border-green-300 transition-all"
                            >
                              <Printer className="w-3 h-3" /> Print
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => openManageModal(appt as any)}
                            className="text-xs text-slate-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 rounded border border-slate-200 hover:border-blue-300 transition-all"
                          >
                            Manage
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {/* PAGINATION: TODAY APPOINTMENTS */}
            {initialTodayAppointments.totalPages > 1 && (
              <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50 mt-auto">
                <span className="text-sm text-slate-500">
                  Page {initialTodayAppointments.currentPage} of {initialTodayAppointments.totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleTodayPageChange(initialTodayAppointments.currentPage - 1)}
                    disabled={initialTodayAppointments.currentPage <= 1}
                    className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-md text-sm font-medium hover:bg-white disabled:opacity-50 transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => handleTodayPageChange(initialTodayAppointments.currentPage + 1)}
                    disabled={initialTodayAppointments.currentPage >= initialTodayAppointments.totalPages}
                    className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-md text-sm font-medium hover:bg-white disabled:opacity-50 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 4: UPCOMING APPOINTMENTS */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/50 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="font-semibold text-slate-800">Upcoming Appointments</h3>
            <p className="text-xs text-slate-500 mt-1">All appointments scheduled for future dates.</p>
          </div>
          <div className="flex bg-white rounded-lg border border-slate-200 p-1">
            <button onClick={() => setUpcomingFilter("ALL")} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${upcomingFilter === "ALL" ? "bg-slate-100 text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`}>All</button>
            <button onClick={() => setUpcomingFilter("WALK_IN")} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${upcomingFilter === "WALK_IN" ? "bg-slate-100 text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`}>Walk-in</button>
            <button onClick={() => setUpcomingFilter("ONLINE")} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${upcomingFilter === "ONLINE" ? "bg-slate-100 text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`}>Online</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Patient Name</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">Service</th>
                <th className="px-4 py-3 font-medium">Doctor</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Slip</th>
                <th className="px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {upcomingAppointments.filter(appt => upcomingFilter === "ALL" || appt.type === upcomingFilter).length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-slate-400">
                    No upcoming appointments.
                  </td>
                </tr>
              ) : (
                upcomingAppointments.filter(appt => upcomingFilter === "ALL" || appt.type === upcomingFilter).map((appt, idx) => (
                  <tr key={appt.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 text-slate-400 font-mono text-xs">{(initialUpcomingAppointments.currentPage - 1) * 10 + idx + 1}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{appt.patientName}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDatePHT(appt.date, "MMMM d, yyyy")}</td>
                    <td className="px-4 py-3 text-slate-600 font-mono text-xs">{appt.time}</td>
                    <td className="px-4 py-3 text-slate-600">{appt.service}</td>
                    <td className="px-4 py-3 text-slate-600">{appt.doctor}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-xs">
                        {appt.type}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {appt.type === "WALK_IN" && (
                        <button
                          onClick={() => handleReprintSlip(appt as any, appt.date)}
                          className="flex items-center gap-1 text-xs text-slate-500 hover:text-green-700 hover:bg-green-50 px-2 py-1 rounded border border-slate-200 hover:border-green-300 transition-all"
                        >
                          <Printer className="w-3 h-3" /> Print
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openManageModal(appt)}
                        className="text-xs text-slate-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 rounded border border-slate-200 hover:border-blue-300 transition-all"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* PAGINATION: UPCOMING APPOINTMENTS */}
        {initialUpcomingAppointments.totalPages > 1 && (
          <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
            <span className="text-sm text-slate-500">
              Page {initialUpcomingAppointments.currentPage} of {initialUpcomingAppointments.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => handleUpcomingPageChange(initialUpcomingAppointments.currentPage - 1)}
                disabled={initialUpcomingAppointments.currentPage <= 1}
                className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-md text-sm font-medium hover:bg-white disabled:opacity-50 transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => handleUpcomingPageChange(initialUpcomingAppointments.currentPage + 1)}
                disabled={initialUpcomingAppointments.currentPage >= initialUpcomingAppointments.totalPages}
                className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-md text-sm font-medium hover:bg-white disabled:opacity-50 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MANAGE APPOINTMENT MODAL */}
      {manageTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-start shrink-0">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Manage Appointment</h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  {manageTarget.patientName} — {formatDatePHT(manageTarget.date, "MMMM d, yyyy")} at {manageTarget.time}
                </p>
              </div>
              <button onClick={closeManageModal} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto">
              {/* Current appointment details */}
              <div className="px-6 pt-4 pb-2">
              <div className="bg-slate-50 rounded-xl p-4 text-sm space-y-1.5 border border-slate-100">
                {[
                  ["Patient", manageTarget.patientName],
                  ["Service", manageTarget.service],
                  ["Doctor", manageTarget.doctor],
                  ["Date", formatDatePHT(manageTarget.date, "MMMM d, yyyy")],
                  ["Time", manageTarget.time],
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between gap-4">
                    <span className="text-slate-500 font-medium">{label}</span>
                    <span className="text-slate-900 font-semibold text-right">{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Options view */}
            {manageView === "options" && (
              <div className="p-6 space-y-3">
                {manageTarget?.type === "WALK_IN" && (
                  <button 
                    onClick={() => setManageView("reschedule")}
                    className="w-full flex items-center gap-3 p-4 bg-white border border-amber-200 rounded-xl hover:bg-amber-50 hover:border-amber-300 transition-colors group"
                  >
                    <div className="p-2 bg-amber-100 text-amber-600 rounded-lg group-hover:scale-105 transition-transform">
                      <CalendarClock className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-amber-900">Reschedule Appointment</div>
                      <div className="text-xs text-amber-600/80">Change the date or time slot</div>
                    </div>
                  </button>
                )}

                {manageTarget.date && formatDatePHT(manageTarget.date, "yyyy-MM-dd") === formatDatePHT(new Date().toISOString(), "yyyy-MM-dd") && (
                  <button 
                    onClick={() => setManageView("triage")}
                    className="w-full flex items-center gap-3 p-4 bg-white border border-blue-200 rounded-xl hover:bg-blue-50 hover:border-blue-300 transition-colors group"
                  >
                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg group-hover:scale-105 transition-transform">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-blue-900">Record Vitals & Triage</div>
                      <div className="text-xs text-blue-600/80">Input BP, Temp, HR, and Chief Complaint</div>
                    </div>
                  </button>
                )}

                {manageTarget?.type === "WALK_IN" && (
                  <button
                    onClick={() => setManageView("cancel")}
                    className="w-full py-3 px-4 text-left rounded-xl border border-slate-200 hover:border-red-400 hover:bg-red-50 transition-all text-sm font-semibold text-slate-700 hover:text-red-700 flex items-center gap-3"
                  >
                    <X className="w-5 h-5 text-red-500" />
                    Cancel Appointment
                  </button>
                )}
              </div>
            )}

            {/* Reschedule view */}
            {manageView === "reschedule" && (() => {
              const mgSelectedService = services.find(s => s.id === mgServiceId);
              const mgSlots = mgSelectedService?.name === "Ultrasound" ? clinicConfig.ultrasoundSlots : clinicConfig.allSlots;
              const mgPassedSlotsCount = getPassedSlotsCount(mgDate, mgSlots, mgBookedSlots);
              const mgAvailableCount = mgSlots.length - mgBookedSlots.length - mgPassedSlotsCount;
              return (
                <div className="px-6 pb-6 space-y-4">
                  <p className="text-sm font-semibold text-slate-700 mt-2">Select new service, date, and time:</p>

                  {/* Service */}
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">Service <span className="text-red-500">*</span></label>
                    <select
                      value={mgServiceId}
                      onChange={(e) => { setMgServiceId(e.target.value); setMgDate(""); setMgTimeSlot(""); setMgBookedSlots([]); }}
                      className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                    >
                      <option value="">Select Service</option>
                      {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    {mgSelectedService && !mgSelectedService.assignedDoctor && (
                      <p className="text-xs text-red-500">No doctor assigned to this service.</p>
                    )}
                  </div>

                  {/* Date */}
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">New Date <span className="text-red-500">*</span></label>
                    <input
                      type="date"
                      min={todayString}
                      value={mgDate}
                      disabled={!mgServiceId}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val) { setMgDate(""); setMgTimeSlot(""); setMgBookedSlots([]); return; }
                        const validation = validateSelectedDate(val, mgSelectedService?.name, mgLeaveDateObjects);
                        if (!validation.isValid) { toast.error(validation.error); return; }
                        setMgDate(val);
                        fetchMgSlots(val, mgServiceId);
                      }}
                      className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 disabled:opacity-50"
                    />
                  </div>

                  {/* Leave Alerts for Reschedule */}
                  {mgUpcomingLeaves.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      {mgUpcomingLeaves.map((leave, idx) => {
                        const startStr = format(new Date(leave.startDate), "MMM d");
                        const endStr = format(new Date(leave.endDate), "MMM d");
                        const returnDate = new Date(leave.endDate);
                        returnDate.setUTCDate(returnDate.getUTCDate() + 1);
                        const returnStr = format(returnDate, "MMM d");
                        return (
                          <div key={idx} className="flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-2.5">
                            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                            <span>
                              <strong>Doctor on Leave:</strong> {startStr} to {endStr}.<br/>Returns on <strong>{returnStr}</strong>.
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Time Slot */}
                  {mgDate && mgServiceId && (
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="text-sm font-medium text-slate-700">Time Slot <span className="text-red-500">*</span></label>
                        {!mgIsFetchingSlots && !mgSlotError && (
                          <span className={cn("text-xs", mgAvailableCount === 0 ? "text-red-600 font-medium" : mgAvailableCount <= 5 ? "text-orange-500 font-medium" : "text-emerald-600 font-medium")}>
                            {mgAvailableCount} available
                          </span>
                        )}
                      </div>
                      {mgIsFetchingSlots ? (
                        <div className="h-10 border border-slate-200 rounded-md flex items-center justify-center text-sm text-slate-400 bg-slate-50">Loading slots...</div>
                      ) : mgSlotError ? (
                        <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100 flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />{mgSlotError}
                        </div>
                      ) : mgAvailableCount === 0 ? (
                        <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100 flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />No slots available. Please select another date.
                        </div>
                      ) : (
                        <select
                          value={mgTimeSlot}
                          onChange={(e) => setMgTimeSlot(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                        >
                          <option value="">Select Time</option>
                          {mgSlots.map(slot => {
                            const taken = mgBookedSlots.includes(slot);
                            
                            const now = new Date();
                            const formatter = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', year: 'numeric', month: 'numeric', day: 'numeric' });
                            const parts = formatter.formatToParts(now);
                            const phtYear = parseInt(parts.find(p => p.type === 'year')?.value || '0', 10);
                            const phtMonth = parseInt(parts.find(p => p.type === 'month')?.value || '1', 10) - 1;
                            const phtDay = parseInt(parts.find(p => p.type === 'day')?.value || '1', 10);
                            
                            const selectedDateObj = new Date(mgDate);
                            const isToday = selectedDateObj.getFullYear() === phtYear && selectedDateObj.getMonth() === phtMonth && selectedDateObj.getDate() === phtDay;
                            
                            const isPassed = isToday && isTimeSlotPassedPHT(slot);
                            const disabled = taken || isPassed;
                            const labelSuffix = taken ? " (Taken)" : isPassed ? " (Passed)" : "";
                            
                            return <option key={slot} value={slot} disabled={disabled} className={disabled ? "text-slate-400 bg-slate-50" : ""}>{slot}{labelSuffix}</option>;
                          })}
                        </select>
                      )}
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button onClick={() => setManageView("options")} className="flex-1 py-2.5 border border-slate-200 rounded-lg text-slate-700 font-medium text-sm hover:bg-slate-50 transition-colors">
                      Go Back
                    </button>
                    <button
                      onClick={handleStaffReschedule}
                      disabled={manageLoading || !mgServiceId || !mgDate || !mgTimeSlot || !mgSelectedService?.assignedDoctor}
                      className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                      {manageLoading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</> : "Confirm Reschedule"}
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Cancel confirmation view */}
            {manageView === "cancel" && (
              <div className="px-6 pb-6 space-y-4">
                <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">
                    Are you sure you want to delete this appointment? This will free up the slot and <strong>cannot be undone</strong>.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setManageView("options")} className="flex-1 py-2.5 border border-slate-200 rounded-lg text-slate-700 font-medium text-sm hover:bg-slate-50 transition-colors">
                    Go Back
                  </button>
                  <button
                    onClick={handleStaffCancel}
                    disabled={manageLoading}
                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {manageLoading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Deleting...</> : "Yes, Delete Appointment"}
                  </button>
                </div>
              </div>
            )}

            {/* Triage view */}
            {manageView === "triage" && (
              <div className="px-6 pb-6 space-y-4">
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <h3 className="font-semibold text-blue-900 mb-1">Record Vitals & Triage</h3>
                  <p className="text-xs text-blue-700">Enter the patient's vital signs and chief complaint for this visit.</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs font-medium text-slate-700">Chief Complaint</label>
                    <input type="text" value={trChiefComplaint} onChange={(e) => { setTrChiefComplaint(e.target.value); if(trErrors.chiefComplaint) setTrErrors({...trErrors, chiefComplaint: ""})}} placeholder="e.g. Fever, Cough" className={cn("w-full text-sm border-slate-200 rounded-md px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500", trErrors.chiefComplaint && "border-red-500 focus:ring-red-500")} />
                    {trErrors.chiefComplaint && <p className="text-[10px] text-red-500">{trErrors.chiefComplaint}</p>}
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">Blood Pressure (mmHg)</label>
                    <input type="text" value={trBloodPressure} onChange={(e) => { setTrBloodPressure(e.target.value); if(trErrors.bloodPressure) setTrErrors({...trErrors, bloodPressure: ""})}} placeholder="120/80" className={cn("w-full text-sm border-slate-200 rounded-md px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500", trErrors.bloodPressure && "border-red-500 focus:ring-red-500")} />
                    {trErrors.bloodPressure && <p className="text-[10px] text-red-500">{trErrors.bloodPressure}</p>}
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">Temperature (°C)</label>
                    <input type="text" value={trTemperature} onChange={(e) => { setTrTemperature(e.target.value); if(trErrors.temperature) setTrErrors({...trErrors, temperature: ""})}} placeholder="36.5" className={cn("w-full text-sm border-slate-200 rounded-md px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500", trErrors.temperature && "border-red-500 focus:ring-red-500")} />
                    {trErrors.temperature && <p className="text-[10px] text-red-500">{trErrors.temperature}</p>}
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">Heart Rate (bpm)</label>
                    <input type="text" value={trHeartRate} onChange={(e) => { setTrHeartRate(e.target.value); if(trErrors.heartRate) setTrErrors({...trErrors, heartRate: ""})}} placeholder="80" className={cn("w-full text-sm border-slate-200 rounded-md px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500", trErrors.heartRate && "border-red-500 focus:ring-red-500")} />
                    {trErrors.heartRate && <p className="text-[10px] text-red-500">{trErrors.heartRate}</p>}
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">Respiratory Rate</label>
                    <input type="text" value={trRespiratoryRate} onChange={(e) => { setTrRespiratoryRate(e.target.value); if(trErrors.respiratoryRate) setTrErrors({...trErrors, respiratoryRate: ""})}} placeholder="16" className={cn("w-full text-sm border-slate-200 rounded-md px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500", trErrors.respiratoryRate && "border-red-500 focus:ring-red-500")} />
                    {trErrors.respiratoryRate && <p className="text-[10px] text-red-500">{trErrors.respiratoryRate}</p>}
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">O2 Saturation (%)</label>
                    <input type="text" value={trO2Sat} onChange={(e) => { setTrO2Sat(e.target.value); if(trErrors.o2Sat) setTrErrors({...trErrors, o2Sat: ""})}} placeholder="98" className={cn("w-full text-sm border-slate-200 rounded-md px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500", trErrors.o2Sat && "border-red-500 focus:ring-red-500")} />
                    {trErrors.o2Sat && <p className="text-[10px] text-red-500">{trErrors.o2Sat}</p>}
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">Height (cm)</label>
                    <input type="text" value={trHeightCm} onChange={(e) => { setTrHeightCm(e.target.value); if(trErrors.heightCm) setTrErrors({...trErrors, heightCm: ""})}} placeholder="165" className={cn("w-full text-sm border-slate-200 rounded-md px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500", trErrors.heightCm && "border-red-500 focus:ring-red-500")} />
                    {trErrors.heightCm && <p className="text-[10px] text-red-500">{trErrors.heightCm}</p>}
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">Weight (kg)</label>
                    <input type="text" value={trWeightKg} onChange={(e) => { setTrWeightKg(e.target.value); if(trErrors.weightKg) setTrErrors({...trErrors, weightKg: ""})}} placeholder="65" className={cn("w-full text-sm border-slate-200 rounded-md px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500", trErrors.weightKg && "border-red-500 focus:ring-red-500")} />
                    {trErrors.weightKg && <p className="text-[10px] text-red-500">{trErrors.weightKg}</p>}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button onClick={() => setManageView("options")} disabled={trSubmitting} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                    Go Back
                  </button>
                  <button onClick={handleRecordVitals} disabled={trSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2">
                    {trSubmitting ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Save Vitals
                  </button>
                </div>
              </div>
            )}
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Confirm Walk-in Details</h2>
              <p className="text-sm text-slate-500 mt-1">Please review before assigning the appointment.</p>
            </div>
            <div className="p-6 space-y-3 text-sm">
              {[
                ["Patient Name", fullName],
                ["Birthday", birthday ? formatDatePHT(new Date(birthday), "MMM d, yyyy") : "—"],
                ["Age", age !== "" ? `${age} years old` : "—"],
                ["Sex", sex],
                ["Contact", contactNumber],
                ["Service", selectedService?.name || "—"],
                ["Date", date ? formatDatePHT(new Date(date), "MMMM d, yyyy") : "—"],
                ["Time", timeSlot],
                ["Doctor", selectedService?.assignedDoctor?.name || "—"],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between gap-4">
                  <span className="text-slate-500 font-medium">{label}</span>
                  <span className="text-slate-900 font-semibold text-right">{val}</span>
                </div>
              ))}
            </div>
            <div className="p-6 border-t border-slate-100 flex gap-3">
              <button onClick={() => setShowConfirmModal(false)} className="flex-1 py-2.5 border border-slate-200 rounded-lg text-slate-700 font-medium text-sm hover:bg-slate-50 transition-colors">
                Go Back
              </button>
              <button onClick={handleConfirmSubmit} className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-sm transition-colors">
                Confirm & Assign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* APPOINTMENT SLIP MODAL */}
      {showSlipModal && slipData && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-900">Appointment Slip</h2>
              <button onClick={() => setShowSlipModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 bg-slate-50 flex justify-center">
              <div id="print-slip" className="bg-white w-[260px] p-1 shrink-0">
                <div className="border-2 border-green-600 rounded-lg p-4 text-center space-y-2">
                  <div className="text-green-700 font-extrabold text-[13px] uppercase tracking-wide leading-snug">
                    Agoo RHU — Appointment Slip
                  </div>
                  <div className="border-t border-green-200 pt-2 space-y-1.5 text-xs text-left">
                    {[
                      ["Name", slipData.fullName],
                      ["Service", slipData.service],
                      ["Date", slipData.date ? formatDatePHT(new Date(slipData.date), "MMM d, yyyy") : ""],
                      ["Time", slipData.timeSlot],
                      ["Doctor", slipData.doctor],
                      ["Type", "WALK-IN"],
                    ].map(([label, val]) => (
                      <div key={label} className="flex gap-2">
                        <span className="font-semibold text-slate-600 w-12 shrink-0">{label}:</span>
                        <span className="text-slate-900 font-medium">{val}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400 border-t border-slate-100 pt-2 mt-1">Please present this slip upon arrival.</p>
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 flex gap-3">
              <button onClick={() => setShowSlipModal(false)} className="flex-1 py-2.5 border border-slate-200 rounded-lg text-slate-700 font-medium text-sm hover:bg-slate-50 transition-colors">
                Close
              </button>
              <button 
                onClick={handlePrint} 
                disabled={isGeneratingPDF}
                className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isGeneratingPDF ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Printer className="w-4 h-4" /> Print Slip
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
