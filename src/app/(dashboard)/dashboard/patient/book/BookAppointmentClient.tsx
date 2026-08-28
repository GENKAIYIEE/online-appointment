"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Smile,
  FlaskConical,
  Heart,
  Users,
  Activity,
  Microscope,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  CalendarDays,
  Clock,
  User,
  Phone,
  Calendar as CalendarIcon,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { format, isBefore, startOfDay } from "date-fns";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { getBookedSlots, createAppointment, checkServiceAvailability } from "@/actions/book-appointment";
import { getSubProfiles } from "@/actions/sub-profiles";
import { cn, isTimeSlotPassedPHT } from "@/lib/utils";

const DEFAULT_SERVICES_ICONS: Record<string, any> = {
  "Dental Clinic": Smile,
  "Drug Testing": FlaskConical,
  "Family Planning": Heart,
  "Adolescence Clinic": Users,
  "Laboratory": Microscope,
};

// ─── Calendar Disabled Logic ──────────────────────────────────────────────────

/**
 * Returns true if a calendar date should be disabled (not selectable).
 * Rules:
 *  - Only Monday–Friday are allowed
 *  - All past dates are disabled
 *  - Today is disabled if current time is at or past 4:30 PM
 */
function isDateDisabled(date: Date, serviceName?: string): boolean {
  const day = date.getDay(); // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat

  if (serviceName === "Ultrasound") {
    if (day !== 4) return true; // Only Thursday
  } else {
    // Disable Saturday, Sunday
    if (day === 0 || day === 6) return true;
  }

  // Get current date/time in Asia/Manila
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false
  });
  
  const parts = formatter.formatToParts(now);
  const getPart = (type: string) => parts.find(p => p.type === type)?.value;
  
  const phtYear = parseInt(getPart('year') || '0', 10);
  const phtMonth = parseInt(getPart('month') || '1', 10) - 1; // 0-indexed for Date
  const phtDay = parseInt(getPart('day') || '1', 10);
  const phtHour = parseInt(getPart('hour') || '0', 10);
  const phtMinute = parseInt(getPart('minute') || '0', 10);

  // The calendar picker 'date' is created at local midnight: new Date(year, month, day, 0, 0, 0)
  // We compare it against the PHT startOfDay.
  const selectedDateStr = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  const phtTodayStr = `${phtYear}-${phtMonth}-${phtDay}`;

  // If selected date is BEFORE PHT today
  const selectedDateValue = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const phtTodayValue = new Date(phtYear, phtMonth, phtDay).getTime();

  if (selectedDateValue < phtTodayValue) return true;

  // Disable today if current time is >= 4:30 PM (16:30)
  if (selectedDateStr === phtTodayStr) {
    const isPastCutoff = phtHour > 16 || (phtHour === 16 && phtMinute >= 30);
    if (isPastCutoff) return true;
  }

  return false;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BookAppointmentClient({
  patientInfo,
  services,
  clinicConfig,
}: {
  patientInfo: any;
  services: { id: string; name: string }[];
  clinicConfig: { allSlots: string[]; ultrasoundSlots: string[] };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const paramDateStr = searchParams.get("date");
  const paramServiceStr = searchParams.get("service");

  const parsedDate = paramDateStr ? new Date(`${paramDateStr}T00:00:00`) : undefined;
  const initialDate = (parsedDate && !isNaN(parsedDate.getTime())) ? parsedDate : undefined;

  // Step state
  const [step, setStep] = useState((initialDate && paramServiceStr) ? 2 : 1);

  // Form selections
  const [selectedService, setSelectedService] = useState(paramServiceStr || "");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(initialDate);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState("");
  const [notes, setNotes] = useState("");

  // Sub-profile (family member) state
  type SubProfileOption = { id: string; firstName: string; lastName: string; relationship: string; itr?: { isCompleted: boolean } };
  const [subProfiles, setSubProfiles] = useState<SubProfileOption[]>([]);
  const [selectedSubProfileId, setSelectedSubProfileId] = useState<string | null | undefined>(undefined); // undefined = unselected, null = "Myself"
  const [isFetchingProfiles, setIsFetchingProfiles] = useState(false);

  // Fetch sub-profiles on mount
  useEffect(() => {
    setIsFetchingProfiles(true);
    getSubProfiles().then((res) => {
      if (res.success) setSubProfiles(res.data as SubProfileOption[]);
      setIsFetchingProfiles(false);
    });
  }, []);

  // Slot data state
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [isFetchingSlots, setIsFetchingSlots] = useState(false);
  const [slotFetchError, setSlotFetchError] = useState<string | null>(null);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingService, setIsCheckingService] = useState(false);

  // ── Fetch booked slots from DB whenever date or service changes ──────────────
  const fetchBookedSlots = useCallback(async (isBackground = false) => {
    if (!selectedDate || !selectedService) return;

    if (!isBackground) {
      setIsFetchingSlots(true);
      setSlotFetchError(null);
    }

    try {
      const result = await getBookedSlots(
        format(selectedDate, "yyyy-MM-dd"),
        selectedService
      );
      if (result.error) {
        if (!isBackground) setSlotFetchError(result.error);
        setBookedSlots([]);
      } else {
        setBookedSlots(result.bookedSlots);
      }
    } catch {
      if (!isBackground) setSlotFetchError("Failed to load time slots. Please try again.");
      setBookedSlots([]);
    } finally {
      if (!isBackground) setIsFetchingSlots(false);
    }
  }, [selectedDate, selectedService]);

  useEffect(() => {
    if (step === 2 && selectedDate && selectedService) {
      fetchBookedSlots();
    }
  }, [selectedDate, selectedService, step, fetchBookedSlots]);

  // ── Real-time polling ────────────────────────────────────────────────────────
  useEffect(() => {
    if (step === 2) {
      const interval = setInterval(() => {
        if (selectedDate && selectedService) fetchBookedSlots(true);
      }, 10000); // 10 seconds
      return () => clearInterval(interval);
    }
  }, [step, selectedDate, selectedService, fetchBookedSlots]);

  // ── Derived values ───────────────────────────────────────────────────────────
  const selectedServiceName = selectedService;
  
  const currentSlots = selectedServiceName === "Ultrasound" ? clinicConfig.ultrasoundSlots : clinicConfig.allSlots;
  const availableCount = currentSlots.length - bookedSlots.length;
  const allSlotsTaken = availableCount === 0 && !isFetchingSlots && !slotFetchError && !!selectedDate;

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleNext = async () => {
    if (step === 1 && selectedService) {
      setIsCheckingService(true);
      try {
        const isAvailable = await checkServiceAvailability(selectedServiceName);
        if (!isAvailable) {
          toast.error("This service is currently unavailable. Please try again later or contact the admin.");
          setIsCheckingService(false);
          return;
        }
      } catch (e) {
        toast.error("Failed to check service availability.");
        setIsCheckingService(false);
        return;
      }
      setIsCheckingService(false);
    }
    if (step < 3) setStep(step + 1); 
  };
  const handleBack = () => { if (step > 1) setStep(step - 1); };

  const handleDateSelect = (date: Date | undefined) => {
    if (date !== selectedDate) {
      setSelectedDate(date);
      setSelectedTimeSlot(""); // clear time only on date change
    }
  };

  const handleSubmit = async () => {
    if (!selectedDate || !selectedService || !selectedTimeSlot) return;

    setIsSubmitting(true);
    try {
      const res = await createAppointment({
        service: selectedService,
        date: format(selectedDate, "yyyy-MM-dd"),
        timeSlot: selectedTimeSlot,
        notes: notes.trim() !== "" ? notes.trim() : undefined,
        subProfileId: selectedSubProfileId ?? undefined,
      });

      if (res.success) {
        toast.success(
          "Appointment booked successfully! You will be notified once confirmed."
        );
        router.push("/dashboard/patient/appointments");
      } else {
        toast.error(res.error || "Failed to book appointment. Please try again.");
      }
    } catch {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Slot count badge color ───────────────────────────────────────────────────
  const slotCountColor =
    availableCount === 0
      ? "text-red-600"
      : availableCount <= 5
      ? "text-orange-500"
      : "text-emerald-600";

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      {/* Step Indicator */}
      <div className="mb-8 relative">
        {/* Connecting Lines */}
        <div className="absolute top-5 left-[16.66%] right-[16.66%] -translate-y-1/2 h-1 bg-slate-200 z-0 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
            style={{ width: `${((step - 1) / 2) * 100}%` }}
          />
        </div>

        {/* Steps */}
        <div className="flex items-start justify-between relative z-10">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex-1 flex flex-col items-center gap-2">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors shadow-sm",
                  step === s
                    ? "bg-emerald-600 text-white border-2 border-emerald-100"
                    : step > s
                    ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                    : "bg-white text-slate-400 border border-slate-200"
                )}
              >
                {step > s ? <CheckCircle2 className="w-5 h-5" /> : s}
              </div>
              <span
                className={cn(
                  "text-xs font-medium text-center",
                  step >= s ? "text-slate-900" : "text-slate-400"
                )}
              >
                {s === 1 ? "Service & Patient" : s === 2 ? "Date & Time" : "Confirm"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── STEP 1: Service & Patient ──────────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl mb-8">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <User className="w-5 h-5 text-emerald-600" /> Who is this appointment for?
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">Book for yourself or a family member under your account.</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {/* Myself option */}
                  <button
                    onClick={() => setSelectedSubProfileId(null)}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-xl border-2 text-sm font-medium transition-all duration-150 text-left",
                      selectedSubProfileId === null
                        ? "border-emerald-600 bg-emerald-50 text-emerald-900 shadow-sm"
                        : "border-slate-200 text-slate-600 hover:border-emerald-200 hover:bg-white bg-white"
                    )}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <User className="w-4 h-4 shrink-0" />
                      <span className="truncate">Myself</span>
                    </div>
                    {selectedSubProfileId === null && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    )}
                  </button>

                  {/* Family member options */}
                  {subProfiles.map((sp) => {
                    const hasITR = sp.itr?.isCompleted;
                    return (
                      <button
                        key={sp.id}
                        onClick={() => {
                          if (!hasITR) {
                            toast.error(`${sp.firstName} needs a completed health record first. Please manage their record from the Family Profiles page.`);
                            return;
                          }
                          setSelectedSubProfileId(sp.id);
                        }}
                        className={cn(
                          "flex flex-col justify-center p-3 rounded-xl border-2 text-sm font-medium transition-all duration-150 relative bg-white text-left",
                          !hasITR
                            ? "border-red-200 text-slate-400 cursor-not-allowed"
                            : selectedSubProfileId === sp.id
                              ? "border-emerald-600 bg-emerald-50 text-emerald-900 shadow-sm"
                              : "border-slate-200 text-slate-600 hover:border-emerald-200"
                        )}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2 truncate">
                            <Users className="w-4 h-4 shrink-0" />
                            <span className="truncate">{sp.firstName} {sp.lastName}</span>
                          </div>
                          {selectedSubProfileId === sp.id && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 mt-1.5 ml-6">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-normal truncate">
                            {sp.relationship}
                          </span>
                          {!hasITR && (
                            <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100 truncate">
                              Needs ITR
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}

                  {/* Manage family profiles link */}
                  <a
                    href="/dashboard/patient/family"
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border-2 border-dashed border-slate-200 text-sm text-slate-500 hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50/50 transition-all duration-150"
                  >
                    <Users className="w-4 h-4" />
                    + Manage Family Profiles
                  </a>
                </div>
          </div>

          {/* ── Select Service ── */}
          <Card className={cn("border-slate-200 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100", 
            selectedSubProfileId === undefined && "opacity-60 grayscale-[0.5]"
          )}>
            <CardHeader>
              <CardTitle>Select a Service</CardTitle>
              <CardDescription>
                Choose the type of consultation or service you need.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {services.map((service) => {
                  const Icon = DEFAULT_SERVICES_ICONS[service.name] || Activity;
                  const isSelected = selectedService === service.name;
                  const isDisabled = selectedSubProfileId === undefined;
                  
                  return (
                    <button
                      key={service.id}
                      disabled={isDisabled}
                      onClick={() => setSelectedService(service.name)}
                      className={cn(
                        "flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all duration-200",
                        isDisabled ? "cursor-not-allowed bg-slate-50 border-slate-100" :
                        isSelected
                          ? "border-emerald-600 bg-emerald-50/50 shadow-sm scale-[1.02]"
                          : "border-slate-100 hover:border-emerald-200 hover:bg-slate-50"
                      )}
                    >
                      <div
                        className={cn(
                          "p-3 rounded-full",
                          isDisabled ? "bg-slate-100 text-slate-400" :
                          isSelected
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        )}
                      >
                        <Icon className="w-6 h-6" />
                      </div>
                      <span
                        className={cn(
                          "font-semibold text-sm text-center",
                          isDisabled ? "text-slate-400" :
                          isSelected ? "text-emerald-900" : "text-slate-700"
                        )}
                      >
                        {service.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
            <CardFooter className="flex justify-end pt-4 border-t border-slate-100">
              <Button
                onClick={handleNext}
                disabled={!selectedService || selectedSubProfileId === undefined || isCheckingService}
                className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto"
              >
                {isCheckingService ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Checking...</>
                ) : (
                  <>Continue to Date &amp; Time <ChevronRight className="w-4 h-4 ml-1" /></>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* ── STEP 2: Date & Time ─────────────────────────────────────────────── */}
      {step === 2 && (
        <Card className="border-slate-200 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
          <CardHeader>
            <CardTitle>Select Date & Time</CardTitle>
            <CardDescription>
              Choose when you would like to visit the clinic.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 sm:p-6 sm:pt-0">
            <div className="flex flex-col md:flex-row gap-0 md:gap-8 border-y sm:border sm:rounded-xl border-slate-100 bg-white sm:shadow-sm overflow-hidden">

              {/* Left: Calendar */}
              <div className="flex-1 p-6 border-b md:border-b-0 md:border-r border-slate-100 bg-slate-50/30">
                <div className="flex items-center gap-2 mb-4 font-semibold text-slate-800">
                  <CalendarDays className="w-5 h-5 text-emerald-600" />
                  <h3>Pick a Date</h3>
                </div>
                <div className="bg-white rounded-lg border border-slate-200 p-2 shadow-sm inline-block">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    disabled={[
                      (d) => isDateDisabled(d, selectedServiceName),
                    ]}
                    className="p-3"
                    classNames={{
                      selected:
                        "bg-emerald-600 text-white hover:bg-emerald-600 hover:text-white focus:bg-emerald-600 focus:text-white",
                      today: "bg-slate-100 text-slate-900",
                      disabled: "text-slate-300 cursor-not-allowed opacity-50 line-through",
                    }}
                  />
                </div>
                {/* Clinic hours note */}
                <div className="mt-4 flex flex-col gap-2">
                  <div className="flex items-start gap-2 text-xs text-slate-500 bg-blue-50 border border-blue-100 rounded-lg p-3">
                    <AlertCircle className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" />
                    <span>
                      Clinic is open <strong>Monday to Friday</strong>,{" "}
                      <strong>8:00 AM to 5:00 PM</strong> only.
                    </span>
                  </div>
                  {selectedServiceName === "Ultrasound" && (
                    <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-3">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                      <span>
                        <strong>Ultrasound</strong> is exclusively available on <strong>Thursdays</strong> at 8:30 AM and 9:30 AM.
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Time Slots */}
              <div className="flex-[1.2] p-6">
                <div className="flex items-center gap-2 mb-1 font-semibold text-slate-800">
                  <Clock className="w-5 h-5 text-emerald-600" />
                  <h3>Available Time Slots</h3>
                </div>

                {/* No date selected prompt */}
                {!selectedDate && (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12 text-center">
                    <CalendarIcon className="w-12 h-12 mb-3 opacity-20" />
                    <p>
                      Please select a date from the calendar
                      <br />
                      to view available time slots.
                    </p>
                  </div>
                )}

                {/* Loading skeleton */}
                {selectedDate && isFetchingSlots && (
                  <div className="pt-2">
                    <div className="flex items-center gap-2 text-sm text-slate-400 mb-4">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading slots...
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {Array.from({ length: 18 }).map((_, i) => (
                        <div
                          key={i}
                          className="h-14 bg-slate-100 rounded-lg animate-pulse"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Fetch error */}
                {selectedDate && !isFetchingSlots && slotFetchError && (
                  <div className="mt-4 flex flex-col items-center justify-center text-center py-10 bg-red-50 rounded-xl border border-red-100">
                    <AlertCircle className="w-8 h-8 text-red-400 mb-2" />
                    <p className="font-medium text-red-700">Could not load slots</p>
                    <p className="text-sm text-red-500 mb-4">{slotFetchError}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchBookedSlots()}
                      className="border-red-200 text-red-600 hover:bg-red-50"
                    >
                      Try Again
                    </Button>
                  </div>
                )}

                {/* Slots grid */}
                {selectedDate && !isFetchingSlots && !slotFetchError && (
                  <>
                    {/* Slot count indicator */}
                    <p className={cn("text-sm font-semibold mb-4", slotCountColor)}>
                      {availableCount === 0
                        ? "No slots available"
                        : `${availableCount} slot${availableCount !== 1 ? "s" : ""} available`}
                    </p>

                    {/* All slots taken message */}
                    {allSlotsTaken ? (
                      <div className="flex flex-col items-center justify-center text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                          <AlertCircle className="w-8 h-8 text-slate-400 mb-2" />
                          <p className="font-medium text-slate-700">
                            No available slots for this date.
                          </p>
                          <p className="text-sm text-slate-500">
                            Please select another date.
                          </p>
                        </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        {currentSlots.map((slot) => {
                          const isTaken = bookedSlots.includes(slot);
                          
                          // Check if selected date is today in PHT
                          const now = new Date();
                          const formatter = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', year: 'numeric', month: 'numeric', day: 'numeric' });
                          const parts = formatter.formatToParts(now);
                          const phtYear = parseInt(parts.find(p => p.type === 'year')?.value || '0', 10);
                          const phtMonth = parseInt(parts.find(p => p.type === 'month')?.value || '1', 10) - 1;
                          const phtDay = parseInt(parts.find(p => p.type === 'day')?.value || '1', 10);
                          
                          const isToday = selectedDate.getFullYear() === phtYear && selectedDate.getMonth() === phtMonth && selectedDate.getDate() === phtDay;
                          const isPassed = isToday && isTimeSlotPassedPHT(slot);

                          const isSelected = selectedTimeSlot === slot;

                          if (isTaken || isPassed) {
                            return (
                              <div
                                key={slot}
                                className="flex flex-col items-center justify-center py-3 px-2 rounded-lg border text-center cursor-not-allowed select-none"
                                style={{
                                  backgroundColor: "#F3F4F6",
                                  borderColor: "#E5E7EB",
                                  color: "#9CA3AF",
                                }}
                              >
                                <span className="text-sm font-medium">{slot}</span>
                                <span className="text-[10px] mt-0.5 font-semibold uppercase tracking-wide text-slate-400">
                                  {isTaken ? "Taken" : "Passed"}
                                </span>
                              </div>
                            );
                          }

                          return (
                            <button
                              key={slot}
                              onClick={() => setSelectedTimeSlot(slot)}
                              className={cn(
                                "flex flex-col items-center justify-center py-3 px-2 rounded-lg text-sm font-medium transition-all duration-150 border",
                                isSelected
                                  ? "text-white shadow-md shadow-emerald-600/20"
                                  : "hover:text-white hover:shadow-md"
                              )}
                              style={
                                isSelected
                                  ? {
                                      backgroundColor: "#16a34a",
                                      borderColor: "#16a34a",
                                      color: "white",
                                    }
                                  : {
                                      backgroundColor: "white",
                                      borderColor: "#16a34a",
                                      color: "#16a34a",
                                      borderWidth: "1.5px",
                                    }
                              }
                              onMouseEnter={(e) => {
                                if (!isSelected) {
                                  const el = e.currentTarget;
                                  el.style.backgroundColor = "#16a34a";
                                  el.style.color = "white";
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isSelected) {
                                  const el = e.currentTarget;
                                  el.style.backgroundColor = "white";
                                  el.style.color = "#16a34a";
                                }
                              }}
                            >
                              {slot}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between pt-6 border-t border-slate-100">
            <Button
              variant="outline"
              onClick={handleBack}
              className="text-slate-600"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <Button
              onClick={handleNext}
              disabled={!selectedDate || !selectedTimeSlot}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Review & Confirm <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* ── STEP 3: Confirm ─────────────────────────────────────────────────── */}
      {step === 3 && (
        <Card className="border-slate-200 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-emerald-400 to-emerald-600" />
          <CardHeader className="bg-slate-50/50 pb-6 border-b border-slate-100">
            <CardTitle className="text-2xl">Confirm Appointment</CardTitle>
            <CardDescription>
              Please review your details before submitting.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-2 gap-8">

              {/* Appointment Summary */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-emerald-600" />{" "}
                    Appointment Details
                  </h3>
                  <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-5 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-medium text-emerald-800/70 mb-1">
                          Service
                        </p>
                        <p className="font-semibold text-emerald-950 text-lg">
                          {selectedService}
                        </p>
                      </div>
                      <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-emerald-600">
                        {(() => {
                          const Icon =
                            DEFAULT_SERVICES_ICONS[selectedServiceName] || Activity;
                          return <Icon className="w-5 h-5" />;
                        })()}
                      </div>
                    </div>

                    <div className="h-px bg-emerald-200/50" />

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-emerald-800/70 mb-1">
                          Date
                        </p>
                        <p className="font-semibold text-emerald-950">
                          {selectedDate
                            ? format(selectedDate, "MMMM d, yyyy")
                            : ""}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-emerald-800/70 mb-1">
                          Time
                        </p>
                        <p className="font-semibold text-emerald-950">
                          {selectedTimeSlot}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-slate-500" /> Notes
                    (Optional)
                  </h3>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    maxLength={300}
                    placeholder="Describe your concern or reason for visit..."
                    className="w-full min-h-[100px] p-3 text-sm rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none transition-colors"
                  />
                  <p className="text-xs text-slate-400 mt-2 text-right">
                    {notes.length}/300
                  </p>
                </div>
              </div>

              {/* Patient Info */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <User className="w-4 h-4 text-emerald-600" /> Patient
                  Information
                </h3>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 space-y-4">
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1">
                      Patient
                    </p>
                    <p className="font-semibold text-slate-900">
                      {selectedSubProfileId
                        ? (() => {
                            const sp = subProfiles.find((p) => p.id === selectedSubProfileId);
                            return sp ? `${sp.firstName} ${sp.lastName} (${sp.relationship})` : patientInfo.name;
                          })()
                        : patientInfo.name + " (Myself)"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1">
                      Phone Number
                    </p>
                    <p className="font-medium text-slate-700 flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />{" "}
                      {patientInfo.phone}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200/60 mt-2">
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-1">
                        Date of Birth
                      </p>
                      <p className="font-medium text-slate-700">
                        {patientInfo.dob}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-1">
                        Gender
                      </p>
                      <p className="font-medium text-slate-700">
                        {patientInfo.gender}
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-xs mt-4 leading-relaxed bg-blue-50 text-blue-800 p-3 rounded-lg border border-blue-100">
                  <strong className="font-semibold">Note:</strong> Make sure
                  your details are correct. To update your profile information,
                  please contact the front desk during your visit.
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row gap-3 justify-between p-6 bg-slate-50/50 border-t border-slate-100">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={isSubmitting}
              className="w-full sm:w-auto text-slate-600 bg-white"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Back to Date & Time
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 h-11 px-8 text-base font-semibold"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  Confirm Appointment
                </span>
              )}
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
