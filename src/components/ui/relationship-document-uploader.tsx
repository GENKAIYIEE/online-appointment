"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Upload,
  Camera,
  CheckCircle2,
  X,
  FileCheck2,
  FileText,
  FilePlus2,
  Lightbulb,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CameraModal } from "@/components/ui/id-scanner";
import {
  RELATIONSHIP_DOC_TYPES,
  RELATIONSHIP_DOC_HINTS,
  RELATIONSHIP_DOC_MIME_TYPES,
  MAX_DOC_DATA_URL_LENGTH,
} from "@/lib/relationship-documents";
import { compressToJpegDataUrl } from "@/lib/image";

// ─── Image compression ────────────────────────────────────────────────────────
// Phone photos are often 3–8 MB. Server Actions have a request body limit and
// documents are stored as data URLs, so we downscale + re-encode on the client.

const MAX_SOURCE_BYTES = 10 * 1024 * 1024; // reject absurdly large originals early

// ─── Single Page Panel ────────────────────────────────────────────────────────

type PagePanelProps = {
  pageNumber: 1 | 2;
  required: boolean;
  imageUrl: string;
  onImageChange: (url: string) => void;
};

function DocumentPagePanel({ pageNumber, required, imageUrl, onImageChange }: PagePanelProps) {
  const [processing, setProcessing] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const label = pageNumber === 1 ? "Page 1 — Main Document" : "Page 2 — Additional Page";
  const Icon = pageNumber === 1 ? FileText : FilePlus2;
  const inputId = `relationship-doc-page-${pageNumber}`;

  const runCompression = async (src: string, revoke?: () => void) => {
    setProcessing(true);
    try {
      const compressed = await compressToJpegDataUrl(src);
      if (compressed.length > MAX_DOC_DATA_URL_LENGTH) throw new Error("too-large");
      if (mountedRef.current) onImageChange(compressed);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "";
      const msg =
        errorMsg === "decode-failed"
          ? "This image format isn't supported. Please use a JPG, PNG, or WEBP photo."
          : errorMsg === "too-large"
          ? "This image is too large to process. Please try a smaller photo."
          : "Couldn't process this image. Please try again.";
      toast.error(msg);
    } finally {
      revoke?.();
      if (mountedRef.current) setProcessing(false);
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;

    if (!(RELATIONSHIP_DOC_MIME_TYPES as readonly string[]).includes(file.type)) {
      toast.error("Please upload a JPG, PNG, or PDF file.");
      return;
    }
    if (file.type === "application/pdf") {
      if (file.size > 1.5 * 1024 * 1024) {
        toast.error("PDF files must be under 1.5MB. Please compress it or take a photo instead.");
        return;
      }
      setProcessing(true);
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") onImageChange(reader.result);
        setProcessing(false);
      };
      reader.readAsDataURL(file);
      return;
    }

    if (file.size > MAX_SOURCE_BYTES) {
      toast.error("Image file size must be under 10MB.");
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    runCompression(objectUrl, () => URL.revokeObjectURL(objectUrl));
  };

  const handleCapture = (dataUrl: string) => {
    setCameraOpen(false);
    runCompression(dataUrl);
  };

  return (
    <div className="min-w-0">
      {cameraOpen && (
        <CameraModal
          sideLabel={`Page ${pageNumber}`}
          onCapture={handleCapture}
          onClose={() => setCameraOpen(false)}
        />
      )}

      <div className="flex items-center gap-1.5 mb-2">
        <Icon className="w-3.5 h-3.5 text-emerald-600" />
        <span className="text-xs font-semibold text-slate-700">{label}</span>
        {required ? (
          <span className="text-red-500 text-xs">*</span>
        ) : (
          <span className="text-[10px] text-slate-400 font-normal">(optional)</span>
        )}
        {imageUrl && !processing && (
          <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> Attached
          </span>
        )}
      </div>

      {imageUrl ? (
        <div className="relative rounded-xl overflow-hidden border-2 border-emerald-500 bg-white">
          <div className="relative w-full h-48 bg-slate-100 flex items-center justify-center">
            {imageUrl.startsWith("data:application/pdf") ? (
              <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
                <FileText className="w-12 h-12 text-emerald-600/50" />
                <span className="text-xs font-semibold">PDF Document</span>
              </div>
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={imageUrl}
                alt={`Proof of relationship page ${pageNumber}`}
                className="max-h-full max-w-full object-contain"
              />
            )}
            {processing && (
              <div className="absolute inset-0 bg-emerald-950/60 backdrop-blur-[2px] flex flex-col items-center justify-center gap-1.5 text-white">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-300" />
                <span className="text-[10px] font-semibold text-emerald-100">Optimizing...</span>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between px-2 py-1.5 border-t border-emerald-100">
            <span className="text-[10px] font-semibold text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Document ready
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onImageChange("")}
              disabled={processing}
              className="text-[10px] text-red-600 hover:text-red-700 hover:bg-red-50 h-6 px-1.5 gap-1"
            >
              <X className="w-3 h-3" /> Remove
            </Button>
          </div>
        </div>
      ) : (
        <div className="border-2 border-dashed border-slate-300 hover:border-emerald-400 transition-colors rounded-xl p-4 bg-white flex flex-col items-center justify-center text-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
            {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Icon className="w-5 h-5" />}
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-700">
              {processing ? "Optimizing..." : `Attach ${pageNumber === 1 ? "document" : "another page"}`}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">JPG, PNG (up to 10MB) or PDF (up to 1.5MB)</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 w-full">
            <Button
              id={`${inputId}-upload-btn`}
              type="button"
              variant="outline"
              size="sm"
              disabled={processing}
              onClick={() => fileRef.current?.click()}
              className="flex-1 text-xs gap-1.5 border-slate-300 hover:border-emerald-500 hover:bg-emerald-50 text-slate-700"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-600" /> Upload
            </Button>
            <Button
              id={`${inputId}-camera-btn`}
              type="button"
              variant="outline"
              size="sm"
              disabled={processing}
              onClick={() => setCameraOpen(true)}
              className="flex-1 text-xs gap-1.5 border-slate-300 hover:border-emerald-500 hover:bg-emerald-50 text-slate-700"
            >
              <Camera className="w-3.5 h-3.5 text-emerald-600" /> Take Photo
            </Button>
          </div>
          <input
            id={inputId}
            type="file"
            ref={fileRef}
            accept={(RELATIONSHIP_DOC_MIME_TYPES as readonly string[]).join(",")}
            onChange={handleFile}
            className="hidden"
          />
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export interface RelationshipDocumentUploaderProps {
  relationship: string;
  docType: string;
  page1Url: string;
  page2Url: string;
  onDocTypeChange: (val: string) => void;
  onPage1Change: (val: string) => void;
  onPage2Change: (val: string) => void;
  required?: boolean;
}

export function RelationshipDocumentUploader({
  relationship,
  docType,
  page1Url,
  page2Url,
  onDocTypeChange,
  onPage1Change,
  onPage2Change,
  required = true,
}: RelationshipDocumentUploaderProps) {
  const hint = relationship ? RELATIONSHIP_DOC_HINTS[relationship] : null;
  const pageCount = (page1Url ? 1 : 0) + (page2Url ? 1 : 0);

  return (
    <section
      aria-labelledby="proof-of-relationship-heading"
      className="space-y-4 bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileCheck2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <h4 id="proof-of-relationship-heading" className="font-bold text-slate-800 text-sm sm:text-base">
            Proof of Relationship {required && <span className="text-red-500">*</span>}
          </h4>
        </div>
        {pageCount > 0 && (
          <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" /> {pageCount} {pageCount === 1 ? "page" : "pages"}
          </span>
        )}
      </div>

      <p className="text-xs text-slate-500 leading-relaxed">
        Upload a supporting document that shows your relationship with this family member, such as a{" "}
        <strong className="text-slate-700">birth certificate</strong> or{" "}
        <strong className="text-slate-700">marriage certificate</strong>. Our staff will review it before the
        profile is verified.
      </p>

      {/* Relationship-aware guidance */}
      {hint && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
          <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <span>
            <strong className="font-semibold">For a {relationship.toLowerCase()}:</strong> {hint}
          </span>
        </div>
      )}

      {/* Document Type */}
      <div className="space-y-1.5">
        <Label htmlFor="relationship-doc-type" className="text-xs font-semibold text-slate-700">
          Document Type {required && <span className="text-red-500">*</span>}
        </Label>
        <select
          id="relationship-doc-type"
          value={docType}
          onChange={(e) => onDocTypeChange(e.target.value)}
          className="w-full h-10 border border-slate-200 rounded-lg px-3 py-2 text-xs sm:text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">Select document type...</option>
          {RELATIONSHIP_DOC_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {/* Pages */}
      <div className="flex flex-col gap-3">
        <DocumentPagePanel pageNumber={1} required imageUrl={page1Url} onImageChange={onPage1Change} />
        <DocumentPagePanel pageNumber={2} required={false} imageUrl={page2Url} onImageChange={onPage2Change} />
      </div>

      <p className="text-[11px] text-slate-400 leading-relaxed">
        Make sure all names and details are clear and readable. Documents are only visible to authorized RHU
        staff.
      </p>
    </section>
  );
}
