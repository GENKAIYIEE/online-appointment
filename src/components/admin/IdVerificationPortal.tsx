"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Search,
  Filter,
  User,
  Users,
  RefreshCw,
  Loader2,
  AlertTriangle,
  FileText,
  Layers,
  Phone,
  Mail,
  MapPin,
  Calendar,
  UserCheck,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { getPatientsWithID, updateIDVerificationStatus } from "@/actions/users";
import { isRelationshipDocType } from "@/lib/relationship-documents";

interface PatientRecord {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  suffix?: string | null;
  address?: string | null;
  idType: string | null;
  idNumber: string | null;
  idCardUrl: string | null;
  idCardBackUrl: string | null;
  idStatus: string | null;
  idRejectionReason: string | null;
  created_at: Date;
}

interface OwnerDetails {
  id: string;
  username: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  address: string | null;
}

interface FamilyMemberRecord {
  id: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  birthday: Date | string | null;
  gender: string | null;
  relationship: string;
  idType: string | null;
  idNumber: string | null;
  idCardUrl: string | null;
  idCardBackUrl: string | null;
  idStatus: string | null;
  idRejectionReason: string | null;
  createdAt: Date;
  owner: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    firstName?: string | null;
    middleName?: string | null;
    lastName?: string | null;
    suffix?: string | null;
    address?: string | null;
  };
}

