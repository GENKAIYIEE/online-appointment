"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  User,
  Stethoscope,
  Save,
  AlertTriangle,
  Heart,
  Thermometer,
  Activity,
  Wind,
  Droplets,
  Ruler,
  Weight,
  Syringe,
  FileText,
  Users,
  Scissors,
  Coffee,
  Baby,
  Info,
  ClipboardList,
} from "lucide-react";
import { saveConsultation } from "@/actions/doctor";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { formatDatePHT } from "@/lib/utils";

// ── Helpers ─────────────────────────────────────────────────────────────────

const getAge = (birthday?: Date | string | null): number | string => {
  if (!birthday) return "N/A";
  const b = new Date(birthday);
  const ageDifMs = Date.now() - b.getTime();
  const ageDate = new Date(ageDifMs);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
};

const parseJsonArray = (val: any): string[] => {
  if (!val) return [];
  if (Array.isArray(val)) return val as string[];
  try { return JSON.parse(val); } catch { return []; }
};

const fmtDate = (val: any): string => {
  if (!val) return "N/A";
  return formatDatePHT(val, "MMMM d, yyyy") || "N/A";
};

const na = (val: any): string => (val !== null && val !== undefined && String(val).trim() !== "" ? String(val) : "N/A");

// ── Sub-components ───────────────────────────────────────────────────────────

function ITRSection({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="border-b border-green-100 bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-3 flex items-center gap-2">
        {icon && <span className="text-white/80">{icon}</span>}
        <h3 className="font-semibold text-white text-sm tracking-wide">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function ITRField({ label, value, fullWidth = false }: { label: string; value: React.ReactNode; fullWidth?: boolean }) {
  return (
    <div className={fullWidth ? "col-span-2" : ""}>
      <span className="text-xs text-slate-500 uppercase tracking-wide font-medium block mb-0.5">{label}</span>
      <span className="text-sm font-medium text-slate-900">{value || <span className="text-slate-400 font-normal italic">N/A</span>}</span>
    </div>
  );
}

function GreenBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200">
      {label}
    </span>
  );
}

