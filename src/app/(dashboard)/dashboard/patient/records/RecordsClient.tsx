"use client";

import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { User, Users, FileText, CheckCircle2, AlertCircle, ChevronRight, Activity } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function RecordsClient({ mainUser, subProfiles }: { mainUser: any; subProfiles: any[] }) {
  const router = useRouter();

  // Helper to render a folder card
  const RecordFolder = ({ 
    profileId, 
    firstName, 
    lastName, 
    relationship, 
    itr, 
    isSubProfile 
  }: { 
    profileId: string | null;
    firstName: string; 
    lastName: string; 
    relationship: string;
    itr: any;
    isSubProfile: boolean;
  }) => {
    const hasITR = itr?.isCompleted;
    const lastUpdated = itr?.updatedAt ? format(new Date(itr.updatedAt), "MMM d, yyyy") : null;

    const handleClick = () => {
      if (isSubProfile) {
        router.push(`/dashboard/patient/itr?subProfileId=${profileId}`);
      } else {
        router.push(`/dashboard/patient/itr`);
      }
    };

    return (
      <Card 
        onClick={handleClick}
        className={cn(
          "group relative overflow-hidden border-2 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-md",
          isSubProfile 
            ? "border-amber-100 hover:border-amber-300 bg-gradient-to-br from-white to-amber-50/30"
            : "border-sky-100 hover:border-sky-300 bg-gradient-to-br from-white to-sky-50/30"
        )}
      >
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border-2 transition-transform duration-300 group-hover:scale-105",
              isSubProfile 
                ? "bg-amber-100 text-amber-600 border-amber-200"
                : "bg-sky-100 text-sky-600 border-sky-200"
            )}>
              {isSubProfile ? <Users className="w-7 h-7" /> : <User className="w-7 h-7" />}
            </div>
            <div className="text-right">
              <Badge variant="outline" className={cn(
                "mb-2 font-medium border text-xs",
                hasITR 
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                  : "bg-red-50 text-red-700 border-red-200"
              )}>
                {hasITR ? (
                  <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Completed</span>
                ) : (
                  <span className="flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Needs Update</span>
                )}
              </Badge>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-3.5 h-3.5" />
              {isSubProfile ? "Family Member" : "Main Account"}
            </p>
            <h3 className={cn(
              "text-xl font-bold tracking-tight truncate",
              isSubProfile ? "text-amber-950" : "text-sky-950"
            )}>
              {firstName} {lastName}
            </h3>
            <p className="text-sm font-medium text-slate-500">
              Relationship: <span className="text-slate-700">{relationship}</span>
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              {lastUpdated ? `Last updated: ${lastUpdated}` : "No record created yet"}
            </div>
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
              isSubProfile 
                ? "bg-amber-100 text-amber-700 group-hover:bg-amber-600 group-hover:text-white"
                : "bg-sky-100 text-sky-700 group-hover:bg-sky-600 group-hover:text-white"
            )}>
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* ── My Record ── */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-emerald-600" />
          My Personal Record
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <RecordFolder 
            profileId={null}
            firstName={mainUser.firstName || mainUser.name?.split(" ")[0] || "User"}
            lastName={mainUser.lastName || mainUser.name?.split(" ").slice(1).join(" ") || ""}
            relationship="Myself"
            itr={mainUser.itr}
            isSubProfile={false}
          />
        </div>
      </div>

      {/* ── Family Records ── */}
      {subProfiles.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2 mt-8">
            <Users className="w-5 h-5 text-emerald-600" />
            Family Members' Records
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {subProfiles.map((sp) => (
              <RecordFolder 
                key={sp.id}
                profileId={sp.id}
                firstName={sp.firstName}
                lastName={sp.lastName}
                relationship={sp.relationship}
                itr={sp.itr}
                isSubProfile={true}
              />
            ))}
          </div>
        </div>
      )}

      {subProfiles.length === 0 && (
        <div className="mt-8 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-500">
          <Users className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <p className="font-medium">No family members added yet.</p>
          <p className="text-sm mt-1 mb-4">You can add family members to manage their health records here.</p>
          <Button variant="outline" onClick={() => router.push("/dashboard/patient/family")} className="text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-800">
            Add Family Member
          </Button>
        </div>
      )}
    </div>
  );
}
