"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Upload,
  Camera,
  CheckCircle2,
  Scan,
  ShieldCheck,
  X,
  CreditCard,
  FlipHorizontal,
  VideoOff,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { compressToJpegDataUrl } from "@/lib/image";
import { GOV_ID_TYPES } from "@/lib/government-ids";

// Single source of truth lives in @/lib/government-ids so the server can validate against it.
export const ID_TYPES = GOV_ID_TYPES;

export interface IDScannerProps {
  idType: string;
  idCardUrl: string;
  idCardBackUrl: string;
  onIdTypeChange: (val: string) => void;
  onIdCardChange: (val: string) => void;
  onIdCardBackChange: (val: string) => void;
  label?: string;
  required?: boolean;
  stacked?: boolean;
}

// ─── Camera Modal ─────────────────────────────────────────────────────────────

type CameraModalProps = {
  sideLabel: string;
  onCapture: (dataUrl: string) => void;
  onClose: () => void;
};

export function CameraModal({ sideLabel, onCapture, onClose }: CameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    let active = true;

    const startStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setReady(true);
      } catch (err: unknown) {
        if (!active) return;
        const name = err instanceof Error ? err.name : "";
        if (name === "NotAllowedError") {
          setError("Camera permission was denied. Please allow camera access in your browser settings.");
        } else if (name === "NotFoundError") {
          setError("No camera found on this device.");
        } else {
          setError("Unable to access camera. Try uploading a photo instead.");
        }
      }
    };

    startStream();

    return () => {
      active = false;
      stopStream();
    };
  }, [stopStream]);

  const handleCapture = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 1280;
    canvas.height = videoRef.current.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    stopStream();
    onCapture(dataUrl);
  };

  const handleClose = () => {
    stopStream();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-slate-900 rounded-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-semibold text-white">
              Capture {sideLabel}
            </span>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera View */}
        <div className="relative aspect-video w-full bg-black flex items-center justify-center">
          {error ? (
            <div className="flex flex-col items-center gap-3 text-center px-6">
              <VideoOff className="w-10 h-10 text-slate-500" />
              <p className="text-sm text-slate-400">{error}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClose}
                className="text-xs border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                Close
              </Button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {/* Viewfinder overlay */}
              {ready && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-4/5 h-3/4 border-2 border-emerald-400/70 rounded-lg relative">
                    {/* Corner accents */}
                    <span className="absolute -top-0.5 -left-0.5 w-4 h-4 border-t-2 border-l-2 border-emerald-400 rounded-tl" />
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 border-t-2 border-r-2 border-emerald-400 rounded-tr" />
                    <span className="absolute -bottom-0.5 -left-0.5 w-4 h-4 border-b-2 border-l-2 border-emerald-400 rounded-bl" />
                    <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 border-b-2 border-r-2 border-emerald-400 rounded-br" />
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="text-white text-[11px] bg-black/50 px-2 py-0.5 rounded-full backdrop-blur-sm">
                        Align {sideLabel} within frame
                      </span>
                    </span>
                  </div>
                </div>
              )}
              {!ready && !error && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2">
                    <Camera className="w-8 h-8 text-slate-500 animate-pulse" />
                    <span className="text-xs text-slate-500">Starting camera...</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Controls */}
        {!error && (
          <div className="flex items-center justify-center gap-3 px-4 py-4 bg-slate-900">
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              className="text-slate-400 hover:text-white hover:bg-slate-700 text-sm"
            >
              Cancel
            </Button>
            <button
              type="button"
              onClick={handleCapture}
              disabled={!ready}
              className="w-14 h-14 rounded-full bg-white hover:bg-emerald-50 border-4 border-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center justify-center shadow-lg"
              title="Capture photo"
            >
              <span className="w-10 h-10 rounded-full bg-emerald-500 block" />
            </button>
            <div className="w-[68px]" />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Single Side Upload/Camera Panel ─────────────────────────────────────────

type SidePanelProps = {
  side: "front" | "back";
  imageUrl: string;
  onImageChange: (url: string) => void;
};

function IDSidePanel({ side, imageUrl, onImageChange }: SidePanelProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const fileUploadRef = useRef<HTMLInputElement>(null);

  const isFront = side === "front";
  const sideLabel = isFront ? "Front Side" : "Back Side";
  const SideIcon = isFront ? CreditCard : FlipHorizontal;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type === "application/pdf") {
      if (file.size > 1.5 * 1024 * 1024) {
        toast.error("PDF files must be under 1.5MB. Please compress it or take a photo instead.");
        return;
      }
      setIsScanning(true);
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") onImageChange(reader.result);
        setIsScanning(false);
      };
      reader.readAsDataURL(file);
      e.target.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image file size must be under 10MB");
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    processImage(objectUrl, () => URL.revokeObjectURL(objectUrl));
    e.target.value = "";
  };

  const processImage = async (src: string, revoke?: () => void) => {
    setIsScanning(true);
    try {
      const compressed = await compressToJpegDataUrl(src);
      onImageChange(compressed);
    } catch {
      toast.error("Failed to process image. Please try a different photo.");
    } finally {
      revoke?.();
      setIsScanning(false);
    }
  };

  const handleCameraCapture = (dataUrl: string) => {
    setCameraOpen(false);
    processImage(dataUrl);
  };

  return (
    <div className="flex-1 min-w-0">
      {/* Camera Modal */}
      {cameraOpen && (
        <CameraModal
          sideLabel={sideLabel}
          onCapture={handleCameraCapture}
          onClose={() => setCameraOpen(false)}
        />
      )}

      {/* Side Label */}
      <div className="flex items-center gap-1.5 mb-2">
        <SideIcon className="w-3.5 h-3.5 text-emerald-600" />
        <span className="text-xs font-semibold text-slate-700">{sideLabel}</span>
        <span className="text-red-500 text-xs">*</span>
        {imageUrl && !isScanning && (
          <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> Captured
          </span>
        )}
      </div>

      {/* Image preview or upload box */}
      {imageUrl ? (
        <div className="relative rounded-xl overflow-hidden border-2 border-emerald-500 bg-emerald-950/5">
          <div className="relative aspect-video w-full rounded-t-xl overflow-hidden bg-slate-900">
            {imageUrl.startsWith("data:application/pdf") ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-500">
                <FileText className="w-12 h-12 text-emerald-600/50" />
                <span className="text-xs font-semibold">PDF Document</span>
              </div>
            ) : (
              <img src={imageUrl} alt={`ID ${sideLabel}`} className="w-full h-full object-contain" />
            )}
            {isScanning && (
              <div className="absolute inset-0 bg-emerald-950/60 backdrop-blur-[2px] flex flex-col items-center justify-center text-white space-y-1.5">
                <Scan className="w-8 h-8 text-emerald-400 animate-pulse" />
                <span className="text-[10px] font-semibold text-emerald-200 animate-bounce">
                  Processing...
                </span>
                <div className="w-32 h-1 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400 animate-pulse w-full" />
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between px-2 py-1.5">
            <span className="text-[10px] font-semibold text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Photo ready
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onImageChange("")}
              className="text-[10px] text-red-600 hover:text-red-700 hover:bg-red-50 h-6 px-1.5 gap-1"
            >
              <X className="w-3 h-3" /> Remove
            </Button>
          </div>
        </div>
      ) : (
        <div className="border-2 border-dashed border-slate-300 hover:border-emerald-400 transition-colors rounded-xl p-4 bg-white flex flex-col items-center justify-center text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Scan className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-700">{sideLabel}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">JPG, PNG (up to 10MB) or PDF (up to 1.5MB)</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 w-full">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileUploadRef.current?.click()}
              className="flex-1 text-xs gap-1.5 border-slate-300 hover:border-emerald-500 hover:bg-emerald-50 text-slate-700"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-600" /> Upload
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCameraOpen(true)}
              className="flex-1 text-xs gap-1.5 border-slate-300 hover:border-emerald-500 hover:bg-emerald-50 text-slate-700"
            >
              <Camera className="w-3.5 h-3.5 text-emerald-600" /> Take Photo
            </Button>
          </div>
          <input
            type="file"
            ref={fileUploadRef}
            accept="image/*,application/pdf"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      )}
    </div>
  );
}