function formatAge(birthday?: Date | string | null): string | null {
  if (!birthday) return null;
  const dob = new Date(birthday);
  if (isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age >= 0 ? `${age} yrs old` : null;
}

export function IdVerificationPortal() {
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMemberRecord[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "PENDING" | "VERIFIED" | "REJECTED">("ALL");
  const [categoryFilter, setCategoryFilter] = useState<"ALL" | "PATIENT" | "SUBPROFILE">("ALL");

  const [viewImageModal, setViewImageModal] = useState<{
    id: string;
    url: string;
    backUrl?: string | null;
    name: string;
    type: string;
    idNumber?: string;
    isDocument?: boolean;
    recordType: "PATIENT" | "SUBPROFILE";
    idStatus: string;
    relationship?: string;
    birthday?: Date | string | null;
    gender?: string | null;
    ownerDetails?: OwnerDetails;
    date?: Date;
  } | null>(null);

  // Document Viewer Inspector State
  const [activeDocPage, setActiveDocPage] = useState<"PAGE1" | "PAGE2" | "SPLIT">("PAGE1");
  const [docZoom, setDocZoom] = useState<number>(1);
  const [docRotation, setDocRotation] = useState<number>(0);

  const openRawDocument = (url: string) => {
    if (!url) return;
    if (url.startsWith("http://") || url.startsWith("https://")) {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    const newWin = window.open("", "_blank");
    if (newWin) {
      if (url.startsWith("data:application/pdf")) {
        newWin.document.write(
          `<!DOCTYPE html><html><head><title>Document Preview</title><style>html,body{margin:0;height:100%;overflow:hidden;background:#0f172a;}</style></head><body><iframe src="${url}" width="100%" height="100%" style="border:none;"></iframe></body></html>`
        );
      } else {
        newWin.document.write(
          `<!DOCTYPE html><html><head><title>Full Resolution Document Inspection</title><style>html,body{margin:0;height:100%;background:#090d16;display:flex;align-items:center;justify-content:center;}</style></head><body><img src="${url}" style="max-width:100%;max-height:100%;object-fit:contain;box-shadow:0 10px 40px rgba(0,0,0,0.8);" /></body></html>`
        );
      }
      newWin.document.close();
    }
  };

  // Reject Modal
  const [rejectModalTarget, setRejectModalTarget] = useState<{
    id: string;
    type: "PATIENT" | "SUBPROFILE";
    name: string;
  } | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getPatientsWithID();
      setPatients(res.patients as any);
      setFamilyMembers(res.familyMembers as any);
    } catch (err) {
      toast.error("Failed to load ID verification records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApprove = async (id: string, type: "PATIENT" | "SUBPROFILE") => {
    setUpdating(id);
    try {
      await updateIDVerificationStatus(id, type, "VERIFIED");
      toast.success("ID Verification Approved!");
      fetchData();
    } catch (err) {
      toast.error("Failed to approve ID.");
    } finally {
      setUpdating(null);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectModalTarget) return;
    setUpdating(rejectModalTarget.id);
    try {
      await updateIDVerificationStatus(
        rejectModalTarget.id,
        rejectModalTarget.type,
        "REJECTED",
        rejectionReason
      );
      toast.success("ID verification rejected.");
      setRejectModalTarget(null);
      setRejectionReason("");
      fetchData();
    } catch (err) {
      toast.error("Failed to reject ID.");
    } finally {
      setUpdating(null);
    }
  };

  type FormattedRecord = {
    id: string;
    recordType: "PATIENT" | "SUBPROFILE";
    name: string;
    subtitle: string;
    idType: string | null;
    idNumber: string | null;
    idCardUrl: string | null;
    idCardBackUrl: string | null;
    idStatus: string;
    idRejectionReason: string | null;
    date: Date;
    isDocument: boolean;
    relationship?: string;
    birthday?: Date | string | null;
    gender?: string | null;
    ownerDetails?: OwnerDetails;
  };

  // Combine and format records
  const allRecords: FormattedRecord[] = [
    ...patients.map((p) => {
      const legalName = [p.firstName, p.middleName, p.lastName, p.suffix]
        .filter(Boolean)
        .join(" ")
        .trim();
      return {
        id: p.id,
        recordType: "PATIENT" as const,
        name: legalName || p.name,
        subtitle: p.email || p.phone || "Main Account Patient",
        idType: p.idType,
        idNumber: p.idNumber,
        idCardUrl: p.idCardUrl,
        idCardBackUrl: p.idCardBackUrl,
        idStatus: p.idStatus || "PENDING",
        idRejectionReason: p.idRejectionReason,
        date: new Date(p.created_at),
        isDocument: false,
        ownerDetails: {
          id: p.id,
          username: p.name,
          fullName: legalName || p.name,
          email: p.email,
          phone: p.phone,
          address: p.address || null,
        },
      };
    }),
    ...familyMembers.map((fm) => {
      const ownerLegal = [
        fm.owner.firstName,
        fm.owner.middleName,
        fm.owner.lastName,
        fm.owner.suffix,
      ]
        .filter(Boolean)
        .join(" ")
        .trim();

      const ownerFullName = ownerLegal || fm.owner.name;
      const dependentFullName = [fm.firstName, fm.middleName, fm.lastName]
        .filter(Boolean)
        .join(" ")
        .trim();

      return {
        id: fm.id,
        recordType: "SUBPROFILE" as const,
        name: dependentFullName,
        subtitle: `Proxy: ${ownerFullName} (${fm.relationship})`,
        relationship: fm.relationship,
        birthday: fm.birthday,
        gender: fm.gender,
        idType: fm.idType,
        idNumber: fm.idNumber,
        idCardUrl: fm.idCardUrl,
        idCardBackUrl: fm.idCardBackUrl,
        idStatus: fm.idStatus || "PENDING",
        idRejectionReason: fm.idRejectionReason,
        date: new Date(fm.createdAt),
        isDocument: isRelationshipDocType(fm.idType),
        ownerDetails: {
          id: fm.owner.id,
          username: fm.owner.name,
          fullName: ownerFullName,
          email: fm.owner.email,
          phone: fm.owner.phone,
          address: fm.owner.address || null,
        },
      };
    }),
  ];

  // Category partitions and pending totals
  const allPatientRecords = allRecords.filter((r) => r.recordType === "PATIENT");
  const allFamilyRecords = allRecords.filter((r) => r.recordType === "SUBPROFILE");

  const pendingPatientCount = allPatientRecords.filter((r) => r.idStatus === "PENDING").length;
  const pendingFamilyCount = allFamilyRecords.filter((r) => r.idStatus === "PENDING").length;
  const totalPendingCount = pendingPatientCount + pendingFamilyCount;

  // Filter records by search and status
  const filteredRecords = allRecords.filter((r) => {
    const q = search.toLowerCase();
    const matchesSearch =
      r.name.toLowerCase().includes(q) ||
      r.subtitle.toLowerCase().includes(q) ||
      (r.idType && r.idType.toLowerCase().includes(q)) ||
      (r.idNumber && r.idNumber.toLowerCase().includes(q)) ||
      (r.relationship && r.relationship.toLowerCase().includes(q)) ||
      (r.ownerDetails?.fullName && r.ownerDetails.fullName.toLowerCase().includes(q)) ||
      (r.ownerDetails?.username && r.ownerDetails.username.toLowerCase().includes(q)) ||
      (r.ownerDetails?.email && r.ownerDetails.email.toLowerCase().includes(q)) ||
      (r.ownerDetails?.phone && r.ownerDetails.phone.toLowerCase().includes(q)) ||
      (r.ownerDetails?.address && r.ownerDetails.address.toLowerCase().includes(q));

    const matchesStatus =
      filterStatus === "ALL" || r.idStatus === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const filteredPatients = filteredRecords.filter((r) => r.recordType === "PATIENT");
  const filteredFamily = filteredRecords.filter((r) => r.recordType === "SUBPROFILE");

  const getBadge = (status: string) => {
    switch (status) {
      case "VERIFIED":
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 font-medium hover:bg-emerald-50 shadow-none rounded">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge className="bg-rose-50 text-rose-700 border-rose-200 gap-1 font-medium hover:bg-rose-50 shadow-none rounded">
            <XCircle className="w-3 h-3 text-rose-600" /> Rejected
          </Badge>
        );
      default:
        return (
          <Badge className="bg-amber-50 text-amber-800 border-amber-200 gap-1 font-medium hover:bg-amber-50 shadow-none rounded">
            <Clock className="w-3 h-3 text-amber-600" /> Pending Review
          </Badge>
        );
    }
  };

  const renderRecordCard = (item: FormattedRecord) => {
    const openModal = () => {
      setActiveDocPage("PAGE1");
      setDocZoom(1);
      setDocRotation(0);
      setViewImageModal({
        id: item.id,
        url: item.idCardUrl!,
        backUrl: item.idCardBackUrl,
        name: item.name,
        type: item.idType || (item.isDocument ? "Supporting Document" : "ID Card"),
        idNumber: item.idNumber || undefined,
        isDocument: item.isDocument,
        recordType: item.recordType,
        idStatus: item.idStatus,
        relationship: item.relationship,
        birthday: item.birthday,
        gender: item.gender,
        ownerDetails: item.ownerDetails,
        date: item.date,
      });
    };

    return (
      <Card
        key={`${item.recordType}-${item.id}`}
        className="border border-slate-200/90 shadow-sm hover:shadow transition-all bg-white flex flex-col rounded-xl overflow-hidden"
      >
        <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-medium text-slate-600">
            {item.recordType === "PATIENT" ? (
              <User className="w-3.5 h-3.5 text-slate-500" />
            ) : (
              <Users className="w-3.5 h-3.5 text-indigo-600" />
            )}
            <span>{item.recordType === "PATIENT" ? "Patient ID" : "Family Relationship Proof"}</span>
          </div>
          {getBadge(item.idStatus)}
        </div>

        <CardContent className="p-4 flex-1 flex flex-col justify-between space-y-4">
          <div className="space-y-3.5">
            {/* Subject Header */}
            <div>
              <h3 className="font-bold text-slate-900 text-base leading-snug">
                {item.name}
              </h3>
              {item.recordType === "SUBPROFILE" ? (
                <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500 flex-wrap">
                  <Badge className="bg-sky-50 text-sky-700 border-sky-200 text-[11px] font-semibold py-0 px-2 rounded-full shadow-none hover:bg-sky-50">
                    {item.relationship}
                  </Badge>
                  {(item.birthday || item.gender) && (
                    <span className="text-slate-500 font-medium">
                      {formatAge(item.birthday) ? `${formatAge(item.birthday)}` : ""}
                      {formatAge(item.birthday) && item.gender ? " • " : ""}
                      {item.gender || ""}
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-500 mt-0.5">{item.subtitle}</p>
              )}
            </div>

            {/* Submitter Dossier (Clean Divider layout, NO nested grey boxes!) */}
            {item.recordType === "SUBPROFILE" && item.ownerDetails && (
              <div className="pt-2.5 border-t border-slate-100 space-y-1.5 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Proxy Submitter
                </span>

                <div className="font-semibold text-slate-800 text-sm">
                  {item.ownerDetails.fullName}
                  {item.ownerDetails.fullName !== item.ownerDetails.username && (
                    <span className="text-slate-400 font-normal text-xs ml-1.5">
                      (@{item.ownerDetails.username})
                    </span>
                  )}
                </div>

                {/* Contact rows: each on its own full-width line so email NEVER crops! */}
                <div className="space-y-1 text-slate-600 pt-0.5">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-mono text-xs">{item.ownerDetails.phone || "No phone number"}</span>
                  </div>
                  <div className="flex items-start gap-2 min-w-0">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="text-xs break-all text-slate-700 font-mono" title={item.ownerDetails.email || undefined}>
                      {item.ownerDetails.email || "No email address"}
                    </span>
                  </div>
                  {item.ownerDetails.address && (
                    <div className="flex items-center gap-2 min-w-0 text-slate-500">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="text-xs truncate" title={item.ownerDetails.address}>
                        {item.ownerDetails.address}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Patient Specific Meta (if PATIENT) */}
            {item.recordType === "PATIENT" && (
              <div className="pt-2.5 border-t border-slate-100 space-y-1 text-xs">
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500">ID Type</span>
                  <span className="font-medium text-slate-800">{item.idType || "Not Specified"}</span>
                </div>
                {item.idNumber && (
                  <div className="flex justify-between py-0.5">
                    <span className="text-slate-500">ID Number</span>
                    <span className="font-mono font-medium text-slate-800">{item.idNumber}</span>
                  </div>
                )}
                {item.ownerDetails?.address && (
                  <div className="flex items-center gap-1.5 text-slate-500 pt-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{item.ownerDetails.address}</span>
                  </div>
                )}
              </div>
            )}

            {/* Document Meta Header directly above Image */}
            <div className="pt-2.5 border-t border-slate-100">
              <div className="flex items-center justify-between text-[11px] mb-1.5">
                <span className="font-semibold text-slate-700 truncate" title={item.idType || "Document"}>
                  {item.idType || "Document"}
                </span>
                <span className="text-slate-400 text-[10px] shrink-0 font-medium">
                  {item.date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>

              {/* Image Preview Canvas */}
              <div className="flex gap-2">
                {item.idCardUrl && (
                  <div
                    onClick={openModal}
                    className="relative group flex-1 rounded-lg overflow-hidden border border-slate-200 bg-slate-900 aspect-video flex items-center justify-center cursor-pointer hover:border-slate-400 transition"
                  >
                    <span className="absolute top-1.5 left-1.5 text-[9px] font-bold uppercase tracking-wider bg-black/70 backdrop-blur-sm text-white px-1.5 py-0.5 rounded z-10">
                      {item.isDocument ? "PAGE 1" : "FRONT"}
                    </span>
                    {item.idCardUrl.startsWith("data:application/pdf") ? (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 text-slate-400">
                        <FileText className="w-7 h-7 opacity-60 mb-1" />
                        <span className="text-[10px] font-bold tracking-wider">PDF</span>
                      </div>
                    ) : (
                      <img
                        src={item.idCardUrl}
                        alt={item.isDocument ? "Document Page 1" : "ID Front"}
                        className={`w-full h-full ${item.isDocument ? "object-contain" : "object-cover"} group-hover:scale-105 transition duration-300`}
                      />
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center z-20">
                      <span className="text-white text-xs font-semibold flex items-center gap-1 bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-md">
                        <Eye className="w-3.5 h-3.5" /> Inspect
                      </span>
                    </div>
                  </div>
                )}

                {item.idCardBackUrl && (
                  <div
                    onClick={openModal}
                    className="relative group flex-1 rounded-lg overflow-hidden border border-slate-200 bg-slate-900 aspect-video flex items-center justify-center cursor-pointer hover:border-slate-400 transition"
                  >
                    <span className="absolute top-1.5 left-1.5 text-[9px] font-bold uppercase tracking-wider bg-black/70 backdrop-blur-sm text-white px-1.5 py-0.5 rounded z-10">
                      {item.isDocument ? "PAGE 2" : "BACK"}
                    </span>
                    {item.idCardBackUrl.startsWith("data:application/pdf") ? (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 text-slate-400">
                        <FileText className="w-7 h-7 opacity-60 mb-1" />
                        <span className="text-[10px] font-bold tracking-wider">PDF</span>
                      </div>
                    ) : (
                      <img
                        src={item.idCardBackUrl}
                        alt={item.isDocument ? "Document Page 2" : "ID Back"}
                        className={`w-full h-full ${item.isDocument ? "object-contain" : "object-cover"} group-hover:scale-105 transition duration-300`}
                      />
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center z-20">
                      <span className="text-white text-xs font-semibold flex items-center gap-1 bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-md">
                        <Eye className="w-3.5 h-3.5" /> Inspect
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Rejection notice if present */}
          {item.idRejectionReason && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold">Rejected:</strong> {item.idRejectionReason}
              </div>
            </div>
          )}

          {/* Footer Action buttons */}
          <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
            <Button
              size="sm"
              variant="outline"
              onClick={openModal}
              className="flex-1 gap-1.5 text-slate-700 text-xs h-8 border-slate-200 hover:bg-slate-50 font-medium"
            >
              <Eye className="w-3.5 h-3.5 text-slate-500" /> Inspect
            </Button>

            <Button
              size="sm"
              onClick={() => handleApprove(item.id, item.recordType)}
              disabled={updating === item.id || item.idStatus !== "PENDING"}
              className="flex-1 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 font-medium shadow-none"
            >
              {updating === item.id ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              Approve
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setRejectModalTarget({
                  id: item.id,
                  type: item.recordType,
                  name: item.name,
                })
              }
              disabled={updating === item.id || item.idStatus !== "PENDING"}
              className="gap-1 text-xs px-2.5 h-8 border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800 font-medium"
            >
              <XCircle className="w-3.5 h-3.5" /> Reject
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-5">
      {/* Category Navigation - Enterprise Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 text-sm overflow-x-auto overflow-y-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={() => setCategoryFilter("ALL")}
          className={cn(
            "flex items-center gap-2 px-3 py-2.5 font-medium transition-colors border-b-2 -mb-px shrink-0 text-xs sm:text-sm",
            categoryFilter === "ALL"
              ? "border-slate-900 text-slate-900 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
          )}
        >
          <span>All Submissions</span>
          <span className={cn(
            "text-xs px-2 py-0.5 rounded font-medium",
            categoryFilter === "ALL" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"
          )}>
            {allRecords.length}
          </span>
          {totalPendingCount > 0 && (
            <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
              {totalPendingCount} pending
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setCategoryFilter("PATIENT")}
          className={cn(
            "flex items-center gap-2 px-3 py-2.5 font-medium transition-colors border-b-2 -mb-px shrink-0 text-xs sm:text-sm",
            categoryFilter === "PATIENT"
              ? "border-slate-900 text-slate-900 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
          )}
        >
          <User className="w-4 h-4 text-slate-400" />
          <span>Patient Valid IDs</span>
          <span className={cn(
            "text-xs px-2 py-0.5 rounded font-medium",
            categoryFilter === "PATIENT" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"
          )}>
            {allPatientRecords.length}
          </span>
          {pendingPatientCount > 0 && (
            <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
              {pendingPatientCount} pending
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setCategoryFilter("SUBPROFILE")}
          className={cn(
            "flex items-center gap-2 px-3 py-2.5 font-medium transition-colors border-b-2 -mb-px shrink-0 text-xs sm:text-sm",
            categoryFilter === "SUBPROFILE"
              ? "border-slate-900 text-slate-900 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
          )}
        >
          <Users className="w-4 h-4 text-slate-400" />
          <span>Family Relationship Proofs</span>
          <span className={cn(
            "text-xs px-2 py-0.5 rounded font-medium",
            categoryFilter === "SUBPROFILE" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"
          )}>
            {allFamilyRecords.length}
          </span>
          {pendingFamilyCount > 0 && (
            <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
              {pendingFamilyCount} pending
            </span>
          )}
        </button>
      </div>

      {/* Header controls (Search & Status Filter) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search patient name, email, or ID type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-slate-50 border-slate-200 text-sm h-9"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-md border border-slate-200">
            {(["ALL", "PENDING", "VERIFIED", "REJECTED"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                  filterStatus === st
                    ? "bg-white text-slate-900 shadow-sm font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {st === "ALL" ? "All Status" : st.charAt(0) + st.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="gap-1.5 h-8 text-xs border-slate-200"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Grid of ID Verification Cards by Category */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="w-4 h-4 rounded-full" />
                  <Skeleton className="w-24 h-4" />
                </div>
                <Skeleton className="w-24 h-6 rounded-full" />
              </div>
              <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <Skeleton className="w-40 h-6 mb-1.5" />
                  <Skeleton className="w-48 h-3" />
                  <div className="mt-4 p-3 bg-slate-100/70 rounded-xl space-y-3 border border-slate-200">
                    <div className="flex justify-between items-center">
                      <Skeleton className="w-16 h-3" />
                      <Skeleton className="w-32 h-4" />
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Skeleton className="flex-1 aspect-video rounded-xl" />
                  <Skeleton className="flex-1 aspect-video rounded-xl" />
                </div>
                <div className="grid grid-cols-3 gap-2 pt-2">
                  <Skeleton className="h-9 rounded-md" />
                  <Skeleton className="h-9 rounded-md" />
                  <Skeleton className="h-9 rounded-md" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredRecords.length === 0 ? (
        <Card className="border-dashed border-slate-200">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <ShieldCheck className="w-12 h-12 text-slate-300" />
            <h3 className="text-base font-bold text-slate-800">No Records Found</h3>
            <p className="text-xs text-slate-500 max-w-sm">
              No ID or relationship documents match your search filter or status selection.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* SECTION 1: Main Patient Government IDs */}
          {(categoryFilter === "ALL" || categoryFilter === "PATIENT") && (
            <div className="space-y-4">
              {categoryFilter === "ALL" && (
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-500" />
                    <h3 className="font-semibold text-slate-800 text-sm">
                      Patient Valid IDs
                    </h3>
                    <span className="text-xs text-slate-500 font-medium">
                      ({filteredPatients.length})
                    </span>
                  </div>
                  {pendingPatientCount > 0 && (
                    <span className="text-xs text-amber-700 font-medium">
                      {pendingPatientCount} pending review
                    </span>
                  )}
                </div>
              )}

              {filteredPatients.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredPatients.map(renderRecordCard)}
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500">
                  No patient valid IDs match the current search or status filter.
                </div>
              )}
            </div>
          )}

          {/* SECTION 2: Family Member Proof of Relationship Documents */}
          {(categoryFilter === "ALL" || categoryFilter === "SUBPROFILE") && (
            <div className="space-y-4">
              {categoryFilter === "ALL" && (
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-500" />
                    <h3 className="font-semibold text-slate-800 text-sm">
                      Family Relationship Proofs
                    </h3>
                    <span className="text-xs text-slate-500 font-medium">
                      ({filteredFamily.length})
                    </span>
                  </div>
                  {pendingFamilyCount > 0 && (
                    <span className="text-xs text-amber-700 font-medium">
                      {pendingFamilyCount} pending review
                    </span>
                  )}
                </div>
              )}

              {filteredFamily.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredFamily.map(renderRecordCard)}
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500">
                  No family relationship documents match the current search or status filter.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* View Full ID / Document Inspector Modal */}
      {viewImageModal && (
        <Dialog
          open={!!viewImageModal}
          onOpenChange={(open) => {
            if (!open) {
              setViewImageModal(null);
              setDocZoom(1);
              setDocRotation(0);
              setActiveDocPage("PAGE1");
            }
          }}
        >
          <DialogContent className="max-w-5xl w-[calc(100vw-2rem)] sm:w-[94vw] max-h-[94vh] flex flex-col p-0 sm:p-0 gap-0 overflow-hidden rounded-2xl border-slate-200 shadow-2xl">
            {/* Fixed Header */}
            <div className="px-5 py-4 sm:px-6 border-b border-slate-100 shrink-0 bg-white pr-12">
              <DialogTitle className="flex items-center gap-2 text-base sm:text-lg font-bold text-slate-900">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="truncate">
                  {viewImageModal.isDocument ? "Proof of Relationship Verification" : "Government ID Verification"} — {viewImageModal.name}
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                Reviewing document for clinical registration: <strong className="text-slate-800">{viewImageModal.type}</strong>
                {viewImageModal.idNumber ? ` • Serial: ${viewImageModal.idNumber}` : ""}
              </DialogDescription>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/50">
              {/* Dossier Comparison Header */}
              {viewImageModal.recordType === "SUBPROFILE" && viewImageModal.ownerDetails ? (
                <div className="p-4 bg-white border border-slate-200/90 rounded-xl text-xs space-y-3 shadow-sm">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2 font-semibold text-slate-800">
                      <UserCheck className="w-4 h-4 text-emerald-600" />
                      <span>Cross-Check Dossier (Compare with Document Below)</span>
                    </div>
                    <span className="text-[11px] text-slate-500">
                      Submitted: {viewImageModal.date ? new Date(viewImageModal.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "N/A"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {/* Proxy Submitter */}
                    <div className="bg-slate-50/80 p-3.5 rounded-lg border border-slate-200/80 space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Submitter (Account Owner / Proxy)
                      </span>
                      <div>
                        <p className="font-bold text-slate-900 text-sm">
                          {viewImageModal.ownerDetails.fullName}
                        </p>
                        {viewImageModal.ownerDetails.fullName !== viewImageModal.ownerDetails.username && (
                          <p className="text-[11px] text-slate-500">
                            Account: @{viewImageModal.ownerDetails.username}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1.5 text-slate-600 text-xs pt-1 border-t border-slate-200/60">
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-mono">{viewImageModal.ownerDetails.phone || "No phone provided"}</span>
                        </div>
                        <div className="flex items-start gap-2 min-w-0">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span className="break-all font-mono text-slate-700">{viewImageModal.ownerDetails.email || "No email provided"}</span>
                        </div>
                        {viewImageModal.ownerDetails.address && (
                          <div className="flex items-start gap-2 text-slate-500">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <span>{viewImageModal.ownerDetails.address}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Dependent */}
                    <div className="bg-slate-50/80 p-3.5 rounded-lg border border-slate-200/80 space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Dependent (Patient to be registered)
                      </span>
                      <div>
                        <p className="font-bold text-slate-900 text-sm">
                          {viewImageModal.name}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Badge className="bg-sky-50 text-sky-700 border-sky-200 text-[10px] font-semibold py-0 px-2 rounded-full shadow-none hover:bg-sky-50">
                            {viewImageModal.relationship}
                          </Badge>
                          <span className="text-[11px] text-slate-500 font-medium">
                            {formatAge(viewImageModal.birthday) ? `${formatAge(viewImageModal.birthday)} • ` : ""}
                            {viewImageModal.gender || "Gender N/A"}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1.5 text-slate-600 text-xs pt-1 border-t border-slate-200/60">
                        <div>Document: <strong className="text-slate-800">{viewImageModal.type}</strong></div>
                        {viewImageModal.birthday && (
                          <div>
                            Birth Date: <strong>{new Date(viewImageModal.birthday).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</strong>
                          </div>
                        )}
                        {viewImageModal.idNumber && (
                          <div>Serial / ID: <strong className="font-mono text-slate-800">{viewImageModal.idNumber}</strong></div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : viewImageModal.recordType === "PATIENT" && viewImageModal.ownerDetails ? (
                <div className="p-3.5 bg-white border border-slate-200/90 rounded-xl text-xs space-y-2 shadow-sm">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                    <span className="font-semibold text-slate-800">Patient Account Information</span>
                    <span className="text-[11px] text-slate-500">
                      Registered: {viewImageModal.date ? new Date(viewImageModal.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "N/A"}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-slate-600">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-mono">{viewImageModal.ownerDetails.phone || "No phone"}</span>
                    </div>
                    <div className="flex items-start gap-2 min-w-0">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="break-all font-mono text-slate-700">{viewImageModal.ownerDetails.email || "No email"}</span>
                    </div>
                    {viewImageModal.ownerDetails.address && (
                      <div className="flex items-center gap-2 text-slate-500">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{viewImageModal.ownerDetails.address}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              {/* Document Inspection Canvas */}
              <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden flex flex-col shadow-xl">
                {/* Inspection Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-slate-900 border-b border-slate-800 text-xs">
                  {/* Page Navigation Tabs */}
                  <div className="flex items-center gap-1.5">
                    {viewImageModal.backUrl ? (
                      <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                        <button
                          type="button"
                          onClick={() => setActiveDocPage("PAGE1")}
                          className={cn(
                            "px-2.5 py-1 text-[11px] font-semibold rounded-md transition",
                            activeDocPage === "PAGE1"
                              ? "bg-sky-600 text-white shadow-sm"
                              : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                          )}
                        >
                          {viewImageModal.isDocument ? "Page 1" : "Front Side"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveDocPage("PAGE2")}
                          className={cn(
                            "px-2.5 py-1 text-[11px] font-semibold rounded-md transition",
                            activeDocPage === "PAGE2"
                              ? "bg-sky-600 text-white shadow-sm"
                              : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                          )}
                        >
                          {viewImageModal.isDocument ? "Page 2" : "Back Side"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveDocPage("SPLIT")}
                          className={cn(
                            "px-2.5 py-1 text-[11px] font-semibold rounded-md transition",
                            activeDocPage === "SPLIT"
                              ? "bg-sky-600 text-white shadow-sm"
                              : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                          )}
                        >
                          Split View
                        </button>
                      </div>
                    ) : (
                      <span className="text-white text-[11px] font-bold tracking-wider bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700">
                        {viewImageModal.isDocument ? "PAGE 1" : "FRONT"}
                      </span>
                    )}
                  </div>

                  {/* Zoom, Rotation, and Popout Controls */}
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setDocZoom((prev) => Math.max(0.5, Number((prev - 0.25).toFixed(2))))}
                      title="Zoom Out"
                      className="h-7 w-7 p-0 text-slate-300 hover:text-white hover:bg-slate-800"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </Button>
                    <span className="text-[11px] font-mono text-slate-300 px-1 select-none min-w-[42px] text-center">
                      {Math.round(docZoom * 100)}%
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setDocZoom((prev) => Math.min(3, Number((prev + 0.25).toFixed(2))))}
                      title="Zoom In"
                      className="h-7 w-7 p-0 text-slate-300 hover:text-white hover:bg-slate-800"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setDocZoom(1);
                        setDocRotation(0);
                      }}
                      title="Reset Zoom & Rotation"
                      className="h-7 px-2 text-[11px] text-slate-300 hover:text-white hover:bg-slate-800 font-medium"
                    >
                      Reset
                    </Button>
                    <div className="h-4 w-px bg-slate-800 mx-0.5" />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setDocRotation((prev) => (prev + 90) % 360)}
                      title="Rotate 90° Clockwise"
                      className="h-7 w-7 p-0 text-slate-300 hover:text-white hover:bg-slate-800"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const targetUrl = activeDocPage === "PAGE2" && viewImageModal.backUrl ? viewImageModal.backUrl : viewImageModal.url;
                        openRawDocument(targetUrl);
                      }}
                      title="Open Full Resolution Document in New Window"
                      className="h-7 px-2 text-[11px] text-sky-400 hover:text-sky-300 hover:bg-slate-800 gap-1 font-medium"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Raw File</span>
                    </Button>
                  </div>
                </div>

                {/* Canvas Display */}
                <div className="p-4 sm:p-6 overflow-auto max-h-[58vh] min-h-[360px] flex items-center justify-center bg-slate-950/90 relative">
                  {activeDocPage === "SPLIT" && viewImageModal.backUrl ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                      {/* Page 1 */}
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-[11px] font-semibold text-slate-400">
                          {viewImageModal.isDocument ? "Page 1" : "Front Side"}
                        </span>
                        {viewImageModal.url.startsWith("data:application/pdf") ? (
                          <iframe src={viewImageModal.url} className="w-full h-[50vh] rounded border border-slate-700 bg-white" title="Page 1 PDF" />
                        ) : (
                          <div className="overflow-hidden flex items-center justify-center w-full">
                            <img
                              src={viewImageModal.url}
                              alt="Document Page 1"
                              style={{
                                transform: `scale(${docZoom}) rotate(${docRotation}deg)`,
                                transformOrigin: "center center",
                              }}
                              className="max-h-[50vh] max-w-full w-auto h-auto object-contain transition-transform duration-150 shadow-2xl rounded border border-slate-800"
                            />
                          </div>
                        )}
                      </div>
                      {/* Page 2 */}
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-[11px] font-semibold text-slate-400">
                          {viewImageModal.isDocument ? "Page 2" : "Back Side"}
                        </span>
                        {viewImageModal.backUrl.startsWith("data:application/pdf") ? (
                          <iframe src={viewImageModal.backUrl} className="w-full h-[50vh] rounded border border-slate-700 bg-white" title="Page 2 PDF" />
                        ) : (
                          <div className="overflow-hidden flex items-center justify-center w-full">
                            <img
                              src={viewImageModal.backUrl}
                              alt="Document Page 2"
                              style={{
                                transform: `scale(${docZoom}) rotate(${docRotation}deg)`,
                                transformOrigin: "center center",
                              }}
                              className="max-h-[50vh] max-w-full w-auto h-auto object-contain transition-transform duration-150 shadow-2xl rounded border border-slate-800"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Single Page Display */
                    (() => {
                      const currentUrl = activeDocPage === "PAGE2" && viewImageModal.backUrl ? viewImageModal.backUrl : viewImageModal.url;
                      return currentUrl.startsWith("data:application/pdf") ? (
                        <iframe src={currentUrl} className="w-full h-[55vh] rounded-lg border border-slate-700 bg-white" title="Supporting Document PDF" />
                      ) : (
                        <div className="flex items-center justify-center w-full min-h-[320px]">
                          <img
                            src={currentUrl}
                            alt="Supporting Document"
                            style={{
                              transform: `scale(${docZoom}) rotate(${docRotation}deg)`,
                              transformOrigin: "center center",
                            }}
                            className="max-h-[52vh] max-w-full w-auto h-auto object-contain transition-transform duration-150 shadow-2xl rounded border border-slate-800 block mx-auto"
                          />
                        </div>
                      );
                    })()
                  )}
                </div>
              </div>
            </div>

            {/* Fixed Footer with Direct Actions */}
            <div className="p-3.5 sm:px-6 sm:py-3.5 border-t border-slate-100 shrink-0 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
              <Button variant="ghost" onClick={() => setViewImageModal(null)} className="text-slate-600 text-xs w-full sm:w-auto">
                Close Inspector
              </Button>
              {viewImageModal.idStatus === "PENDING" && (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const target = {
                        id: viewImageModal.id,
                        type: viewImageModal.recordType,
                        name: viewImageModal.name,
                      };
                      setViewImageModal(null);
                      setRejectModalTarget(target);
                    }}
                    className="text-rose-700 border-rose-200 hover:bg-rose-50 text-xs flex-1 sm:flex-initial"
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                  </Button>
                  <Button
                    size="sm"
                    onClick={async () => {
                      await handleApprove(viewImageModal.id, viewImageModal.recordType);
                      setViewImageModal(null);
                    }}
                    disabled={updating === viewImageModal.id}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs flex-1 sm:flex-initial shadow-none"
                  >
                    {updating === viewImageModal.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    )}
                    Approve Verification
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Reject Modal */}
      {rejectModalTarget && (
        <Dialog open={!!rejectModalTarget} onOpenChange={() => setRejectModalTarget(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-red-600 flex items-center gap-2">
                <XCircle className="w-5 h-5" /> Reject Government ID
              </DialogTitle>
              <DialogDescription>
                Provide a reason for rejecting the ID of <strong>{rejectModalTarget.name}</strong>.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <label className="text-xs font-semibold text-slate-700">Reason for rejection:</label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Photo is blurry, expired ID document, or name does not match."
                className="w-full h-24 border border-slate-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectModalTarget(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleRejectSubmit} disabled={!rejectionReason.trim()}>
                Confirm Rejection
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
