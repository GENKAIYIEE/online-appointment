"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Filter, X, Loader2, ClipboardList, ChevronRight, AlertTriangle, Download } from "lucide-react";
import { formatDatePHT } from "@/lib/utils";
import { exportPatientRecordsToPDF } from "@/lib/exportPdf";
import { cn } from "@/lib/utils";

type WalkInRecord = {
  id: string;
  patientName: string;
  age: number | null;
  sex: string;
  type: string;
  service: string;
  doctor: string;
  date: string | null;
  timeSlot: string;
};

export function WalkInRecordsClient({ services }: { services: { name: string; doctor_name: string }[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Filter state — initialised from URL so page reloads restore the filter
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [startDate, setStartDate] = useState(searchParams.get("startDate") || "");
  const [endDate, setEndDate] = useState(searchParams.get("endDate") || "");
  const [service, setService] = useState(searchParams.get("service") || "");
  const [doctor, setDoctor] = useState(searchParams.get("doctor") || "");
  const [type, setType] = useState(searchParams.get("type") || "ALL");
  const [showFilters, setShowFilters] = useState(false);

  // Data state
  const [items, setItems] = useState<WalkInRecord[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(
    async () => {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams(searchParams.toString());
        params.set("limit", "10");

        const res = await fetch(`/api/staff/records?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch records");

        const result = await res.json();
        setItems(result.data);
        setCurrentPage(result.currentPage || 1);
        setTotalPages(result.totalPages || 1);
      } catch (err: any) {
        setError(err.message || "An unexpected error occurred.");
      } finally {
        setIsLoading(false);
      }
    },
    [searchParams]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleApplyFilters = () => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (service) params.set("service", service);
    if (doctor.trim()) params.set("doctor", doctor.trim());
    if (type && type !== "ALL") params.set("type", type);
    params.set("page", "1");
    router.push(`/dashboard/staff/records?${params.toString()}`);
  };

  const handleClearFilters = () => {
    setSearch(""); setStartDate(""); setEndDate(""); setService(""); setDoctor(""); setType("ALL");
    router.push("/dashboard/staff/records?page=1");
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`/dashboard/staff/records?${params.toString()}`);
  };

  const hasActiveFilters =
    !!searchParams.get("search") ||
    !!searchParams.get("startDate") ||
    !!searchParams.get("endDate") ||
    !!searchParams.get("service") ||
    !!searchParams.get("doctor") ||
    !!searchParams.get("type");

  // Unique doctor names from services for the doctor dropdown
  const doctorOptions = Array.from(
    new Set(services.map((s) => s.doctor_name).filter(Boolean))
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 tracking-tight">
            Patient Records
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Permanent record of all completed consultations. Read-only.
          </p>
        </div>
        <button
          onClick={() => {
            if (items.length > 0) {
              exportPatientRecordsToPDF(items);
            }
          }}
          disabled={isLoading || items.length === 0}
          className="flex items-center gap-2 self-start md:self-auto px-4 py-2 border border-green-200 text-green-700 rounded-md text-sm font-medium hover:bg-green-50 transition-colors disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          Export PDF
        </button>
      </div>

      {/* FILTER PANEL */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        {/* Filter toggle header */}
        <button
          onClick={() => setShowFilters((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-xl transition-colors"
        >
          <span className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            Filters
            {hasActiveFilters && (
              <span className="inline-flex items-center justify-center bg-green-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px]">
                ON
              </span>
            )}
          </span>
          <ChevronRight
            className={cn("w-4 h-4 text-slate-400 transition-transform duration-200", showFilters && "rotate-90")}
          />
        </button>

        {showFilters && (
          <div className="border-t border-slate-100 p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Name Search */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                  Patient Name
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
                    placeholder="Search by name…"
                    className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-md text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 bg-white"
                  />
                </div>
              </div>

              {/* Start Date */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                  From Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 bg-white"
                />
              </div>

              {/* End Date */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                  To Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 bg-white"
                />
              </div>

              {/* Service */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                  Service
                </label>
                <select
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 bg-white"
                >
                  <option value="">All Services</option>
                  {services.map((s) => (
                    <option key={s.name} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Doctor */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                  Doctor
                </label>
                <select
                  value={doctor}
                  onChange={(e) => setDoctor(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 bg-white"
                >
                  <option value="">All Doctors</option>
                  {doctorOptions.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              {/* Appointment Type */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                  Appointment Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 bg-white"
                >
                  <option value="ALL">All Types</option>
                  <option value="WALK_IN">Walk-in</option>
                  <option value="ONLINE">Online</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <button
                onClick={handleClearFilters}
                className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-600 rounded-md text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                <X className="w-3.5 h-3.5" /> Clear
              </button>
              <button
                onClick={handleApplyFilters}
                className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 transition-colors"
              >
                Apply Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* RECORDS TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-slate-500" />
            <h3 className="font-semibold text-slate-800 text-sm">Completed Consultations</h3>
          </div>
          {!isLoading && (
            <span className="text-xs text-slate-500">
              {items.length} record{items.length !== 1 ? "s" : ""} loaded
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Patient Name</th>
                <th className="px-4 py-3 font-medium">Age</th>
                <th className="px-4 py-3 font-medium">Sex</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Service</th>
                <th className="px-4 py-3 font-medium">Doctor</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-14 text-center">
                    <Loader2 className="w-6 h-6 text-green-500 animate-spin mx-auto mb-2" />
                    <p className="text-sm text-slate-400">Loading records…</p>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center">
                    <div className="inline-flex flex-col items-center gap-2 text-red-600">
                      <AlertTriangle className="w-6 h-6" />
                      <p className="text-sm">{error}</p>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-14 text-center text-slate-400 text-sm">
                    No completed records found
                    {hasActiveFilters ? " matching the current filters." : "."}
                  </td>
                </tr>
              ) : (
                items.map((rec, idx) => (
                  <tr key={rec.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 text-slate-400 font-mono text-xs">{idx + 1}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{rec.patientName}</td>
                    <td className="px-4 py-3 text-slate-600">{rec.age ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{rec.sex}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                          rec.type === "WALK_IN"
                            ? "bg-amber-50 text-amber-700 border border-amber-200/50"
                            : "bg-blue-50 text-blue-700 border border-blue-200/50"
                        )}
                      >
                        {rec.type === "WALK_IN" ? "Walk-in" : "Online"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{rec.service}</td>
                    <td className="px-4 py-3 text-slate-600">{rec.doctor}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {rec.date ? formatDatePHT(rec.date, "MMM d, yyyy") : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-mono text-xs">{rec.timeSlot}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION CONTROLS */}
        {totalPages > 1 && (
          <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
            <span className="text-sm text-slate-500">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1 || isLoading}
                className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-md text-sm font-medium hover:bg-white disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages || isLoading}
                className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-md text-sm font-medium hover:bg-white disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
