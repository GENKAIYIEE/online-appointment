"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Clock, CheckCircle2, AlertCircle, Plus, Trash2, GripVertical } from "lucide-react";
import { updateClinicConfig } from "@/actions/clinic-config";

export function SettingsClient({
  initialConfig,
}: {
  initialConfig: { allSlots: string[]; ultrasoundSlots: string[] };
}) {
  const [allSlots, setAllSlots] = useState<string[]>(initialConfig.allSlots);
  const [ultrasoundSlots, setUltrasoundSlots] = useState<string[]>(initialConfig.ultrasoundSlots);
  
  const [newAllSlot, setNewAllSlot] = useState("");
  const [newUltraSlot, setNewUltraSlot] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const timeSlotRegex = /^(0[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/;

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const res = await updateClinicConfig({
        allSlots,
        ultrasoundSlots,
      });

      if (res.success) {
        toast.success("Clinic configuration saved successfully!");
      } else {
        toast.error(res.error || "Failed to save configuration.");
      }
    } catch {
      toast.error("An unexpected error occurred while saving.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddSlot = (type: "all" | "ultra") => {
    const value = type === "all" ? newAllSlot : newUltraSlot;
    
    if (!timeSlotRegex.test(value)) {
      toast.error("Invalid format. Use HH:MM AM/PM (e.g., 08:30 AM)");
      return;
    }

    if (type === "all") {
      if (allSlots.includes(value)) {
        toast.error("Time slot already exists.");
        return;
      }
      // Simple sort: we assume the user might want it sorted chronologically. 
      // For a robust system, custom sorting or a dedicated time parser is better.
      // But we just append here to allow admin explicit ordering.
      setAllSlots([...allSlots, value]);
      setNewAllSlot("");
    } else {
      if (ultrasoundSlots.includes(value)) {
        toast.error("Time slot already exists.");
        return;
      }
      setUltrasoundSlots([...ultrasoundSlots, value]);
      setNewUltraSlot("");
    }
  };

  const handleRemoveSlot = (type: "all" | "ultra", idx: number) => {
    if (type === "all") {
      setAllSlots(allSlots.filter((_, i) => i !== idx));
    } else {
      setUltrasoundSlots(ultrasoundSlots.filter((_, i) => i !== idx));
    }
  };

  return (
    <div className="space-y-8">
      {/* General Slots Configuration */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/50 p-5 flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">General Time Slots</h2>
            <p className="text-sm text-slate-500">Manage the available time slots for all general services.</p>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {allSlots.map((slot, idx) => (
              <div key={idx} className="flex items-center justify-between border border-slate-200 rounded-md bg-slate-50 p-2 text-sm text-slate-700 font-medium group">
                <span>{slot}</span>
                <button 
                  onClick={() => handleRemoveSlot("all", idx)}
                  className="text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remove slot"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2 max-w-sm pt-4 border-t border-slate-100">
            <input 
              type="text" 
              placeholder="e.g. 05:00 PM" 
              value={newAllSlot}
              onChange={(e) => setNewAllSlot(e.target.value.toUpperCase())}
              className="flex-1 px-3 py-2 border border-slate-200 rounded-md text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
            <button 
              onClick={() => handleAddSlot("all")}
              className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-1 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
        </div>
      </div>

      {/* Ultrasound Slots Configuration */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/50 p-5 flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Ultrasound Time Slots</h2>
            <p className="text-sm text-slate-500">Manage the available time slots for Ultrasound services (Thursdays only).</p>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {ultrasoundSlots.map((slot, idx) => (
              <div key={idx} className="flex items-center justify-between border border-slate-200 rounded-md bg-amber-50 p-2 text-sm text-amber-900 font-medium group">
                <span>{slot}</span>
                <button 
                  onClick={() => handleRemoveSlot("ultra", idx)}
                  className="text-amber-700/50 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remove slot"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2 max-w-sm pt-4 border-t border-slate-100">
            <input 
              type="text" 
              placeholder="e.g. 10:30 AM" 
              value={newUltraSlot}
              onChange={(e) => setNewUltraSlot(e.target.value.toUpperCase())}
              className="flex-1 px-3 py-2 border border-slate-200 rounded-md text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            />
            <button 
              onClick={() => handleAddSlot("ultra")}
              className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-1 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-3 text-blue-800 text-sm">
        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-blue-600" />
        <p>
          <strong>Note:</strong> Changes to clinic hours take effect immediately for all new bookings. 
          Existing appointments in removed slots are <strong>not</strong> automatically cancelled. 
          You must manage those manually if necessary.
        </p>
      </div>

      <div className="flex justify-end pt-4">
        <button 
          onClick={handleSave}
          disabled={isSubmitting}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-2.5 rounded-lg font-semibold text-sm transition-colors flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <CheckCircle2 className="w-4 h-4" />
          )}
          {isSubmitting ? "Saving Config..." : "Save Configuration"}
        </button>
      </div>
    </div>
  );
}
