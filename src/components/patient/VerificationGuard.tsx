"use client";

import { useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ShieldAlert,
  ShieldCheck,
  Clock,
  AlertTriangle,
  Loader2,
  FileCheck2,
  Lock,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { IDScanner } from "@/components/ui/id-scanner";
import { submitPatientIDVerification } from "@/actions/users";
import { logoutUser } from "@/actions/auth";

interface VerificationGuardProps {
  idStatus: string | null;
  idRejectionReason: string | null;
  hasUploadedId: boolean;
  children: ReactNode;
}

export function VerificationGuard({
  idStatus: initialStatus,
  idRejectionReason: initialRejectionReason,
  hasUploadedId: initialHasUploaded,
  children,
}: VerificationGuardProps) {
  const [currentStatus, setCurrentStatus] = useState<string | null>(initialStatus);
  const [currentUploaded, setCurrentUploaded] = useState<boolean>(initialHasUploaded);
  const [currentRejectionReason, setCurrentRejectionReason] = useState<string | null>(
    initialRejectionReason
  );

  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logoutUser();
      router.push("/login");
    } catch {
      setIsLoggingOut(false);
      toast.error("Failed to sign out. Please refresh the page.");
    }
  };

  // Form state for account update / ID submission
  const [idType, setIdType] = useState("");
  const [idCardUrl, setIdCardUrl] = useState("");
  const [idCardBackUrl, setIdCardBackUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Account is VERIFIED: allow normal access to the patient dashboard
  if (currentStatus === "VERIFIED") {
    return <>{children}</>;
  }

  // 2. ID has been submitted and is PENDING review by admin
  if (currentUploaded && currentStatus === "PENDING") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 py-8">
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 max-w-lg w-full text-center space-y-6">
          <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl border border-amber-200 flex items-center justify-center mx-auto shadow-inner">
            <Clock className="w-8 h-8 animate-pulse" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              Verification In Progress
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800">
              Account Verification Pending
            </h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              Your Government-Issued ID has been submitted and is currently under review by our RHU administrators.
              You will be able to book appointments and access full features once your account is verified.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1.5 text-left">
            <div className="font-semibold text-slate-700 flex items-center gap-1.5">
              <FileCheck2 className="w-4 h-4 text-emerald-600" /> What happens next?
            </div>
            <p className="text-slate-500 leading-normal">
              Admin review typically takes <strong>1–2 business days</strong>. Your existing medical records and account remain completely safe.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span>RHU Patient Portal</span>
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="inline-flex items-center gap-1.5 text-slate-500 hover:text-red-600 font-medium transition disabled:opacity-50"
            >
              <LogOut className="w-3.5 h-3.5" />
              {isLoggingOut ? "Signing out..." : "Sign Out"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Either No ID uploaded yet (existing patient) OR ID was REJECTED
  const isRejected = currentStatus === "REJECTED";

  const handleSubmit = async () => {
    if (!idType) {
      toast.error("Please select a valid Government ID Type.");
      return;
    }
    if (!idCardUrl) {
      toast.error("Please upload or scan the front photo of your Government ID.");
      return;
    }
    if (!idCardBackUrl) {
      toast.error("Please upload or scan the back photo of your Government ID.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitPatientIDVerification({
        idType,
        idCardUrl,
        idCardBackUrl,
      });

      if (res.success) {
        toast.success("ID submitted successfully! Your account is now pending verification.");
        setCurrentStatus("PENDING");
        setCurrentUploaded(true);
        setCurrentRejectionReason(null);
      } else {
        toast.error(res.error || "Failed to submit ID. Please try again.");
      }
    } catch {
      toast.error("An unexpected error occurred while submitting your ID.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[75vh] px-4 py-8">
      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 max-w-2xl w-full space-y-6">
        {/* Header Banner */}
        <div className="flex items-start gap-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
              isRejected
                ? "bg-red-50 text-red-600 border-red-200"
                : "bg-emerald-50 text-emerald-600 border-emerald-200"
            }`}
          >
            {isRejected ? (
              <AlertTriangle className="w-6 h-6" />
            ) : (
              <ShieldAlert className="w-6 h-6" />
            )}
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              {isRejected ? "ID Verification Needs Attention" : "Please Update Your Account"}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
              {isRejected
                ? "Your previous ID submission was not approved. Please review the reason below and submit a clear, updated copy."
                : "In compliance with Rural Health Unit (RHU) policy, all patient accounts require a valid Government-Issued ID for identity verification. Your medical records remain unchanged; simply submit your ID below to complete your account update."}
            </p>
          </div>
        </div>

        {/* Rejection Notice if applicable */}
        {isRejected && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs sm:text-sm text-red-800 space-y-1">
            <p className="font-semibold flex items-center gap-1.5 text-red-900">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" /> Reason for Rejection:
            </p>
            <p className="pl-5 text-red-700">
              {currentRejectionReason || "The ID submitted was blurry, expired, or invalid. Please upload a clear photo of both sides."}
            </p>
          </div>
        )}

        {/* Instructions Card */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-2">
          <p className="font-semibold text-slate-800 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-600" /> Instructions for Submitting Your Valid ID:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-600 pl-1">
            <li>Choose from accepted IDs: National ID (PhilSys), UMID, Driver&apos;s License, Passport, PhilHealth, or Postal ID.</li>
            <li>Make sure all text, photos, and serial numbers are clearly legible and not blurry.</li>
            <li>Capture or upload <strong>both the front and back</strong> sides of your card.</li>
          </ul>
        </div>

        {/* ID Scanner & Uploader */}
        <div className="pt-2">
          <IDScanner
            idType={idType}
            idCardUrl={idCardUrl}
            idCardBackUrl={idCardBackUrl}
            onIdTypeChange={setIdType}
            onIdCardChange={setIdCardUrl}
            onIdCardBackChange={setIdCardBackUrl}
            label="Government ID Verification"
            required
          />
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !idType || !idCardUrl || !idCardBackUrl}
            className="w-full py-6 text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center justify-center gap-2 transition"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting Your ID...
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                {isRejected ? "Re-submit ID for Verification" : "Submit ID to Complete Account Update"}
              </>
            )}
          </Button>
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span>Encrypted RHU Patient Portal</span>
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="inline-flex items-center gap-1.5 text-slate-500 hover:text-red-600 font-medium transition disabled:opacity-50"
          >
            <LogOut className="w-3.5 h-3.5" />
            {isLoggingOut ? "Signing out..." : "Sign Out"}
          </button>
        </div>
      </div>
    </div>
  );
}
