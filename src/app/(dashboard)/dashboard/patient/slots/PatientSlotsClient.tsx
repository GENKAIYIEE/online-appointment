"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths, 
  isToday 
} from "date-fns";
import { CalendarClock, Lock, ChevronLeft, ChevronRight, X, ArrowRight } from "lucide-react";
import { getMonthlySlotSummary, getPatientDaySlotDetail, DaySummary, SlotDetail } from "@/actions/slots-management";
import { toast } from "sonner";
import { cn, isTimeSlotPassedPHT } from "@/lib/utils";

type Service = {
  id: string;
  name: string;
  doctor_name: string;
};

export function PatientSlotsClient({ services }: { services: Service[] }) {
  const router = useRouter();
  const [selectedServiceId, setSelectedServiceId] = useState(services[0]?.id || "");
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const [summaryData, setSummaryData] = useState<DaySummary[]>([]);
  const [isFetchingMonth, setIsFetchingMonth] = useState(false);

  // Day detail panel state
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dayDetails, setDayDetails] = useState<SlotDetail[]>([]);
  const [isFetchingDay, setIsFetchingDay] = useState(false);

  const fetchMonthData = useCallback(async (isBackground = false) => {
    if (!selectedServiceId) return;
    if (!isBackground) setIsFetchingMonth(true);
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const data = await getMonthlySlotSummary(year, month, selectedServiceId);
      setSummaryData(data);
    } catch {
      if (!isBackground) toast.error("Failed to load calendar data.");
    } finally {
      if (!isBackground) setIsFetchingMonth(false);
    }
  }, [currentMonth, selectedServiceId]);

  useEffect(() => {
    fetchMonthData();
    const interval = setInterval(() => {
      fetchMonthData(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchMonthData]);

  const fetchDayData = useCallback(async (date: Date, isBackground = false) => {
    if (!selectedServiceId) return;
    if (!isBackground) setIsFetchingDay(true);
    try {
      // Helper to get local date string YYYY-MM-DD
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateString = `${y}-${m}-${day}`;
      
      const data = await getPatientDaySlotDetail(dateString, selectedServiceId);
      setDayDetails(data);
    } catch {
      if (!isBackground) toast.error("Failed to load day details.");
    } finally {
      if (!isBackground) setIsFetchingDay(false);
    }
  }, [selectedServiceId]);

  useEffect(() => {
    if (selectedDate) {
      fetchDayData(selectedDate);
    }
    const interval = setInterval(() => {
      if (selectedDate) fetchDayData(selectedDate, true);
    }, 10000);
    return () => clearInterval(interval);
  }, [selectedDate, fetchDayData]);

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const handleToday = () => setCurrentMonth(startOfMonth(new Date()));

  const handleDayClick = (day: Date) => {
    const dayOfWeek = day.getDay();
    const serviceName = services.find(s => s.id === selectedServiceId)?.name;
    const isUltrasound = serviceName === "Ultrasound";
    const isClosed = isUltrasound 
      ? dayOfWeek !== 4 
      : (dayOfWeek === 0 || dayOfWeek === 6);
      
    const isPast = day < new Date(new Date().setHours(0,0,0,0));
    
    if (isClosed || isPast) return;
    setSelectedDate(day);
  };

  const handleBookSlot = (timeSlot: string) => {
    if (!selectedDate || !selectedServiceId) return;
    const selectedServiceName = services.find(s => s.id === selectedServiceId)?.name;
    if (!selectedServiceName) return;
    
    const y = selectedDate.getFullYear();
    const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const dateString = `${y}-${m}-${day}`;

    // Redirect to book with URL params
    const searchParams = new URLSearchParams({
      date: dateString,
      service: selectedServiceName
    });
    router.push(`/dashboard/patient/book?${searchParams.toString()}`);
  };

  // Build calendar grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const dateFormat = "d";
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const selectedServiceName = services.find(s => s.id === selectedServiceId)?.name || "";

  return (
    <div className="relative animate-in fade-in duration-500 pb-[32px]">
      {/* MAIN CONTENT AREA */}
      <div className="w-full transition-all duration-300 flex flex-col">
        {/* HEADER */}
        <div className="mb-6 flex-shrink-0">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 tracking-tight">
            Available Slots
          </h1>
          <p className="text-slate-500 mt-1">View available appointment slots before booking.</p>
        </div>

        {/* TOP FILTERS BAR */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4 mb-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full justify-between">
            <select 
              value={selectedServiceId} 
              onChange={(e) => {
                setSelectedServiceId(e.target.value);
                setSelectedDate(null);
              }} 
              className="w-full sm:w-56 px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all font-medium text-slate-700 bg-white"
            >
              {services.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
            </select>
            
            <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-1 flex-1 sm:flex-initial justify-between sm:justify-start">
                <button 
                  onClick={handlePrevMonth} 
                  disabled={isSameMonth(currentMonth, new Date())}
                  className="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="px-2 text-center font-semibold text-slate-800 text-sm min-w-[110px]">
                  {format(currentMonth, "MMMM yyyy")}
                </div>
                <button onClick={handleNextMonth} className="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-600">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              
              <button 
                onClick={handleToday}
                className="px-3.5 py-2 bg-white border border-[#16a34a] text-[#16a34a] text-sm font-semibold rounded-lg hover:bg-green-50 transition-colors shrink-0"
              >
                Today
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 text-xs font-medium text-slate-600 w-full overflow-x-auto no-scrollbar whitespace-nowrap pt-3 border-t border-slate-100">
            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100 shrink-0"><div className="w-2 h-2 rounded-full bg-[#16a34a]" /> Available</div>
            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100 shrink-0"><div className="w-2 h-2 rounded-full bg-[#D97706]" /> Partially Booked</div>
            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100 shrink-0"><div className="w-2 h-2 rounded-full bg-[#EF4444]" /> Fully Booked</div>
            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100 shrink-0"><div className="w-2 h-2 rounded-full bg-[#D1D5DB]" /> Closed</div>
          </div>
        </div>

        {/* CALENDAR CANVAS */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto w-full">
            <div className="min-w-[600px] sm:min-w-0">
              <div className="grid grid-cols-7 border-b border-[#E5E7EB] bg-[#F9FAFB]">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                  <div key={day} className="py-3 text-center text-[13px] font-semibold text-[#6B7280] uppercase tracking-wider border-r border-[#E5E7EB] last:border-r-0">
                    {day}
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 auto-rows-fr">
                {calendarDays.map((day, idx) => {
                  const y = day.getFullYear();
                  const m = String(day.getMonth() + 1).padStart(2, '0');
                  const d = String(day.getDate()).padStart(2, '0');
                  const dateStr = `${y}-${m}-${d}`;

                  const isCurrentMonth = isSameMonth(day, monthStart);
                  const isTodayDate = isToday(day);
                  const dayOfWeek = day.getDay();
                  
                  const isUltrasound = selectedServiceName === "Ultrasound";
                  const isClosed = isUltrasound 
                    ? dayOfWeek !== 4 
                    : (dayOfWeek === 0 || dayOfWeek === 6);
                    
                  const isPast = day < new Date(new Date().setHours(0,0,0,0));
                  
                  const dayData = summaryData.find(d => d.date === dateStr);
                  
                  // Determine cell styling
                  let cellBg = "bg-white";
                  let content = null;
                  let isClosedStyle = false;

                  if (!isCurrentMonth) {
                    cellBg = "bg-slate-50/50";
                  } else if (isPast || isClosed) {
                    isClosedStyle = true;
                    cellBg = "bg-[#F9FAFB]";
                    content = <div className="text-[11px] sm:text-[12px] font-medium text-[#D1D5DB] mt-4 text-center">Closed</div>;
                  } else {
                    if (isFetchingMonth) {
                      content = <div className="w-[80%] mx-auto h-6 bg-slate-100 animate-pulse rounded-full mt-3" />;
                    } else if (dayData) {
                      const { available, total, booked, isDoctorOnLeave } = dayData;
                      
                      const isFullyBooked = available === 0 && booked === total;
                      const isUnavailable = available === 0 && booked < total;

                      if (isDoctorOnLeave) {
                        content = (
                          <div className="flex justify-center mt-3">
                            <div className="rounded-[20px] px-[8px] sm:px-[12px] py-[3px] sm:py-[4px] text-[10px] sm:text-[12px] font-medium border text-center leading-tight bg-[#FEF2F2] text-[#EF4444] border-[#FECACA]">
                              Doctor on leave
                            </div>
                          </div>
                        );
                      } else {
                        content = (
                          <div className="flex justify-center mt-3">
                            <div className={cn(
                              "rounded-[20px] px-[8px] sm:px-[12px] py-[3px] sm:py-[4px] text-[10px] sm:text-[12px] font-medium border text-center leading-tight",
                              isFullyBooked 
                                ? "bg-[#FEF2F2] text-[#EF4444] border-[#FECACA]" 
                                : isUnavailable
                                  ? "bg-slate-100 text-slate-500 border-slate-200"
                                  : available === total
                                    ? "bg-[#F0FDF4] text-[#16a34a] border-[#bbf7d0]"
                                    : "bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]"
                            )}>
                              {isFullyBooked 
                                ? "Fully Booked" 
                                : isUnavailable
                                  ? "Closed"
                                  : `${available} / ${total} available`}
                            </div>
                          </div>
                        );
                      }
                    } else {
                       content = (
                        <div className="flex justify-center mt-3">
                          <div className="rounded-[20px] px-[8px] sm:px-[12px] py-[3px] sm:py-[4px] text-[10px] sm:text-[12px] font-medium text-[#9CA3AF]">
                            18 / 18 available
                          </div>
                        </div>
                       );
                    }
                  }

              return (
                <div 
                  key={day.toString()}
                  onClick={() => { if(!isClosedStyle) handleDayClick(day); }}
                  className={cn(
                    "border-r border-b border-[#E5E7EB] last:border-r-0 relative p-3 min-h-[120px] transition-colors",
                    cellBg,
                    isPast && "opacity-60",
                    !isClosedStyle && isCurrentMonth && "hover:bg-[#F9FAFB] cursor-pointer",
                    isTodayDate && "border-l-[3px] border-l-[#16a34a]"
                  )}
                >
                  <div className="flex justify-start">
                    <span className={cn(
                      "text-[14px] font-semibold w-7 h-7 flex items-center justify-center rounded-full",
                      isTodayDate ? "bg-[#16a34a] text-white" : isClosedStyle ? "text-[#9CA3AF]" : "text-[#111827]"
                    )}>
                      {format(day, dateFormat)}
                    </span>
                  </div>
                  {content}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  </div>

      {/* BACKDROP */}
      {selectedDate && (
        <div 
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity" 
          onClick={() => setSelectedDate(null)} 
        />
      )}

      {/* DAY DETAIL PANEL */}
      <div 
        className={cn(
          "fixed right-0 top-0 bottom-0 w-full sm:w-[380px] bg-white border-l border-slate-200 shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col z-50",
          selectedDate ? "translate-x-0" : "translate-x-full"
        )}
      >
        {selectedDate && (
          <>
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{format(selectedDate, "EEEE, MMMM d, yyyy")}</h2>
                <p className="text-sm text-slate-500 font-medium">{selectedServiceName}</p>
              </div>
              <button 
                onClick={() => setSelectedDate(null)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {isFetchingDay ? (
                <div className="space-y-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-14 bg-slate-100 animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    {(() => {
                      const now = new Date();
                      const formatter = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', year: 'numeric', month: 'numeric', day: 'numeric' });
                      const parts = formatter.formatToParts(now);
                      const phtYear = parseInt(parts.find(p => p.type === 'year')?.value || '0', 10);
                      const phtMonth = parseInt(parts.find(p => p.type === 'month')?.value || '1', 10) - 1;
                      const phtDay = parseInt(parts.find(p => p.type === 'day')?.value || '1', 10);
                      
                      const isTodayPHT = selectedDate?.getFullYear() === phtYear && selectedDate?.getMonth() === phtMonth && selectedDate?.getDate() === phtDay;

                      return dayDetails.map((slot, i) => {
                        const isPassed = isTodayPHT && isTimeSlotPassedPHT(slot.time_slot);
                        const displayStatus = isPassed && slot.status === "Available" ? "Passed" : slot.status;

                        return (
                          <div
                            key={i}
                            className={cn(
                              "relative flex flex-col justify-center p-3 rounded-[8px] border-[1px] transition-all group text-left",
                              displayStatus === "Available" && "border-green-200 bg-white hover:border-green-400 hover:bg-green-50",
                              displayStatus === "Passed" && "border-slate-200 bg-slate-50 opacity-60",
                              displayStatus === "Booked" && "border-slate-200 bg-slate-100 opacity-90",
                              displayStatus === "Disabled" && "border-slate-200 bg-slate-100 opacity-90"
                            )}
                          >
                            <div className={cn("font-bold text-[14px]", (displayStatus === "Disabled" || displayStatus === "Booked") ? "text-slate-500" : displayStatus === "Passed" ? "text-slate-500" : "text-green-700")}>
                              {slot.time_slot}
                            </div>
                            
                            {displayStatus === "Available" && (
                              <button 
                                onClick={() => handleBookSlot(slot.time_slot)}
                                className="absolute inset-0 bg-green-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-md font-semibold text-xs gap-1 cursor-pointer"
                              >
                                Book <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                            
                            {displayStatus === "Passed" && (
                              <div className="mt-0.5 text-[12px] font-medium text-slate-500">
                                Passed
                              </div>
                            )}

                            {displayStatus === "Booked" && (
                              <div className="mt-0.5 text-[12px] font-medium truncate flex items-center gap-1 w-full text-slate-600">
                                <Lock className="w-3 h-3 shrink-0" /> Booked
                              </div>
                            )}
                            
                            {displayStatus === "Disabled" && (
                              <div className="mt-0.5 text-[12px] font-medium text-slate-600 flex items-center gap-1">
                                <Lock className="w-3 h-3 shrink-0" /> Unavailable
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>

                  {dayDetails.length > 0 && (() => {
                    const now = new Date();
                    const formatter = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', year: 'numeric', month: 'numeric', day: 'numeric' });
                    const parts = formatter.formatToParts(now);
                    const phtYear = parseInt(parts.find(p => p.type === 'year')?.value || '0', 10);
                    const phtMonth = parseInt(parts.find(p => p.type === 'month')?.value || '1', 10) - 1;
                    const phtDay = parseInt(parts.find(p => p.type === 'day')?.value || '1', 10);
                    
                    const isTodayPHT = selectedDate?.getFullYear() === phtYear && selectedDate?.getMonth() === phtMonth && selectedDate?.getDate() === phtDay;
                    
                    const availableSlots = dayDetails.filter(d => d.status === "Available" && (!isTodayPHT || !isTimeSlotPassedPHT(d.time_slot))).length;

                    return (
                      <div className="mt-6 pt-4 border-t border-slate-100 text-center text-sm font-medium text-slate-500 bg-slate-50 rounded-lg p-3">
                        <span className="text-green-600">{availableSlots} available</span>
                        <span className="mx-2">·</span>
                        <span className="text-slate-700">{dayDetails.filter(d => d.status === "Booked" || d.status === "Disabled").length} booked/unavailable</span>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
