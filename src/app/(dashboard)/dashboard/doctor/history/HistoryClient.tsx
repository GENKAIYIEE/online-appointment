"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Filter, CalendarDays, User, FileText, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { formatDatePHT } from "@/lib/utils";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export function HistoryClient({ services }: { services: any[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [startDate, setStartDate] = useState(searchParams.get("startDate") || "");
  const [endDate, setEndDate] = useState(searchParams.get("endDate") || "");
  const [service, setService] = useState(searchParams.get("service") || "");
  const [type, setType] = useState(searchParams.get("type") || "ALL");
  const [page, setPage] = useState(parseInt(searchParams.get("page") || "1", 10));

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [items, setItems] = useState<any[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (currentPage: number = 1, isBackground = false) => {
    if (!isBackground) setIsLoading(true);
    if (!isBackground) setError(null);
    try {
      const params = new URLSearchParams(searchParams.toString());
      params.set("limit", "10");
      params.set("page", currentPage.toString());
      
      const res = await fetch(`/api/doctor/history?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch history");
      
      const result = await res.json();
      
      setItems(result.data);
      setTotalPages(result.totalPages);
      setTotalItems(result.total);
      setPage(result.page);
    } catch (err: any) {
      if (!isBackground) setError(err.message || "An error occurred while fetching history.");
    } finally {
      if (!isBackground) setIsLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    setItems([]);
    fetchData(page);
    
    // Background polling (only if we are on the first page)
    const interval = setInterval(() => {
      if (page === 1) {
        fetchData(1, true);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchData, page]);

  const handleApplyFilters = () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (service) params.set("service", service);
    if (type && type !== "ALL") params.set("type", type);

    router.push(`/dashboard/doctor/history?${params.toString()}`);
  };

  const handleClearFilters = () => {
    setSearch(""); setStartDate(""); setEndDate(""); setService(""); setType("ALL"); setPage(1);
    router.push(`/dashboard/doctor/history`);
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams(searchParams.toString());
      // The export API handles fetching all without pagination limits
      const res = await fetch(`/api/doctor/history/export?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch export data");
      const exportData = await res.json();

      if (exportData.length === 0) {
        alert("No records to export based on current filters.");
        setIsExporting(false);
        return;
      }

      const doc = new jsPDF();
      
      // Load Logo
      const img = new Image();
      img.src = '/rhu1.png';
      await new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve; // Continue even if logo fails
      });

      // Add Logo (x: 14, y: 10, width: 20, height: 20)
      if (img.width > 0) {
        doc.addImage(img, 'PNG', 14, 10, 20, 20);
      }

      // Header Texts
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("RURAL HEALTH UNIT - AGOO", 38, 18);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Agoo, La Union, Philippines", 38, 23);
      
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Consultation History Report", 14, 40);
      
      // Metadata
      const displayedService = service || (exportData.length > 0 ? exportData[0].service : "All Services");
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80);
      doc.text(`Service: ${displayedService}`, 14, 47);
      doc.text(`Generated on: ${format(new Date(), "MMM d, yyyy h:mm a")}`, 14, 52);
      doc.text(`Total Records: ${exportData.length}`, 14, 57);

      const tableColumn = ["Date", "Patient Name", "Type", "Diagnosis", "Follow-up"];
      const tableRows: string[][] = [];

      exportData.forEach((item: any) => {
        const isWalkIn = item.type === "WALK_IN";
        const patientName = isWalkIn ? item.walkInPatient?.fullName : item.user?.name;
        const cons = item.consultation;
        const dateStr = formatDatePHT(item.created_at, "MMM d, yyyy");
        const followUpStr = cons?.followUpDate ? formatDatePHT(cons.followUpDate, "MMM d, yyyy") : "N/A";
        
        tableRows.push([
          dateStr,
          patientName || "Unknown",
          item.type.replace("_", "-"),
          cons?.diagnosis || "N/A",
          followUpStr
        ]);
      });

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 65,
        theme: "grid",
        styles: { fontSize: 9 },
        headStyles: { fillColor: [22, 163, 74] }, // Tailwind green-600
      });

      doc.save(`Consultation_History_${format(new Date(), "yyyyMMdd")}.pdf`);
    } catch (err: any) {
      alert("Failed to export PDF: " + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const getAge = (birthday?: Date | string | null) => {
    if (!birthday) return "N/A";
    const b = new Date(birthday);
    const ageDifMs = Date.now() - b.getTime();
    const ageDate = new Date(ageDifMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 tracking-tight">
          Consultation History
        </h1>
        <p className="text-slate-500 mt-1">
          Review all your completed consultations.
        </p>
      </div>

      {/* FILTERS */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <h3 className="font-semibold text-slate-700 text-sm">Filter History</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search patient name..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-md text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500" 
            />
          </div>
          <div>
            <input 
              type="date" 
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500" 
            />
          </div>
          <div>
            <input 
              type="date" 
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500" 
            />
          </div>
          <div>
            <select 
              value={service}
              onChange={e => setService(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 bg-white"
            >
              <option value="">All Services</option>
              {services.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <select 
              value={type}
              onChange={e => setType(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 bg-white"
            >
              <option value="ALL">All Types</option>
              <option value="ONLINE">Online</option>
              <option value="WALK_IN">Walk-in</option>
            </select>
          </div>
        </div>
        <div className="flex justify-between items-center pt-2">
          <button 
            onClick={handleExportPDF} 
            disabled={isExporting || items.length === 0}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 bg-white rounded-md text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4 text-green-600" />}
            {isExporting ? "Exporting..." : "Export to PDF"}
          </button>
          
          <div className="flex gap-3">
            <button onClick={handleClearFilters} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-md text-sm font-medium hover:bg-slate-50 transition-colors">
              Clear Filters
            </button>
            <button onClick={handleApplyFilters} className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 transition-colors">
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* LIST */}
      <div className="space-y-4">
        {isLoading && items.length === 0 ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-12 text-center text-slate-500">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p>No consultation history found matching your filters.</p>
          </div>
        ) : (
          items.map(item => {
            const isWalkIn = item.type === "WALK_IN";
            const patientName = isWalkIn ? item.walkInPatient?.fullName : item.user?.name;
            const age = isWalkIn ? item.walkInPatient?.age : getAge(item.user?.birthday);
            const isExpanded = expandedId === item.id;
            const cons = item.consultation;

            return (
              <div key={item.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all">
                {/* Header / Summary */}
                <div 
                  className={`p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 cursor-pointer hover:bg-slate-50 transition-colors ${isExpanded ? "bg-slate-50 border-b border-slate-100" : ""}`}
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center shrink-0">
                      <User className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-lg">
                        {patientName} <span className="text-sm font-normal text-slate-500">({age} yrs)</span>
                      </h4>
                      <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                        <span className="flex items-center gap-1.5"><CalendarDays className="w-4 h-4 text-slate-400" /> {formatDatePHT(item.created_at, "MMM d, yyyy")} • {item.time_slot}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          item.type === "ONLINE" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
                        }`}>
                          {item.type.replace("_", "-")}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col md:items-end w-full md:w-auto gap-2">
                    <div className="text-sm">
                      <span className="text-slate-500">Diagnosis:</span> <span className="font-medium text-slate-800">{cons?.diagnosis ? (cons.diagnosis.length > 30 ? cons.diagnosis.substring(0,30) + "..." : cons.diagnosis) : "N/A"}</span>
                    </div>
                    <button className="text-green-600 text-sm font-medium flex items-center gap-1 hover:text-green-700">
                      {isExpanded ? <><ChevronUp className="w-4 h-4" /> Hide Details</> : <><ChevronDown className="w-4 h-4" /> View Details</>}
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && cons && (
                  <div className="p-6 bg-white animate-in slide-in-from-top-2 duration-300">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Left: Vitals & Notes */}
                      <div className="space-y-6">
                        <div>
                          <h5 className="font-semibold text-slate-800 mb-3 border-b border-slate-100 pb-2">Vital Signs</h5>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div><span className="text-slate-500 block">BP (mmHg)</span><span className="font-medium">{cons.vitalSigns?.bloodPressure || "—"}</span></div>
                            <div><span className="text-slate-500 block">Temp (°C)</span><span className="font-medium">{cons.vitalSigns?.temperature || "—"}</span></div>
                            <div><span className="text-slate-500 block">HR (bpm)</span><span className="font-medium">{cons.vitalSigns?.heartRate || "—"}</span></div>
                            <div><span className="text-slate-500 block">Weight (kg)</span><span className="font-medium">{cons.vitalSigns?.weight || "—"}</span></div>
                          </div>
                        </div>

                        <div>
                          <h5 className="font-semibold text-slate-800 mb-3 border-b border-slate-100 pb-2">Consultation Notes</h5>
                          <div className="space-y-4 text-sm">
                            <div>
                              <span className="text-slate-500 block mb-1">Chief Complaint</span>
                              <div className="p-3 bg-slate-50 rounded border border-slate-100 whitespace-pre-wrap">{cons.chiefComplaint}</div>
                            </div>
                            <div>
                              <span className="text-slate-500 block mb-1">Diagnosis</span>
                              <div className="p-3 bg-slate-50 rounded border border-slate-100 whitespace-pre-wrap font-medium">{cons.diagnosis}</div>
                            </div>
                            {cons.prescriptionNotes && (
                              <div>
                                <span className="text-slate-500 block mb-1">Prescription Notes</span>
                                <div className="p-3 bg-slate-50 rounded border border-slate-100 whitespace-pre-wrap">{cons.prescriptionNotes}</div>
                              </div>
                            )}
                            {cons.followUpDate && (
                              <div>
                                <span className="text-slate-500 block mb-1">Follow-up Date</span>
                                <span className="font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded">{formatDatePHT(cons.followUpDate, "MMM d, yyyy")}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Patient Background */}
                      <div>
                        <h5 className="font-semibold text-slate-800 mb-3 border-b border-slate-100 pb-2">Patient Background</h5>
                        {isWalkIn ? (
                          <div className="text-sm space-y-2">
                            <p className="text-slate-500 italic mb-4">Walk-in patient. Hard copy ITR is available in records.</p>
                            <div><span className="text-slate-500 w-24 inline-block">Sex:</span> <span className="font-medium">{item.walkInPatient?.sex}</span></div>
                            <div><span className="text-slate-500 w-24 inline-block">Contact:</span> <span className="font-medium">{item.walkInPatient?.contactNumber}</span></div>
                            <div><span className="text-slate-500 w-24 inline-block">Address:</span> <span className="font-medium">{item.walkInPatient?.address}</span></div>
                          </div>
                        ) : (
                          <div className="text-sm space-y-4">
                            <div className="space-y-2">
                              <div><span className="text-slate-500 w-24 inline-block">Sex:</span> <span className="font-medium">{item.user?.gender || "—"}</span></div>
                              <div><span className="text-slate-500 w-24 inline-block">Contact:</span> <span className="font-medium">{item.user?.phone || "—"}</span></div>
                            </div>
                            {item.user?.itr ? (
                              <div className="space-y-3 mt-4 border-t border-slate-100 pt-4">
                                <div><span className="text-slate-500 block">Past Medical History</span> <span className="font-medium">{item.user.itr.pastMedicalOthers || "None"}</span></div>
                                <div><span className="text-slate-500 block">Allergies</span> <span className="font-medium">{item.user.itr.allergiesSpec || "None"}</span></div>
                                <div><span className="text-slate-500 block">Family History</span> <span className="font-medium">{item.user.itr.familyHistoryOthers || "None"}</span></div>
                              </div>
                            ) : (
                              <p className="text-slate-500 italic mt-4 border-t border-slate-100 pt-4">No ITR completed yet.</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm text-center my-4">
            {error}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-between items-center pt-6 pb-4">
            <span className="text-sm text-slate-500">
              Showing page {page} of {totalPages} ({totalItems} total)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || isLoading}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-md text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                Previous
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                  // Only show current, first, last, and neighbors
                  if (
                    p === 1 || 
                    p === totalPages || 
                    (p >= page - 1 && p <= page + 1)
                  ) {
                    return (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        disabled={isLoading}
                        className={`w-9 h-9 flex items-center justify-center rounded-md text-sm font-medium transition-colors ${
                          page === p 
                            ? "bg-green-600 text-white shadow-sm" 
                            : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {p}
                      </button>
                    );
                  } else if (
                    p === page - 2 || 
                    p === page + 2
                  ) {
                    return <span key={p} className="text-slate-400 px-1">...</span>;
                  }
                  return null;
                })}
              </div>

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || isLoading}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-md text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
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
