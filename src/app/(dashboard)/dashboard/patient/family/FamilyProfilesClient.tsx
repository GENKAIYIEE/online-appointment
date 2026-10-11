"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Users,
  UserPlus,
  Pencil,
  Trash2,
  Baby,
  HeartHandshake,
  User,
  Calendar,
  Venus,
  Mars,
  Loader2,
  Info,
  Activity,
} from "lucide-react";
import { addSubProfile, updateSubProfile, deleteSubProfile } from "@/actions/sub-profiles";
import type { SubProfileData } from "@/actions/sub-profiles";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";

// ─── Types ────────────────────────────────────────────────────────────────────

type SubProfile = {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  birthday?: Date | null;
  gender?: string | null;
  relationship: string;
  idType?: string | null;
  idNumber?: string | null;
  idCardUrl?: string | null;
  idCardBackUrl?: string | null;
  idStatus?: string | null;
  idRejectionReason?: string | null;
  createdAt: Date;
};

type FamilyProfilesClientProps = {
  ownerName: string;
  initialProfiles: SubProfile[];
};

// ─── Constants ────────────────────────────────────────────────────────────────

const RELATIONSHIP_OPTIONS = [
  "Child",
  "Spouse",
  "Parent",
  "Sibling",
  "Grandchild",
  "Grandparent",
  "Other",
];

const GENDER_OPTIONS = ["Male", "Female"];

const RELATIONSHIP_ICONS: Record<string, any> = {
  Child: Baby,
  Spouse: HeartHandshake,
  Parent: User,
  Sibling: Users,
  Grandchild: Baby,
  Grandparent: User,
  Other: User,
};

const RELATIONSHIP_COLORS: Record<string, string> = {
  Child: "bg-sky-100 text-sky-700 border-sky-200",
  Spouse: "bg-rose-100 text-rose-700 border-rose-200",
  Parent: "bg-violet-100 text-violet-700 border-violet-200",
  Sibling: "bg-amber-100 text-amber-700 border-amber-200",
  Grandchild: "bg-cyan-100 text-cyan-700 border-cyan-200",
  Grandparent: "bg-indigo-100 text-indigo-700 border-indigo-200",
  Other: "bg-slate-100 text-slate-700 border-slate-200",
};

// ─── Helper ───────────────────────────────────────────────────────────────────

function calculateAge(birthday: Date): number {
  const today = new Date();
  const dob = new Date(birthday);
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Manila",
  });
}

import { RelationshipDocumentUploader } from "@/components/ui/relationship-document-uploader";
import { isRelationshipDocType } from "@/lib/relationship-documents";
import { FileCheck2, CheckCircle2, AlertCircle, Clock } from "lucide-react";

function DocumentStatusBadge({ status }: { status?: string | null }) {
  if (status === "VERIFIED") {
    return (
      <span className="ml-auto inline-flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded-full border border-emerald-200">
        <CheckCircle2 className="w-3 h-3" /> Verified
      </span>
    );
  }
  if (status === "REJECTED") {
    return (
      <span className="ml-auto inline-flex items-center gap-1 text-[10px] bg-red-100 text-red-700 font-semibold px-2 py-0.5 rounded-full border border-red-200">
        <AlertCircle className="w-3 h-3" /> Rejected
      </span>
    );
  }
  if (status === "PENDING") {
    return (
      <span className="ml-auto inline-flex items-center gap-1 text-[10px] bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full border border-amber-200">
        <Clock className="w-3 h-3" /> Pending Review
      </span>
    );
  }
  return (
    <span className="ml-auto inline-flex items-center gap-1 text-[10px] bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-full border border-slate-200">
      Not Submitted
    </span>
  );
}

type FormState = {
  firstName: string;
  lastName: string;
  middleName: string;
  birthday: string;
  gender: string;
  relationship: string;
  idType: string;
  idCardUrl: string;
  idCardBackUrl: string;
};

const EMPTY_FORM: FormState = {
  firstName: "",
  lastName: "",
  middleName: "",
  birthday: "",
  gender: "",
  relationship: "",
  idType: "",
  idCardUrl: "",
  idCardBackUrl: "",
};

