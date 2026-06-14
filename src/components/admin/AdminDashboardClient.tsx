"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AnalyticsDashboard } from "@/components/admin/AnalyticsDashboard";
import type { AnalyticsData } from "@/components/admin/AnalyticsDashboard";

// Analytics data is passed down from the server page
interface AdminDashboardClientProps {
  analyticsData: AnalyticsData;
}

export function AdminDashboardClient({ analyticsData }: AdminDashboardClientProps) {
  const router = useRouter();
  const [isValidating, setIsValidating] = useState(false);

  // Note: Session validation is now handled securely by src/middleware.ts and the server page.

  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 10000);
    return () => clearInterval(interval);
  }, [router]);

  if (isValidating) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 font-medium">Validating session...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 relative animate-in fade-in duration-500">
      {/* Subtle background texture */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-30 -z-10" />
      
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 via-slate-700 to-slate-900 tracking-tight">
            System Administration
          </h1>
          <p className="text-slate-500 mt-1 font-medium">
            Configure global settings and monitor system analytics.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className="bg-white px-3 py-1.5 text-slate-600 border-slate-200 shadow-sm"
          >
            System Status:{" "}
            <span className="text-emerald-600 font-bold ml-1.5 flex items-center">
              <span className="relative flex h-2 w-2 mr-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Online
            </span>
          </Badge>
        </div>
      </div>

      <div className="mt-8">
        <AnalyticsDashboard data={analyticsData} />
      </div>
    </div>
  );
}
