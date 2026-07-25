"use client";

import { useState, useCallback } from "react";
import { format } from "date-fns";
import { 
  CalendarSearch, 
  RefreshCw,
  Loader2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAppointmentsByServiceForDate } from "@/actions/staff";
import { exportServiceAppointmentsToPDF } from "@/lib/exportPdf";

interface AppointmentRow {
  id: string;
  patientName: string;
  age: number | string | null;
  sex: string;
  service: string;
  doctor: string;
  time: string;
  status: string;
  type: string;
}

interface ClientProps {
  initialDate: string;
  initialData: Record<string, AppointmentRow[]>;
}

const SERVICES = [
  "Dental Clinic",
  "Drug Testing",
  "Family Planning",
  "Adolescence Clinic",
  "Ultrasound",
];

const ALL_SERVICES = "All Services";

export function AppointmentsByServiceClient({ initialDate, initialData }: ClientProps) {
  const [date, setDate] = useState<string>(initialDate);
  const [data, setData] = useState<Record<string, AppointmentRow[]>>(initialData);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>(ALL_SERVICES);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const fetchData = useCallback(async (selectedDate: string) => {
    setLoading(true);
    try {
      const result = await getAppointmentsByServiceForDate(selectedDate);
      if (result.success && result.data) {
        setData(result.data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setDate(newDate);
    setCurrentPage(1);
    if (newDate) {
      fetchData(newDate);
    } else {
      // If cleared, just clear the data
      const empty: Record<string, AppointmentRow[]> = {};
      SERVICES.forEach(s => { empty[s] = []; });
      setData(empty);
    }
  };

  const handleRefresh = () => {
    if (date) fetchData(date);
  };

  const renderStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      CONFIRMED: "bg-green-100 text-green-700 hover:bg-green-100",
      COMPLETED: "bg-slate-100 text-slate-700 hover:bg-slate-100",
      CANCELLED: "bg-red-100 text-red-700 hover:bg-red-100",
    };
    return (
      <Badge variant="secondary" className={styles[status] || ""}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 tracking-tight">
            Appointments by Service
          </h1>
          <p className="text-slate-500 mt-1 font-medium">
            View all appointments grouped by service for any given date.
          </p>
        </div>
        <button
          onClick={() => {
            const allAppointments = activeTab === ALL_SERVICES 
              ? Object.values(data).flat() 
              : data[activeTab] || [];
              
            if (allAppointments.length > 0) {
              exportServiceAppointmentsToPDF(allAppointments, date, activeTab);
            }
          }}
          disabled={loading || (activeTab === ALL_SERVICES ? Object.values(data).flat().length === 0 : (data[activeTab] || []).length === 0)}
          className="flex items-center gap-2 self-start md:self-auto px-4 py-2 border border-indigo-200 text-indigo-700 rounded-md text-sm font-medium hover:bg-indigo-50 transition-colors disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          Export PDF
        </button>
      </div>

      {/* Date Filter & Refresh */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col sm:flex-row items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
            Select Date:
          </span>
        </div>
        <div className="relative w-full sm:w-auto flex-1 max-w-sm">
          <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="date"
            value={date}
            onChange={handleDateChange}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 transition"
          />
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading || !date}
          className="w-full sm:w-auto px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4 text-slate-400" />}
          Refresh
        </button>
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
      )}

      {/* Service Sections */}
      {!loading && (
        <div className="space-y-0">
          {/* Tabs */}
          <div className="flex px-4 gap-1 items-end overflow-x-auto no-scrollbar">
            {[ALL_SERVICES, ...SERVICES].map((serviceName) => {
              const isActive = activeTab === serviceName;
              const count = serviceName === ALL_SERVICES 
                ? Object.values(data).flat().length 
                : data[serviceName]?.length || 0;
              return (
                <button
                  key={serviceName}
                  onClick={() => {
                    setActiveTab(serviceName);
                    setCurrentPage(1);
                  }}
                  className={cn(
                    "relative flex items-center gap-2 px-5 rounded-t-xl text-sm font-semibold transition-all duration-200 border border-slate-200 -mb-[1px]",
                    isActive
                      ? "bg-white text-indigo-700 z-10 pt-3.5 pb-4 border-b-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]"
                      : "bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700 z-0 pt-2.5 pb-3 border-b-slate-200"
                  )}
                >
                  {serviceName}
                  <span className={cn(
                    "ml-1 px-2 py-0.5 rounded-full text-[11px] font-bold transition-colors", 
                    isActive ? "bg-indigo-50 text-indigo-700" : "bg-slate-200/70 text-slate-500"
                  )}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden relative z-0">
            <div className="p-0">
              {(() => {
                const serviceAppointments = activeTab === ALL_SERVICES 
                  ? Object.values(data).flat() 
                  : data[activeTab] || [];
              const count = serviceAppointments.length;
              if (count === 0) {
                return (
                  <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                    <CalendarSearch className="w-10 h-10 mb-3 opacity-30" />
                    <p className="text-sm font-medium text-slate-500">
                      {activeTab === ALL_SERVICES ? "No appointments for any service on this date." : `No appointments for ${activeTab} on this date.`}
                    </p>
                  </div>
                );
              }

              const totalPages = Math.ceil(count / PAGE_SIZE) || 1;
              const paginatedAppointments = serviceAppointments.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

              return (
                <div className="flex flex-col">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                        <tr>
                          <th className="px-4 py-3 font-medium">#</th>
                          <th className="px-4 py-3 font-medium">Patient Name</th>
                          <th className="px-4 py-3 font-medium">Age</th>
                          <th className="px-4 py-3 font-medium">Sex</th>
                          {activeTab === ALL_SERVICES && <th className="px-4 py-3 font-medium">Service</th>}
                          <th className="px-4 py-3 font-medium">Doctor</th>
                          <th className="px-4 py-3 font-medium">Time</th>
                          <th className="px-4 py-3 font-medium">Status</th>
                          <th className="px-4 py-3 font-medium">Type</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {paginatedAppointments.map((appt, idx) => (
                          <tr key={appt.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-3 text-slate-400 font-mono text-xs">{(currentPage - 1) * PAGE_SIZE + idx + 1}</td>
                            <td className="px-4 py-3 font-semibold text-slate-900">{appt.patientName}</td>
                            <td className="px-4 py-3 text-slate-600">{appt.age ?? "—"}</td>
                            <td className="px-4 py-3 text-slate-600">{appt.sex}</td>
                            {activeTab === ALL_SERVICES && (
                              <td className="px-4 py-3 text-slate-600">
                                <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs font-medium border border-slate-200">
                                  {appt.service}
                                </span>
                              </td>
                            )}
                            <td className="px-4 py-3 text-slate-600">{appt.doctor}</td>
                            <td className="px-4 py-3 text-slate-600 font-mono text-xs">{appt.time}</td>
                            <td className="px-4 py-3">
                              {renderStatusBadge(appt.status)}
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className="text-xs">
                                {appt.type}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
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
                </div>
              );
            })()}
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
