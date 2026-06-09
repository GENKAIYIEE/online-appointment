"use client";

import { useState, useEffect, useCallback } from "react";
import { format, differenceInYears, isBefore, startOfDay } from "date-fns";
import { Users, User, CalendarCheck, CheckCircle2, Printer, X, AlertTriangle, Info } from "lucide-react";
import { registerWalkIn, getStaffSummaryCards, getTodayWalkIns } from "@/actions/staff";
import { getBookedSlots } from "@/actions/book-appointment";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { cn, formatDatePHT } from "@/lib/utils";

type Summary = {
  totalWalkIns: number;
  maleCount: number;
  femaleCount: number;
  slotsRemaining: number;
};

type WalkIn = {
  id: string;
  patientName: string;
  age: number | null;
  sex: string;
  service: string;
  doctor: string;
  time: string;
  status: string;
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

/** All 18 time slots from 8:00 AM to 4:30 PM at 30-minute intervals */
const ALL_SLOTS: string[] = [
  "08:00 AM", "08:30 AM", "09:00 AM", "09:30 AM",
  "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
  "12:00 PM", "12:30 PM", "01:00 PM", "01:30 PM",
  "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM",
  "04:00 PM", "04:30 PM",
];

const ULTRASOUND_SLOTS: string[] = ["08:30 AM", "09:30 AM"];

// Helper to validate date selection for <input type="date">
// Note: <input type="date"> returns YYYY-MM-DD strings. We parse them as local dates
// to check day-of-week, matching the user's intent (the calendar they see).
function validateSelectedDate(dateString: string, serviceName?: string): { isValid: boolean; error?: string } {
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

  return { isValid: true };
}

export function StaffDeskClient({
  initialSummary,
  initialWalkIns,
  services,
}: {
  initialSummary: Summary;
  initialWalkIns: WalkIn[];
  services: Service[];
}) {
  const [summary, setSummary] = useState(initialSummary);
  const [walkIns, setWalkIns] = useState(initialWalkIns);

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

  const selectedService = services.find((s) => s.id === serviceId);

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

  const refreshData = useCallback(async () => {
    const [newSummary, newWalkIns] = await Promise.all([
      getStaffSummaryCards(),
      getTodayWalkIns(),
    ]);
    setSummary(newSummary);
    setWalkIns(newWalkIns);
  }, []);

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
    if (!contactNumber.trim()) e.contactNumber = "Contact Number is required";
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

  const handleReprintSlip = (wi: WalkIn, selectedDate: string) => {
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
      
      // Calculate dimensions in mm assuming standard 96 DPI screen
      const pxToMm = 25.4 / 96;
      const pdfWidth = img.width * pxToMm;
      const pdfHeight = img.height * pxToMm;
      
      const pdf = new jsPDF({
        orientation: pdfWidth > pdfHeight ? "landscape" : "portrait",
        unit: "mm",
        format: [pdfWidth, pdfHeight]
      });
      
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      
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
  const currentSlots = selectedService?.name === "Ultrasound" ? ULTRASOUND_SLOTS : ALL_SLOTS;
  const availableCount = currentSlots.length - bookedSlots.length;
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
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-medium text-slate-500">Total Walk-ins Today</div>
            <div className="text-2xl font-bold text-slate-900">{summary.totalWalkIns}</div>
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

        <div className={`rounded-xl p-6 border shadow-sm flex items-center gap-4 ${
          summary.slotsRemaining === 0 ? "bg-red-50 border-red-200" : "bg-white border-slate-200"
        }`}>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
            summary.slotsRemaining === 0 ? "bg-red-100 text-red-600" : "bg-emerald-50 text-emerald-600"
          }`}>
            <CalendarCheck className="w-6 h-6" />
          </div>
          <div>
            <div className={`text-sm font-medium ${summary.slotsRemaining === 0 ? "text-red-700" : "text-slate-500"}`}>
              Slots Remaining Today
            </div>
            <div className="text-2xl font-bold">{summary.slotsRemaining}</div>
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
                <input type="text" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} className={inputCls("contactNumber")} placeholder="09XX-XXX-XXXX" />
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
                <input
                  type="date"
                  min={todayString}
                  value={date}
                  onChange={(e) => {
                    const newDate = e.target.value;
                    if (!newDate) {
                      setDate("");
                      setTimeSlot("");
                      setBookedSlots([]);
                      return;
                    }
                    
                    const validation = validateSelectedDate(newDate, selectedService?.name);
                    if (!validation.isValid) {
                      toast.error(validation.error);
                      return;
                    }

                    setDate(newDate);
                    if (serviceId) fetchBookedSlots(newDate, serviceId);
                  }}
                  disabled={!serviceId}
                  className={inputCls("date")}
                />
                {errors.date && <p className="text-xs text-red-500">{errors.date}</p>}
                <p className="text-[11px] text-slate-500 mt-1 flex items-start gap-1">
                  <Info className="w-3.5 h-3.5 shrink-0" /> Clinic is open Monday to Thursday, 8:00 AM to 5:00 PM only.
                </p>
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
                      {currentSlots.map((slot) => {
                        const isTaken = bookedSlots.includes(slot);
                        return (
                          <option 
                            key={slot} 
                            value={slot} 
                            disabled={isTaken}
                            className={isTaken ? "text-slate-400 bg-slate-50" : ""}
                          >
                            {slot} {isTaken ? "(Taken)" : ""}
                          </option>
                        )
                      })}
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

        {/* SECTION 3: TODAY'S WALK-IN LIST */}
        <div className="xl:col-span-3">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full flex flex-col">
            <div className="border-b border-slate-100 bg-slate-50/50 p-4">
              <h3 className="font-semibold text-slate-800">Today's Walk-in List</h3>
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
                    <th className="px-4 py-3 font-medium">Slip</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {walkIns.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-10 text-center text-slate-400">
                        No walk-in patients registered yet today.
                      </td>
                    </tr>
                  ) : (
                    walkIns.map((wi, idx) => (
                      <tr key={wi.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 text-slate-400 font-mono text-xs">{idx + 1}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">{wi.patientName}</td>
                        <td className="px-4 py-3 text-slate-600">{wi.age ?? "—"}</td>
                        <td className="px-4 py-3 text-slate-600">{wi.sex}</td>
                        <td className="px-4 py-3 text-slate-600">{wi.service}</td>
                        <td className="px-4 py-3 text-slate-600">{wi.doctor}</td>
                        <td className="px-4 py-3 text-slate-600 font-mono text-xs">{wi.time}</td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary" className={
                            wi.status === "CONFIRMED" ? "bg-green-100 text-green-700 hover:bg-green-100" :
                            wi.status === "COMPLETED" ? "bg-slate-100 text-slate-700 hover:bg-slate-100" :
                            wi.status === "CANCELLED" ? "bg-red-100 text-red-700 hover:bg-red-100" : ""
                          }>
                            {wi.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleReprintSlip(wi, todayString)}
                            className="flex items-center gap-1 text-xs text-slate-500 hover:text-green-700 hover:bg-green-50 px-2 py-1 rounded border border-slate-200 hover:border-green-300 transition-all"
                          >
                            <Printer className="w-3 h-3" /> Print
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

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

            <div id="print-slip" className="p-6">
              <div className="border-2 border-green-600 rounded-xl p-5 text-center space-y-3">
                <div className="text-green-700 font-extrabold text-lg uppercase tracking-wide">
                  Agoo RHU — Appointment Slip
                </div>
                <div className="border-t border-green-200 pt-3 space-y-2 text-sm text-left">
                  {[
                    ["Name", slipData.fullName],
                    ["Service", slipData.service],
                    ["Date", slipData.date ? formatDatePHT(new Date(slipData.date), "MMMM d, yyyy") : ""],
                    ["Time", slipData.timeSlot],
                    ["Doctor", slipData.doctor],
                    ["Type", "WALK-IN"],
                  ].map(([label, val]) => (
                    <div key={label} className="flex gap-2">
                      <span className="font-semibold text-slate-600 w-16 shrink-0">{label}:</span>
                      <span className="text-slate-900 font-medium">{val}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-400 border-t border-slate-100 pt-3">Please present this slip upon arrival.</p>
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