function ProfileForm({
  value,
  onChange,
}: {
  value: FormState;
  onChange: (v: FormState) => void;
}) {
  const inputCls =
    "w-full border border-slate-200 rounded-[8px] px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition placeholder-slate-400";
  const labelCls = "block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1";

  return (
    <div className="flex-1 min-h-0 overflow-y-auto grid grid-cols-1 gap-4 pl-1 pr-2 pb-2">
      {/* First Name */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>First Name <span className="text-red-500">*</span></label>
          <input
            className={inputCls}
            placeholder="e.g. Maria"
            value={value.firstName}
            onChange={(e) => onChange({ ...value, firstName: e.target.value })}
          />
        </div>
        <div>
          <label className={labelCls}>Last Name <span className="text-red-500">*</span></label>
          <input
            className={inputCls}
            placeholder="e.g. Santos"
            value={value.lastName}
            onChange={(e) => onChange({ ...value, lastName: e.target.value })}
          />
        </div>
      </div>

      {/* Middle Name */}
      <div>
        <label className={labelCls}>Middle Name <span className="text-slate-400 font-normal">(optional)</span></label>
        <input
          className={inputCls}
          placeholder="e.g. Cruz"
          value={value.middleName}
          onChange={(e) => onChange({ ...value, middleName: e.target.value })}
        />
      </div>

      {/* Relationship */}
      <div>
        <label className={labelCls}>Relationship <span className="text-red-500">*</span></label>
        <select
          className={inputCls}
          value={value.relationship}
          onChange={(e) => onChange({ ...value, relationship: e.target.value })}
        >
          <option value="">Select relationship...</option>
          {RELATIONSHIP_OPTIONS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      {/* Birthday & Gender */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Birthday</label>
          <input
            type="date"
            className={inputCls}
            value={value.birthday}
            max={new Date().toISOString().split("T")[0]}
            onChange={(e) => onChange({ ...value, birthday: e.target.value })}
          />
        </div>
        <div>
          <label className={labelCls}>Sex</label>
          <select
            className={inputCls}
            value={value.gender}
            onChange={(e) => onChange({ ...value, gender: e.target.value })}
          >
            <option value="">Select...</option>
            {GENDER_OPTIONS.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Proof of Relationship (stored in idType / idCardUrl / idCardBackUrl) */}
      <RelationshipDocumentUploader
        relationship={value.relationship}
        docType={value.idType}
        page1Url={value.idCardUrl}
        page2Url={value.idCardBackUrl}
        onDocTypeChange={(idType) => onChange({ ...value, idType })}
        onPage1Change={(idCardUrl) => onChange({ ...value, idCardUrl })}
        onPage2Change={(idCardBackUrl) => onChange({ ...value, idCardBackUrl })}
        required
      />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function FamilyProfilesClient({ ownerName, initialProfiles }: FamilyProfilesClientProps) {
  const [profiles, setProfiles] = useState<SubProfile[]>(initialProfiles);
  const [isPending, startTransition] = useTransition();

  // Add dialog
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<FormState>(EMPTY_FORM);

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SubProfile | null>(null);
  const [editForm, setEditForm] = useState<FormState>(EMPTY_FORM);

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SubProfile | null>(null);

  // ── Add ──
  function handleOpenAdd() {
    setAddForm(EMPTY_FORM);
    setAddOpen(true);
  }

  /** Shared client-side validation for add + edit. Server re-validates. */
  function validateForm(form: FormState): boolean {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.relationship) {
      toast.error("Please fill in First Name, Last Name, and Relationship.");
      return false;
    }
    if (!isRelationshipDocType(form.idType)) {
      toast.error("Please select the type of supporting document (e.g. Birth Certificate).");
      return false;
    }
    if (!form.idCardUrl) {
      toast.error("Please upload or take a photo of the proof of relationship document.");
      return false;
    }
    return true;
  }

  function handleAdd() {
    if (!validateForm(addForm)) return;
    startTransition(async () => {
      const result = await addSubProfile(addForm as SubProfileData);
      if (result.success && result.data) {
        setProfiles((prev) => [...prev, result.data as SubProfile]);
        setAddOpen(false);
        toast.success(
          `${result.data.firstName} has been added. Their proof of relationship is now pending review.`
        );
      } else {
        toast.error(result.error ?? "Failed to add profile.");
      }
    });
  }

  // ── Edit ──
  function handleOpenEdit(profile: SubProfile) {
    setEditTarget(profile);
    setEditForm({
      firstName: profile.firstName,
      lastName: profile.lastName,
      middleName: profile.middleName ?? "",
      birthday: profile.birthday
        ? new Date(profile.birthday).toISOString().split("T")[0]
        : "",
      gender: profile.gender ?? "",
      relationship: profile.relationship,
      // Legacy profiles stored a government ID type here; clear it so the user
      // is prompted to pick a proper relationship document type.
      idType: isRelationshipDocType(profile.idType) ? profile.idType : "",
      idCardUrl: profile.idCardUrl ?? "",
      idCardBackUrl: profile.idCardBackUrl ?? "",
    });
    setEditOpen(true);
  }

  function handleEdit() {
    if (!editTarget) return;
    if (!validateForm(editForm)) return;

    // Only send documents that actually changed. `undefined` = keep existing,
    // "" for page 2 = remove it. This avoids re-uploading large images (and
    // hitting the Server Action body limit) on simple name/birthday edits.
    const page1Changed = editForm.idCardUrl !== (editTarget.idCardUrl ?? "");
    const page2Changed = editForm.idCardBackUrl !== (editTarget.idCardBackUrl ?? "");
    const payload: SubProfileData = {
      ...editForm,
      idCardUrl: page1Changed ? editForm.idCardUrl : undefined,
      idCardBackUrl: page2Changed ? editForm.idCardBackUrl : undefined,
    };

    startTransition(async () => {
      const result = await updateSubProfile(editTarget.id, payload);
      if (result.success && result.data) {
        setProfiles((prev) =>
          prev.map((p) => (p.id === editTarget.id ? (result.data as SubProfile) : p))
        );
        setEditOpen(false);
        toast.success(
          result.data.idStatus === "PENDING" && editTarget.idStatus !== "PENDING"
            ? `${result.data.firstName}'s profile was updated and sent for re-verification.`
            : `${result.data.firstName}'s profile has been updated.`
        );
      } else {
        toast.error(result.error ?? "Failed to update profile.");
      }
    });
  }

  // ── Delete ──
  function handleOpenDelete(profile: SubProfile) {
    setDeleteTarget(profile);
    setDeleteOpen(true);
  }

  function handleDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result = await deleteSubProfile(deleteTarget.id);
      if (result.success) {
        setProfiles((prev) => prev.filter((p) => p.id !== deleteTarget.id));
        setDeleteOpen(false);
        toast.success(`${deleteTarget.firstName}'s profile has been removed.`);
      } else {
        toast.error(result.error ?? "Failed to delete profile.");
        setDeleteOpen(false);
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-3xl font-bold mb-2 text-white flex items-center gap-3">
            <Users className="w-8 h-8" />
            Family Profiles
          </h1>
          <p className="text-emerald-100 max-w-lg">
            Add family or household members so you can book appointments on their behalf — all
            from your single account, <strong className="text-white">{ownerName}</strong>.
          </p>
        </div>
        <HeartHandshake className="absolute right-10 -bottom-8 w-44 h-44 text-white/10" />
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 bg-sky-50 border border-sky-200 rounded-xl p-4 text-sm text-sky-800">
        <Info className="w-4 h-4 mt-0.5 shrink-0 text-sky-500" />
        <span>
          Family profiles let you book appointments for children, spouses, or other household
          members without creating separate accounts. Sub-profiles do not have login access —
          all bookings are managed from your account.
        </span>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {profiles.length} of 10 profiles used
        </p>
        <Button
          id="add-family-profile-btn"
          onClick={handleOpenAdd}
          disabled={profiles.length >= 10}
          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
        >
          <UserPlus className="w-4 h-4" />
          Add Family Member
        </Button>
      </div>

      {/* Profile Grid */}
      {profiles.length === 0 ? (
        <Card className="border-dashed border-slate-200">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-4">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center">
              <Users className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800">No family profiles yet</h3>
              <p className="text-sm text-slate-500 max-w-sm mt-1">
                Add your first family member to start booking appointments on their behalf.
              </p>
            </div>
            <Button
              onClick={handleOpenAdd}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Add Your First Member
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((profile) => {
            const RelIcon = RELATIONSHIP_ICONS[profile.relationship] ?? User;
            const colorCls = RELATIONSHIP_COLORS[profile.relationship] ?? RELATIONSHIP_COLORS.Other;
            const fullName = [profile.firstName, profile.middleName, profile.lastName]
              .filter(Boolean)
              .join(" ");

            return (
              <Card
                key={profile.id}
                className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
              >
                {/* Card top accent */}
                <div className="h-1.5 bg-gradient-to-r from-emerald-400 to-teal-400" />
                <CardContent className="p-5 space-y-4">
                  {/* Name + Relationship */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                        <RelIcon className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 leading-tight">{fullName}</p>
                        <span
                          className={`inline-flex items-center gap-1 mt-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${colorCls}`}
                        >
                          {profile.relationship}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-1.5 text-sm text-slate-600 border-t border-slate-100 pt-3">
                    {profile.birthday && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {formatDate(profile.birthday)} · {calculateAge(profile.birthday)} yrs old
                        </span>
                      </div>
                    )}
                    {profile.gender && (
                      <div className="flex items-center gap-2">
                        {profile.gender === "Female" ? (
                          <Venus className="w-3.5 h-3.5 text-pink-400" />
                        ) : (
                          <Mars className="w-3.5 h-3.5 text-blue-400" />
                        )}
                        <span>{profile.gender}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 pt-1 text-xs">
                      <FileCheck2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="font-medium text-slate-700 truncate">
                        {profile.idCardUrl
                          ? profile.idType || "Supporting Document Attached"
                          : "No proof of relationship"}
                      </span>
                      <DocumentStatusBadge status={profile.idCardUrl ? profile.idStatus : null} />
                    </div>
                    {profile.idStatus === "REJECTED" && profile.idRejectionReason && (
                      <p className="text-[11px] text-red-600 bg-red-50 border border-red-100 rounded-md px-2 py-1.5 leading-snug">
                        <strong>Reason:</strong> {profile.idRejectionReason} — click <em>Edit</em> to upload a new
                        document.
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 pt-1">
                    <a
                      href={`/dashboard/patient/itr?subProfileId=${profile.id}`}
                      className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 h-9 px-3 w-full gap-2"
                    >
                      <Activity className="w-4 h-4" />
                      Manage Medical Record
                    </a>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-slate-600 hover:text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50 gap-1.5"
                        onClick={() => handleOpenEdit(profile)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-slate-600 hover:text-red-600 hover:border-red-300 hover:bg-red-50 gap-1.5"
                        onClick={() => handleOpenDelete(profile)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remove
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Add Dialog ── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Family Member</DialogTitle>
            <DialogDescription>
              Fill in the details of the family or household member you'd like to add.
            </DialogDescription>
          </DialogHeader>
          <ProfileForm value={addForm} onChange={setAddForm} />
          <DialogFooter>
            <DialogClose render={<Button variant="outline">Cancel</Button>} />
            <Button
              id="confirm-add-profile-btn"
              onClick={handleAdd}
              disabled={isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Add Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Update the details for {editTarget?.firstName ?? "this member"}.
            </DialogDescription>
          </DialogHeader>
          <ProfileForm value={editForm} onChange={setEditForm} />
          <DialogFooter>
            <DialogClose render={<Button variant="outline">Cancel</Button>} />
            <Button
              id="confirm-edit-profile-btn"
              onClick={handleEdit}
              disabled={isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ── */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Family Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove{" "}
              <strong>{deleteTarget?.firstName} {deleteTarget?.lastName}</strong> from your family
              profiles? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline">Cancel</Button>} />
            <Button
              id="confirm-delete-profile-btn"
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Yes, Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
