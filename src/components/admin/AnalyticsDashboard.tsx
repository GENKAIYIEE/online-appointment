"use client";

import { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";
import {
  Users,
  Activity,
  Monitor,
  PersonStanding,
  Clock,
  User,
  CheckCircle2,
  XCircle,
  MessageSquareQuote,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface AnalyticsData {
  stats: {
    onlineCount: number;
    onlineChange: number;
    walkinCount: number;
    walkinChange: number;
    activeDoctors: number;
    doctorsChange: number;
    totalPatients: number;
    patientsChange: number;
  };
  chartData: Array<{ name: string; online: number; walkIn: number }>;
  recentActivity: Array<{
    id: string;
    action: string;
    user: string;
    time: string;
    status: "Success" | "Pending" | "Failed";
    type: string;
  }>;
}

export const emptyAnalytics: AnalyticsData = {
  stats: {
    onlineCount: 0,
    onlineChange: 0,
    walkinCount: 0,
    walkinChange: 0,
    activeDoctors: 0,
    doctorsChange: 0,
    totalPatients: 0,
    patientsChange: 0,
  },
  chartData: [],
  recentActivity: [],
};

// Simple hook for counting up
function useCountUp(end: number, duration: number = 1000) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // easeOutQuart
      const easeProgress = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(easeProgress * end));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }, [end, duration]);

  return count;
}

function KPICard({ kpi }: { kpi: any }) {
  const animatedValue = useCountUp(kpi.value);
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <Card
      className={`border-y border-r border-l-4 ${kpi.accent} shadow-sm overflow-hidden relative group hover:-translate-y-1 hover:shadow-lg transition-all duration-300 bg-white`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white to-slate-50 opacity-50" />
      <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
        <CardTitle className="text-sm font-semibold text-slate-600">
          {kpi.title}
        </CardTitle>
        <div className={`p-2.5 rounded-xl ${kpi.bg}`}>{kpi.icon}</div>
      </CardHeader>
      <CardContent className="relative z-10 pt-2">
        <div className="text-4xl font-bold text-slate-900 tracking-tight">
          {animatedValue.toLocaleString()}
        </div>
        <div className="flex items-center mt-3 text-sm text-slate-500 font-medium">
          Today, {dateStr}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export function AnalyticsDashboard({ data }: { data: AnalyticsData }) {
  const { stats, chartData, recentActivity } = data;

  const kpis = [
    {
      title: "Online Appointments",
      value: stats.onlineCount,
      change: stats.onlineChange,
      icon: <Monitor className="w-6 h-6 text-blue-500" />,
      bg: "bg-blue-50/80",
      accent: "border-l-blue-500",
    },
    {
      title: "Walk-in Appointments",
      value: stats.walkinCount,
      change: stats.walkinChange,
      icon: <PersonStanding className="w-6 h-6 text-orange-500" />,
      bg: "bg-orange-50/80",
      accent: "border-l-orange-500",
    },
    {
      title: "Active Staff",
      value: stats.activeDoctors,
      change: stats.doctorsChange,
      icon: <Activity className="w-6 h-6 text-green-500" />,
      bg: "bg-green-50/80",
      accent: "border-l-green-500",
    },
    {
      title: "New Patients",
      value: stats.totalPatients,
      change: stats.patientsChange,
      icon: <Users className="w-6 h-6 text-purple-500" />,
      bg: "bg-purple-50/80",
      accent: "border-l-purple-500",
    },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {kpis.map((kpi, index) => (
          <KPICard key={index} kpi={kpi} />
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Main Chart */}
        <Card className="xl:col-span-2 border-slate-200 shadow-sm bg-white overflow-hidden group">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
            <CardTitle className="text-lg font-bold text-slate-800">
              Appointment Trends
            </CardTitle>
            <CardDescription className="text-slate-500 font-medium">
              Online vs Walk-in for the last 7 days
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-[380px] w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorOnline" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorWalkIn" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#64748b", fontSize: 13, fontWeight: 500 }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#64748b", fontSize: 13, fontWeight: 500 }}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        backdropFilter: "blur(4px)",
                      }}
                      itemStyle={{ fontWeight: 600 }}
                      labelStyle={{ fontWeight: 700, color: "#334155", marginBottom: "4px" }}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36} 
                      iconType="circle"
                      wrapperStyle={{ paddingTop: "20px", fontSize: "14px", fontWeight: 500, color: "#475569" }}
                    />
                    <Area
                      type="monotone"
                      name="Online"
                      dataKey="online"
                      stroke="#22c55e"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorOnline)"
                    />
                    <Area
                      type="monotone"
                      name="Walk-in"
                      dataKey="walkIn"
                      stroke="#f97316"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorWalkIn)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-3 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Activity className="w-10 h-10 text-slate-300" />
                  <p className="text-sm font-medium">No appointment data yet.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Admin Quote */}
        <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-emerald-500 to-green-600 flex flex-col justify-center items-center text-white p-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
            <MessageSquareQuote className="w-48 h-48" />
          </div>
          <div className="relative z-10 flex flex-col items-center text-center space-y-6">
            <MessageSquareQuote className="w-12 h-12 text-white/80 mb-2" />
            <blockquote className="text-xl md:text-2xl font-medium leading-relaxed">
              "Management is doing things right; leadership is doing the right things."
            </blockquote>
            <div className="pt-4 border-t border-white/20 w-16"></div>
            <p className="text-white/80 font-semibold tracking-wide uppercase text-sm">
              Peter Drucker
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