function YesNoBadge({ value, label }: { value: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500 w-28">{label}</span>
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
        value ? "bg-green-100 text-green-700 border border-green-200" : "bg-slate-100 text-slate-500 border border-slate-200"
      }`}>
        {value ? "Yes" : "No"}
      </span>
    </div>
  );
}

function NotProvided() {
  return <p className="text-sm text-slate-400 italic">Not provided</p>;
}

// ── ITR Sections Renderer ────────────────────────────────────────────────────

function OnlinePatientITR({ user, itr }: { user: any; itr: any }) {
  if (!itr) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-start gap-3">
        <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-amber-800 text-sm">ITR Not Yet Completed</p>
          <p className="text-sm text-amber-700 mt-1">This patient has not yet completed their Individual Treatment Record form.</p>
        </div>
      </div>
    );
  }

  const chiefComplaints = parseJsonArray(itr.chiefComplaints);
  const pastMedicalHistory = parseJsonArray(itr.pastMedicalHistory);
  const familyHistory = parseJsonArray(itr.familyHistory);
  const isFemale = (user?.gender || "").toLowerCase() === "female";
  const isDependent = (itr.memberType || "").toLowerCase() === "dependent";
  const isAboveTwoYears = (user?.birthday)
    ? (new Date().getFullYear() - new Date(user.birthday).getFullYear()) > 2
    : true;

  return (
    <div className="space-y-4">
      {/* SECTION 1: Patient Information */}
      <ITRSection title="Section 1 — Patient Information" icon={<User className="w-4 h-4" />}>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          <ITRField label="Full Name" value={na(user?.name)} fullWidth />
          <ITRField label="Age" value={`${getAge(user?.birthday)} yrs`} />
          <ITRField label="Birthday" value={fmtDate(user?.birthday)} />
          <ITRField label="Sex" value={na(user?.gender)} />
          <ITRField label="Civil Status" value={na(user?.maritalStatus)} />
          <ITRField label="Contact Number" value={na(user?.phone)} />
          <ITRField label="Address" value={na(user?.address)} fullWidth />
          <ITRField label="PhilHealth #" value={na(itr.philhealthNumber)} />
          <ITRField label="Member Type" value={na(itr.memberType)} />
          <ITRField label="Family Serial Number" value={na(itr.familySerialNumber)} />
          <ITRField label="Family Code" value={na(itr.familyCode)} />
        </div>
      </ITRSection>

      {/* SECTION 2: PhilHealth Dependent Info (conditional) */}
      {isDependent && (
        <ITRSection title="Section 2 — PhilHealth Dependent Info" icon={<Users className="w-4 h-4" />}>
          {(itr.dependentFirstName || itr.dependentLastName || itr.dependentPin) ? (
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <ITRField
                label="Member's Full Name"
                value={[itr.dependentFirstName, itr.dependentMiddleName, itr.dependentLastName].filter(Boolean).join(" ") || "N/A"}
                fullWidth
              />
              <ITRField label="Member's PIN" value={na(itr.dependentPin)} />
              <ITRField label="Member's Birthday" value={fmtDate(itr.dependentBirthday)} />
              <ITRField label="Member's Sex" value={na(itr.dependentSex)} />
              <ITRField label="Member's Marital Status" value={na(itr.dependentMaritalStatus)} />
            </div>
          ) : (
            <NotProvided />
          )}
        </ITRSection>
      )}

      {/* SECTION 3: Vital Signs */}
      <ITRSection title="Section 3 — Vital Signs" icon={<Heart className="w-4 h-4" />}>
        {(itr.bloodPressure || itr.temperature || itr.heartRate || itr.respiratoryRate ||
          itr.o2Sat || itr.heightCm || itr.weightKg || itr.bloodType) ? (
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <ITRField label="Blood Pressure (mmHg)" value={na(itr.bloodPressure)} />
            <ITRField label="Temperature (°C)" value={na(itr.temperature)} />
            <ITRField label="Heart Rate (bpm)" value={na(itr.heartRate)} />
            <ITRField label="Respiratory Rate (bpm)" value={na(itr.respiratoryRate)} />
            <ITRField label="O₂ Sat (%)" value={na(itr.o2Sat)} />
            <ITRField label="Height (cm)" value={itr.heightCm != null ? `${itr.heightCm} cm` : "N/A"} />
            <ITRField label="Weight (kg)" value={itr.weightKg != null ? `${itr.weightKg} kg` : "N/A"} />
            <ITRField label="Blood Type" value={na(itr.bloodType)} />
            {!isAboveTwoYears && (
              <ITRField label="MUAC" value={itr.muac != null ? `${itr.muac} cm` : "N/A"} />
            )}
          </div>
        ) : (
          <NotProvided />
        )}
      </ITRSection>

      {/* SECTION 4: Chief Complaints */}
      <ITRSection title="Section 4 — Chief Complaints" icon={<ClipboardList className="w-4 h-4" />}>
        {chiefComplaints.length > 0 || itr.otherComplaints || itr.medicationsTaken || itr.prescriptionRefill ? (
          <div className="space-y-3">
            {chiefComplaints.length > 0 && (
              <div>
                <p className="text-xs text-slate-500 uppercase font-medium mb-2">Checked Complaints</p>
                <div className="flex flex-wrap gap-1.5">
                  {chiefComplaints.map((c: string) => <GreenBadge key={c} label={c} />)}
                </div>
              </div>
            )}
            {itr.otherComplaints && (
              <ITRField label="Other Complaints" value={itr.otherComplaints} />
            )}
            <div className="space-y-1.5 pt-1">
              <YesNoBadge value={itr.medicationsTaken} label="Medications Taken" />
              {itr.medicationsTaken && itr.medicationsSpec && (
                <p className="text-xs text-slate-600 ml-30 pl-[7.5rem]">↳ {itr.medicationsSpec}</p>
              )}
              <YesNoBadge value={itr.prescriptionRefill} label="Prescription Refill" />
              {itr.prescriptionRefill && itr.prescriptionSpec && (
                <p className="text-xs text-slate-600 pl-[7.5rem]">↳ {itr.prescriptionSpec}</p>
              )}
            </div>
          </div>
        ) : (
          <NotProvided />
        )}
      </ITRSection>

      {/* SECTION 5: Past Medical History */}
      <ITRSection title="Section 5 — Past Medical History" icon={<FileText className="w-4 h-4" />}>
        {pastMedicalHistory.length > 0 || itr.hospitalizationSpec || itr.allergiesSpec || itr.pastMedicalOthers ? (
          <div className="space-y-3">
            {pastMedicalHistory.length > 0 && (
              <div>
                <p className="text-xs text-slate-500 uppercase font-medium mb-2">Checked Conditions</p>
                <div className="flex flex-wrap gap-1.5">
                  {pastMedicalHistory.map((c: string) => <GreenBadge key={c} label={c} />)}
                </div>
              </div>
            )}
            {itr.hospitalizationSpec && (
              <ITRField label="Hospitalization Details" value={itr.hospitalizationSpec} />
            )}
            {itr.allergiesSpec && (
              <ITRField label="Allergies" value={itr.allergiesSpec} />
            )}
            {itr.pastMedicalOthers && (
              <ITRField label="Others" value={itr.pastMedicalOthers} />
            )}
          </div>
        ) : (
          <NotProvided />
        )}
      </ITRSection>

      {/* SECTION 6: Family History */}
      <ITRSection title="Section 6 — Family History" icon={<Users className="w-4 h-4" />}>
        {familyHistory.length > 0 || itr.familyHistoryOthers ? (
          <div className="space-y-3">
            {familyHistory.length > 0 && (
              <div>
                <p className="text-xs text-slate-500 uppercase font-medium mb-2">Conditions in Family</p>
                <div className="flex flex-wrap gap-1.5">
                  {familyHistory.map((c: string) => <GreenBadge key={c} label={c} />)}
                </div>
              </div>
            )}
            {itr.familyHistoryOthers && (
              <ITRField label="Others" value={itr.familyHistoryOthers} />
            )}
          </div>
        ) : (
          <NotProvided />
        )}
      </ITRSection>

      {/* SECTION 7: Surgical History */}
      <ITRSection title="Section 7 — Surgical History" icon={<Scissors className="w-4 h-4" />}>
        <div className="space-y-3">
          <YesNoBadge value={itr.hadSurgery} label="Had Surgery" />
          {itr.hadSurgery && (
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 mt-2">
              <ITRField label="Operation Name" value={na(itr.surgeryName)} />
              <ITRField label="Date of Operation" value={fmtDate(itr.surgeryDate)} />
            </div>
          )}
        </div>
      </ITRSection>

      {/* SECTION 8: Personal Social History */}
      <ITRSection title="Section 8 — Personal Social History" icon={<Coffee className="w-4 h-4" />}>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
          <YesNoBadge value={itr.alcohol} label="Alcohol" />
          <YesNoBadge value={itr.smoking} label="Smoking" />
          <YesNoBadge value={itr.illicitDrugs} label="Illicit Drugs" />
          <YesNoBadge value={itr.sexuallyActive} label="Sexually Active" />
        </div>
      </ITRSection>

      {/* SECTION 9: OB-Gyne History (conditional) */}
      {isFemale && (
        <ITRSection title="Section 9 — OB-Gyne History" icon={<Baby className="w-4 h-4" />}>
          {(itr.lastMenstrualPeriod || itr.menstrualCycle || itr.menstrualRemarks) ? (
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <ITRField label="Last Menstrual Period" value={fmtDate(itr.lastMenstrualPeriod)} />
              <ITRField label="Menstrual Cycle" value={na(itr.menstrualCycle)} />
              <ITRField label="Remarks" value={na(itr.menstrualRemarks)} fullWidth />
            </div>
          ) : (
            <NotProvided />
          )}
        </ITRSection>
      )}

      {/* SECTION 10: Immunization */}
      <ITRSection title="Section 10 — Immunization" icon={<Syringe className="w-4 h-4" />}>
        {itr.immunizationNotes ? (
          <p className="text-sm text-slate-800 leading-relaxed">{itr.immunizationNotes}</p>
        ) : (
          <NotProvided />
        )}
      </ITRSection>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export function ConsultationClient({ appointment }: { appointment: any }) {
  const router = useRouter();

  const [diagnosis, setDiagnosis] = useState(
    appointment.consultationDiagnosis || appointment.consultation?.diagnosis || ""
  );
  const [notes, setNotes] = useState(
    appointment.consultationNotes || appointment.consultation?.prescriptionNotes || ""
  );
  const [followUpDate, setFollowUpDate] = useState(
    appointment.followUpDate 
      ? new Date(appointment.followUpDate).toISOString().split("T")[0]
      : appointment.consultation?.followUpDate
      ? new Date(appointment.consultation.followUpDate).toISOString().split("T")[0]
      : ""
  );

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Patient info
  const type = appointment.type;
  let patientName = "";
  let age: number | string = "N/A";

  if (type === "WALK_IN" && appointment.walkInPatient) {
    patientName = appointment.walkInPatient.fullName;
    age = appointment.walkInPatient.age;
  } else if (appointment.user) {
    patientName = appointment.user.name;
    age = getAge(appointment.user.birthday);
  }

  const handleBack = () => router.push("/dashboard/doctor");

  const handleOpenConfirm = () => {
    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = async () => {
    setShowConfirmModal(false);
    setIsSaving(true);
    try {
      const result = await saveConsultation(appointment.id, {
        diagnosis,
        notes,
        followUpDate: followUpDate || null,
      });
      if (result.success) {
        toast.success("Consultation marked as completed!");
        router.push("/dashboard/doctor");
      } else {
        toast.error(result.error || "Failed to save consultation");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const isCompleted = appointment.status === "COMPLETED";
  const hasNotes = diagnosis.trim() !== "" || notes.trim() !== "";

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-16">
      {/* HEADER */}
      <div className="flex items-center gap-4 border-b border-slate-200 pb-4">
        <button
          onClick={handleBack}
          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Patient File</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-slate-600 font-medium">
              {patientName} • {age} yrs
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                type === "ONLINE" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
              }`}
            >
              {type.replace("_", "-")}
            </span>
            {isCompleted && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-600">
                Completed
              </span>
            )}
          </div>
        </div>
      </div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-8 items-start">
        {/* LEFT COL: Patient ITR */}
        <div className="space-y-4 min-h-0">
          {type === "WALK_IN" ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="border-b border-green-100 bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-3 flex items-center gap-2">
                <User className="w-4 h-4 text-white/80" />
                <h3 className="font-semibold text-white text-sm tracking-wide">Patient Information</h3>
              </div>
              <div className="p-4 space-y-4">
                <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 text-sm text-amber-800 flex items-start gap-3">
                  <Info className="w-5 h-5 shrink-0 mt-0.5" />
                  <p>This is a walk-in patient. The hard copy ITR form contains their full medical history and is currently with you.</p>
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  <ITRField label="Full Name" value={appointment.walkInPatient?.fullName} fullWidth />
                  <ITRField label="Age" value={`${appointment.walkInPatient?.age} yrs`} />
                  <ITRField label="Sex" value={na(appointment.walkInPatient?.sex)} />
                  <ITRField label="Contact" value={na(appointment.walkInPatient?.contactNumber)} />
                  <ITRField label="Address" value={na(appointment.walkInPatient?.address)} fullWidth />
                  <ITRField label="Service" value={na(appointment.service)} />
                  <ITRField label="Time Slot" value={na(appointment.time_slot)} />
                </div>
              </div>
            </div>
          ) : (
            <OnlinePatientITR user={appointment.user} itr={appointment.user?.itr} />
          )}
        </div>

        {/* RIGHT COL: Doctor's Notes */}
        <div className="space-y-6 lg:sticky lg:top-6">
          {type !== "WALK_IN" ? (
            <div className="bg-white rounded-xl border border-emerald-200 shadow-sm overflow-hidden">
              <div className="border-b border-emerald-100 bg-emerald-50/50 p-4">
                <h3 className="font-semibold text-emerald-800 flex items-center gap-2">
                  <Stethoscope className="w-4 h-4" /> Consultation Notes
                </h3>
                <p className="text-xs text-emerald-600 mt-1">
                  Optional — notes will be visible to the patient after marking as completed.
                </p>
              </div>

              <div className="p-4 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">Diagnosis</label>
                    <textarea
                      rows={3}
                      placeholder="e.g. Dental caries on lower right molar"
                      value={diagnosis}
                      onChange={(e) => setDiagnosis(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm outline-none focus:border-emerald-500 transition-all resize-none"
                      disabled={isCompleted}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">Notes / What to do</label>
                    <textarea
                      rows={3}
                      placeholder="e.g. Take amoxicillin 500mg 3x daily for 7 days, avoid cold drinks"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm outline-none focus:border-emerald-500 transition-all resize-none"
                      disabled={isCompleted}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">Follow-up Date</label>
                    <input
                      type="date"
                      min={new Date().toISOString().split("T")[0]}
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm outline-none focus:border-emerald-500 text-slate-500"
                      disabled={isCompleted}
                    />
                  </div>
                </div>

                {!isCompleted && (
                  <button
                    onClick={handleOpenConfirm}
                    disabled={isSaving}
                    className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-md text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm"
                  >
                    {isSaving ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        Saving...
                      </span>
                    ) : (
                      <>
                        <Save className="w-4 h-4" /> Mark as Completed
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          ) : (
            !isCompleted && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <h3 className="font-semibold text-slate-800 text-sm mb-1">Complete Appointment</h3>
                <p className="text-xs text-slate-500 mb-4">Mark this walk-in appointment as completed to clear it from your queue.</p>
                <button
                  onClick={handleOpenConfirm}
                  disabled={isSaving}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-md text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm"
                >
                  {isSaving ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Saving...
                    </span>
                  ) : (
                    <>
                      <Save className="w-4 h-4" /> Mark as Completed
                    </>
                  )}
                </button>
              </div>
            )
          )}
        </div>
      </div>

      {/* CONFIRMATION MODAL */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" /> Confirm Completion
            </DialogTitle>
            <DialogDescription className="space-y-2 pt-2">
              <span className="block">Mark this consultation as completed?</span>
              {!hasNotes && (
                <span className="block font-medium text-amber-700 bg-amber-50 p-2 rounded-md">
                  No consultation notes will be sent to the patient.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <button
              onClick={() => setShowConfirmModal(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-md text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmSubmit}
              className="px-4 py-2 bg-emerald-600 text-white rounded-md text-sm font-medium hover:bg-emerald-700 transition-colors"
            >
              Confirm
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
