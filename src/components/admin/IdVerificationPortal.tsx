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
  idType: string | null;
  idNumber: string | null;
  idCardUrl: string | null;
  idCardBackUrl: string | null;
  idStatus: string | null;
  idRejectionReason: string | null;
  created_at: Date;
}

interface FamilyMemberRecord {
  id: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  relationship: string;
  idType: string | null;
  idNumber: string | null;
  idCardUrl: string | null;
  idCardBackUrl: string | null;
  idStatus: string | null;
  idRejectionReason: string | null;
  createdAt: Date;
  owner: {
    name: string;
    email: string | null;
    phone: string | null;
  };
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
    url: string;
    backUrl?: string | null;
    name: string;
    type: string;
    idNumber?: string;
    isDocument?: boolean;
  } | null>(null);

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
  };

  // Combine and format records
  const allRecords: FormattedRecord[] = [
    ...patients.map((p) => ({
      id: p.id,
      recordType: "PATIENT" as const,
      name: p.name,
      subtitle: p.email || p.phone || "Main Account Patient",
      idType: p.idType,
      idNumber: p.idNumber,
      idCardUrl: p.idCardUrl,
      idCardBackUrl: p.idCardBackUrl,
      idStatus: p.idStatus || "PENDING",
      idRejectionReason: p.idRejectionReason,
      date: new Date(p.created_at),
      isDocument: false,
    })),
    ...familyMembers.map((fm) => ({
      id: fm.id,
      recordType: "SUBPROFILE" as const,
      name: `${fm.firstName} ${fm.lastName}`,
      subtitle: `Proxy for ${fm.owner.name} (${fm.relationship})`,
      idType: fm.idType,
      idNumber: fm.idNumber,
      idCardUrl: fm.idCardUrl,
      idCardBackUrl: fm.idCardBackUrl,
      idStatus: fm.idStatus || "PENDING",
      idRejectionReason: fm.idRejectionReason,
      date: new Date(fm.createdAt),
      isDocument: isRelationshipDocType(fm.idType),
    })),
  ];

  // Category partitions and pending totals
  const allPatientRecords = allRecords.filter((r) => r.recordType === "PATIENT");
  const allFamilyRecords = allRecords.filter((r) => r.recordType === "SUBPROFILE");

  const pendingPatientCount = allPatientRecords.filter((r) => r.idStatus === "PENDING").length;
  const pendingFamilyCount = allFamilyRecords.filter((r) => r.idStatus === "PENDING").length;
  const totalPendingCount = pendingPatientCount + pendingFamilyCount;

  // Filter records by search and status
  const filteredRecords = allRecords.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.subtitle.toLowerCase().includes(search.toLowerCase()) ||
      (r.idType && r.idType.toLowerCase().includes(search.toLowerCase()));

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

  const renderRecordCard = (item: FormattedRecord) => (
    <Card
      key={`${item.recordType}-${item.id}`}
      className="border border-slate-200 shadow-sm hover:border-slate-300 transition-colors flex flex-col rounded-lg overflow-hidden"
    >
      <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {item.recordType === "PATIENT" ? (
            <User className="w-3.5 h-3.5 text-slate-500" />
          ) : (
            <Users className="w-3.5 h-3.5 text-slate-500" />
          )}
          <span className="text-xs font-semibold text-slate-600">
            {item.recordType === "PATIENT" ? "Patient ID" : "Family Proof"}
          </span>
        </div>
        {getBadge(item.idStatus)}
      </div>

      <CardContent className="p-4 flex-1 flex flex-col justify-between space-y-3.5">
        <div>
          <h3 className="font-semibold text-slate-900 text-sm">{item.name}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{item.subtitle}</p>

          <div className="mt-3 p-2.5 bg-slate-50 rounded-md space-y-1 border border-slate-200/80 text-xs">
            <div className="flex justify-between gap-2">
              <span className="text-slate-500 shrink-0">
                {item.isDocument ? "Document:" : "ID Type:"}
              </span>
              <span className="font-medium text-slate-800 text-right">{item.idType || "Not Specified"}</span>
            </div>
            {item.idNumber && (
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">ID Number:</span>
                <span className="font-mono text-slate-800 font-medium">{item.idNumber}</span>
              </div>
            )}
          </div>
        </div>

        {/* ID / Document Image Thumbnails */}
        <div className="flex gap-2">
          {item.idCardUrl && (
            <div className="relative group flex-1 rounded-md overflow-hidden border border-slate-200 bg-slate-900 aspect-video flex items-center justify-center">
              <p className="absolute top-0 left-0 right-0 text-[9px] font-semibold text-center bg-slate-900/80 backdrop-blur-sm text-slate-200 py-0.5 z-10">
                {item.isDocument ? "PAGE 1" : "FRONT"}
              </p>
              {item.idCardUrl.startsWith("data:application/pdf") ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 text-slate-400 pb-2">
                  <FileText className="w-7 h-7 opacity-50 mb-1 mt-4" />
                  <span className="text-[10px] font-semibold tracking-wider">PDF</span>
                </div>
              ) : (
                <img
                  src={item.idCardUrl}
                  alt={item.isDocument ? "Document Page 1" : "ID Front"}
                  className={`w-full h-full ${item.isDocument ? "object-contain" : "object-cover"} group-hover:scale-105 transition duration-300`}
                />
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center z-20">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    setViewImageModal({
                      url: item.idCardUrl!,
                      backUrl: item.idCardBackUrl,
                      name: item.name,
                      type: item.idType || (item.isDocument ? "Supporting Document" : "ID Card"),
                      idNumber: item.idNumber || undefined,
                      isDocument: item.isDocument,
                    })
                  }
                  className="gap-1 text-xs bg-white text-slate-900 font-medium h-7 px-2.5 shadow-sm"
                >
                  <Eye className="w-3.5 h-3.5" /> View
                </Button>
              </div>
            </div>
          )}

          {item.idCardBackUrl && (
            <div className="relative group flex-1 rounded-md overflow-hidden border border-slate-200 bg-slate-900 aspect-video flex items-center justify-center">
              <p className="absolute top-0 left-0 right-0 text-[9px] font-semibold text-center bg-slate-900/80 backdrop-blur-sm text-slate-200 py-0.5 z-10">
                {item.isDocument ? "PAGE 2" : "BACK"}
              </p>
              {item.idCardBackUrl.startsWith("data:application/pdf") ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 text-slate-400 pb-2">
                  <FileText className="w-7 h-7 opacity-50 mb-1 mt-4" />
                  <span className="text-[10px] font-semibold tracking-wider">PDF</span>
                </div>
              ) : (
                <img
                  src={item.idCardBackUrl}
                  alt={item.isDocument ? "Document Page 2" : "ID Back"}
                  className={`w-full h-full ${item.isDocument ? "object-contain" : "object-cover"} group-hover:scale-105 transition duration-300`}
                />
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center z-20">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    setViewImageModal({
                      url: item.idCardUrl!,
                      backUrl: item.idCardBackUrl,
                      name: item.name,
                      type: item.idType || (item.isDocument ? "Supporting Document" : "ID Card"),
                      idNumber: item.idNumber || undefined,
                      isDocument: item.isDocument,
                    })
                  }
                  className="gap-1 text-xs bg-white text-slate-900 font-medium h-7 px-2.5 shadow-sm"
                >
                  <Eye className="w-3.5 h-3.5" /> View
                </Button>
              </div>
            </div>
          )}
        </div>

        {item.idRejectionReason && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-800 flex items-start gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
            <span><strong>Rejection Reason:</strong> {item.idRejectionReason}</span>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              setViewImageModal({
                url: item.idCardUrl!,
                backUrl: item.idCardBackUrl,
                name: item.name,
                type: item.idType || (item.isDocument ? "Supporting Document" : "ID Card"),
                idNumber: item.idNumber || undefined,
                isDocument: item.isDocument,
              })
            }
            className="flex-1 gap-1 text-slate-700 text-xs h-8 border-slate-200"
          >
            <Eye className="w-3.5 h-3.5" /> View
          </Button>

          <Button
            size="sm"
            onClick={() => handleApprove(item.id, item.recordType)}
            disabled={updating === item.id || item.idStatus !== "PENDING"}
            className="flex-1 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8"
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
            className="gap-1 text-xs px-2.5 h-8 border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
          >
            <XCircle className="w-3.5 h-3.5" /> Reject
          </Button>
        </div>
      </CardContent>
    </Card>
  );

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

      {/* View Full ID Modal */}
      {viewImageModal && (
        <Dialog open={!!viewImageModal} onOpenChange={() => setViewImageModal(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                {viewImageModal.isDocument ? "Proof of Relationship" : "ID Verification Photo"} — {viewImageModal.name}
              </DialogTitle>
              <DialogDescription>
                Document Type: <strong>{viewImageModal.type}</strong>{" "}
                {viewImageModal.idNumber ? `| Serial: ${viewImageModal.idNumber}` : ""}
              </DialogDescription>
            </DialogHeader>

            <div className={`grid ${viewImageModal.backUrl ? "grid-cols-2" : "grid-cols-1"} gap-4 rounded-xl overflow-hidden border border-slate-300 bg-slate-950 p-4 min-h-[300px] items-center`}>
              <div className="flex flex-col gap-2 items-center">
                <span className="text-white text-xs font-bold tracking-wider bg-slate-800 px-3 py-1 rounded-full">
                  {viewImageModal.isDocument ? "PAGE 1" : "FRONT"}
                </span>
                {viewImageModal.url.startsWith("data:application/pdf") ? (
                  <iframe src={viewImageModal.url} className="w-full h-[60vh] rounded border border-slate-700 bg-white" />
                ) : (
                  <img
                    src={viewImageModal.url}
                    alt={viewImageModal.isDocument ? "Full Document Page 1" : "Full ID Image Front"}
                    className="max-h-[70vh] w-auto object-contain rounded border border-slate-700"
                  />
                )}
              </div>
              {viewImageModal.backUrl && (
                <div className="flex flex-col gap-2 items-center">
                  <span className="text-white text-xs font-bold tracking-wider bg-slate-800 px-3 py-1 rounded-full">
                    {viewImageModal.isDocument ? "PAGE 2" : "BACK"}
                  </span>
                  {viewImageModal.backUrl.startsWith("data:application/pdf") ? (
                    <iframe src={viewImageModal.backUrl} className="w-full h-[60vh] rounded border border-slate-700 bg-white" />
                  ) : (
                    <img
                      src={viewImageModal.backUrl}
                      alt={viewImageModal.isDocument ? "Full Document Page 2" : "Full ID Image Back"}
                      className="max-h-[70vh] w-auto object-contain rounded border border-slate-700"
                    />
                  )}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button onClick={() => setViewImageModal(null)} className="w-full sm:w-auto">
                Close Viewer
              </Button>
            </DialogFooter>
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