// ─── Main IDScanner Component ─────────────────────────────────────────────────

export function IDScanner({
  idType,
  idCardUrl,
  idCardBackUrl,
  onIdTypeChange,
  onIdCardChange,
  onIdCardBackChange,
  label = "Government-Issued ID Verification",
  required = true,
  stacked = false,
}: IDScannerProps) {
  const bothCaptured = !!idCardUrl && !!idCardBackUrl;

  return (
    <div className="space-y-4 bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          <h4 className="font-bold text-slate-800 text-sm sm:text-base">
            {label} {required && <span className="text-red-500">*</span>}
          </h4>
        </div>
        {bothCaptured && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" /> Both Sides Captured
          </span>
        )}
      </div>

      <p className="text-xs text-slate-500 leading-relaxed">
        Select your ID type and upload or snap a clear photo of{" "}
        <strong className="text-slate-700">both the front and back</strong> of your valid government ID.
      </p>

      {/* ID Type */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-slate-700">
          Select ID Type {required && <span className="text-red-500">*</span>}
        </Label>
        <select
          value={idType}
          onChange={(e) => onIdTypeChange(e.target.value)}
          className="w-full h-10 border border-slate-200 rounded-lg px-3 py-2 text-xs sm:text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">Select ID Type...</option>
          {ID_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {/* Front & Back panels */}
      <div className={`flex flex-col ${stacked ? "" : "sm:flex-row"} gap-3`}>
        <IDSidePanel side="front" imageUrl={idCardUrl} onImageChange={onIdCardChange} />
        <IDSidePanel side="back" imageUrl={idCardBackUrl} onImageChange={onIdCardBackChange} />
      </div>

      {/* Progress hints */}
      {!bothCaptured && (
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <div className={`w-2 h-2 rounded-full ${idCardUrl ? "bg-emerald-500" : "bg-slate-300"}`} />
          <span className={idCardUrl ? "text-emerald-700 font-medium" : ""}>Front side</span>
          <div className={`w-2 h-2 rounded-full ${idCardBackUrl ? "bg-emerald-500" : "bg-slate-300"}`} />
          <span className={idCardBackUrl ? "text-emerald-700 font-medium" : ""}>Back side</span>
        </div>
      )}
    </div>
  );
}
