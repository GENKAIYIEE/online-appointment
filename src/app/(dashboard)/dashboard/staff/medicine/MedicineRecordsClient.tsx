"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Plus, Search, Edit2, Trash2, X, AlertTriangle, Pill, Download } from "lucide-react";
import { toast } from "sonner";
import { exportMedicineRecordsToPDF } from "@/lib/exportPdf";
import {
  createMedicineRecord,
  updateMedicineRecord,
  deleteMedicineRecord,
  searchPatients,
  getMedicineRecordsByPatient,
} from "@/actions/medicine";

// Types
type PatientInfo = { id: string; name: string };
type StaffInfo = { id: string; name: string };

export type MedicineRecord = {
  id: string;
  patientId: string | null;
  patient: PatientInfo | null;
  walkInName: string | null;
  medicineName: string;
  quantity: number;
  date: Date;
  reason: string | null;
  notes: string | null;
  staffId: string;
  staff: StaffInfo;
  createdAt: Date;
  updatedAt: Date;
};

export function MedicineRecordsClient({ initialRecords }: { initialRecords: MedicineRecord[] }) {
  const [records, setRecords] = useState<MedicineRecord[]>(initialRecords);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [patientSearch, setPatientSearch] = useState("");
  const [patientSearchResults, setPatientSearchResults] = useState<PatientInfo[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [walkInName, setWalkInName] = useState<string>("");
  const [medicineName, setMedicineName] = useState("");
  const [quantity, setQuantity] = useState<string>("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  // Modals state
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyPatient, setHistoryPatient] = useState<PatientInfo | null>(null);
  const [historyRecords, setHistoryRecords] = useState<MedicineRecord[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Debounced search for patients
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (patientSearch.length > 2) {
        setIsSearching(true);
        const results = await searchPatients(patientSearch);
        setPatientSearchResults(results);
        setIsSearching(false);
      } else {
        setPatientSearchResults([]);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [patientSearch]);

  const openAddModal = () => {
    setEditingId(null);
    setSelectedPatientId("");
    setWalkInName("");
    setPatientSearch("");
    setMedicineName("");
    setQuantity("");
    setDate(new Date().toISOString().split("T")[0]);
    setReason("");
    setNotes("");
    setErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (record: MedicineRecord) => {
    setEditingId(record.id);
    if (record.patientId && record.patient) {
      setSelectedPatientId(record.patientId);
      setPatientSearch(record.patient.name);
      setWalkInName("");
    } else {
      setSelectedPatientId("");
      setPatientSearch("");
      setWalkInName(record.walkInName || "");
    }
    setMedicineName(record.medicineName);
    setQuantity(record.quantity.toString());
    setDate(new Date(record.date).toISOString().split("T")[0]);
    setReason(record.reason || "");
    setNotes(record.notes || "");
    setErrors({});
    setIsModalOpen(true);
  };

  const validateForm = () => {
    const e: Record<string, string> = {};
    if (!selectedPatientId && !walkInName.trim()) e.patient = "Please select a registered patient or enter a walk-in name.";
    if (!medicineName.trim()) e.medicineName = "Medicine name is required.";
    if (!quantity || isNaN(Number(quantity)) || Number(quantity) <= 0) e.quantity = "Valid quantity is required.";
    if (!date) e.date = "Date is required.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    const payload = {
      patientId: selectedPatientId || undefined,
      walkInName: walkInName || undefined,
      medicineName,
      quantity: Number(quantity),
      date,
      reason,
      notes,
    };

    if (editingId) {
      const res = await updateMedicineRecord(editingId, payload);
      if (res.success) {
        toast.success("Medicine record updated.");
        setIsModalOpen(false);
        // Soft refresh the UI state for speed, assuming server revalidate path will catch up
        setRecords(prev => prev.map(r => r.id === editingId ? {
          ...r,
          ...payload,
          date: new Date(payload.date),
          patientId: payload.patientId || null,
          walkInName: payload.walkInName || null,
          patient: payload.patientId && patientSearchResults.find(p => p.id === payload.patientId) 
            ? patientSearchResults.find(p => p.id === payload.patientId) || r.patient 
            : null
        } as MedicineRecord : r));
      } else {
        toast.error(res.error || "Failed to update record.");
      }
    } else {
      const res = await createMedicineRecord(payload);
      if (res.success) {
        toast.success("Medicine record added.");
        setIsModalOpen(false);
        // Force page reload to fetch new data from server component if we don't return full record
        window.location.reload();
      } else {
        toast.error(res.error || "Failed to create record.");
      }
    }
    setIsSubmitting(false);
  };

  const openHistory = async (patient: PatientInfo) => {
    setHistoryPatient(patient);
    setHistoryModalOpen(true);
    setIsHistoryLoading(true);
    const res = await getMedicineRecordsByPatient(patient.id);
    if (res.success && res.records) {
      setHistoryRecords(res.records as MedicineRecord[]);
    } else {
      toast.error("Failed to load patient history.");
    }
    setIsHistoryLoading(false);
  };

  const confirmDelete = (id: string) => {
    setRecordToDelete(id);
    setDeletePassword("");
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!recordToDelete) return;
    if (!deletePassword) {
      toast.error("Password is required.");
      return;
    }

    setIsDeleting(true);
    const res = await deleteMedicineRecord(recordToDelete, deletePassword);
    setIsDeleting(false);

    if (res.success) {
      toast.success("Record deleted successfully.");
      setDeleteModalOpen(false);
      setRecords(prev => prev.filter(r => r.id !== recordToDelete));
      if (historyModalOpen) {
        setHistoryRecords(prev => prev.filter(r => r.id !== recordToDelete));
      }
    } else {
      toast.error(res.error || "Failed to delete record.");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 tracking-tight">
            Medicine Records
          </h1>
          <p className="text-slate-500 mt-1">
            Log standalone medicine handouts for walk-ins and patients.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (records.length > 0) {
                exportMedicineRecordsToPDF(records);
              }
            }}
            disabled={records.length === 0}
            className="flex items-center gap-2 px-4 py-2 border border-green-200 text-green-700 rounded-lg shadow-sm font-medium hover:bg-green-50 transition-all disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span className="text-sm">Export PDF</span>
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span className="font-medium text-sm">Add Record</span>
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Patient</th>
                <th className="px-6 py-4 font-medium">Medicine</th>
                <th className="px-6 py-4 font-medium text-center">Quantity</th>
                <th className="px-6 py-4 font-medium">Staff</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No medicine records found.
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                      {format(new Date(record.date), "MMM d, yyyy")}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {record.patient ? (
                        <button 
                          onClick={() => openHistory(record.patient!)}
                          className="text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-1.5"
                          title="View history"
                        >
                          {record.patient.name}
                        </button>
                      ) : (
                        <span className="text-slate-600">
                          {record.walkInName} <span className="text-xs text-slate-400 font-normal ml-1">(Walk-in)</span>
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-800">
                      <div className="flex items-center gap-2">
                        <Pill className="w-3.5 h-3.5 text-slate-400" />
                        {record.medicineName}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                        {record.quantity}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {record.staff.name}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEditModal(record)}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                          title="Edit Record"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => confirmDelete(record.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="Delete Record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">{editingId ? "Edit Medicine Record" : "Add Medicine Record"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-md transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div className="space-y-4 bg-slate-50/50 p-4 rounded-lg border border-slate-100">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Patient <span className="text-red-500">*</span></label>
                  
                  {/* Combobox for Registered Patient */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search registered patients..."
                      value={patientSearch}
                      onChange={(e) => {
                        setPatientSearch(e.target.value);
                        setSelectedPatientId(""); // reset selected if typing
                      }}
                      className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    
                    {patientSearchResults.length > 0 && !selectedPatientId && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                        {patientSearchResults.map(p => (
                          <div 
                            key={p.id}
                            className="px-3 py-2 text-sm hover:bg-emerald-50 cursor-pointer text-slate-700"
                            onClick={() => {
                              setSelectedPatientId(p.id);
                              setPatientSearch(p.name);
                              setPatientSearchResults([]);
                              setWalkInName("");
                            }}
                          >
                            {p.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="relative flex items-center py-2">
                    <div className="flex-grow border-t border-slate-200"></div>
                    <span className="flex-shrink-0 mx-4 text-slate-400 text-xs">or</span>
                    <div className="flex-grow border-t border-slate-200"></div>
                  </div>

                  {/* Fallback Walk-in */}
                  <input
                    type="text"
                    placeholder="Enter walk-in name (unregistered)"
                    value={walkInName}
                    onChange={(e) => {
                      setWalkInName(e.target.value);
                      setSelectedPatientId("");
                      setPatientSearch("");
                    }}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-50"
                  />
                  {errors.patient && <p className="text-xs text-red-500">{errors.patient}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2 md:col-span-1">
                  <label className="text-sm font-medium text-slate-700">Medicine Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={medicineName}
                    onChange={(e) => setMedicineName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="e.g. Paracetamol 500mg"
                  />
                  {errors.medicineName && <p className="text-xs text-red-500">{errors.medicineName}</p>}
                </div>
                <div className="space-y-1.5 col-span-1">
                  <label className="text-sm font-medium text-slate-700">Quantity <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                  {errors.quantity && <p className="text-xs text-red-500">{errors.quantity}</p>}
                </div>
                <div className="space-y-1.5 col-span-1">
                  <label className="text-sm font-medium text-slate-700">Date <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                  {errors.date && <p className="text-xs text-red-500">{errors.date}</p>}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Reason / Purpose (Optional)</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="e.g. Fever, Headache"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Notes (Optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                  placeholder="Any additional remarks"
                />
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? "Saving..." : "Save Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {historyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Medicine History</h2>
                <p className="text-sm text-slate-500">For {historyPatient?.name}</p>
              </div>
              <button onClick={() => setHistoryModalOpen(false)} className="p-1 hover:bg-slate-200 rounded-md transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1">
              {isHistoryLoading ? (
                <div className="py-12 text-center text-slate-500 text-sm">Loading history...</div>
              ) : historyRecords.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-sm">No medicine history found.</div>
              ) : (
                <div className="relative border-l-2 border-slate-200 ml-3 space-y-8 pb-4">
                  {historyRecords.map((r) => (
                    <div key={r.id} className="relative pl-6">
                      <div className="absolute w-3 h-3 bg-emerald-500 rounded-full -left-[7px] top-1.5 border-2 border-white"></div>
                      <div className="bg-white border border-slate-100 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-slate-800 text-base">{r.medicineName} <span className="text-emerald-600 text-sm ml-1">x{r.quantity}</span></h4>
                          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">
                            {format(new Date(r.date), "MMM d, yyyy")}
                          </span>
                        </div>
                        {r.reason && (
                          <div className="text-sm text-slate-600 mb-1">
                            <span className="font-medium text-slate-500">Reason:</span> {r.reason}
                          </div>
                        )}
                        {r.notes && (
                          <div className="text-sm text-slate-600">
                            <span className="font-medium text-slate-500">Notes:</span> {r.notes}
                          </div>
                        )}
                        <div className="text-xs text-slate-400 mt-3 pt-2 border-t border-slate-50">
                          Handled by {r.staff.name}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-2">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Delete Record</h3>
              <p className="text-sm text-slate-600">
                This is a permanent record. To proceed with deletion, please confirm your staff password.
              </p>
              
              <div className="text-left mt-4">
                <label className="text-xs font-medium text-slate-700 mb-1 block">Your Password</label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
                  placeholder="Enter your password"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 mt-6">
                <button
                  onClick={() => setDeleteModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting || !deletePassword}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
