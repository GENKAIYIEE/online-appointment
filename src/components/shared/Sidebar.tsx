"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Stethoscope, 
  CalendarDays, 
  Users, 
  Settings, 
  ClipboardList, 
  Activity,
  LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";

type Role = "patient" | "staff" | "doctor" | "admin" | null;

const navItems = {
  patient: [
    { name: "My Dashboard", href: "/dashboard/patient", icon: Activity },
    { name: "Appointments", href: "/dashboard/patient/appointments", icon: CalendarDays },
  ],
  staff: [
    { name: "Staff Desk", href: "/dashboard/staff", icon: ClipboardList },
    { name: "Patients", href: "/dashboard/staff/patients", icon: Users },
  ],
  doctor: [
    { name: "Consultations", href: "/dashboard/doctor", icon: Stethoscope },
    { name: "Schedule", href: "/dashboard/doctor/schedule", icon: CalendarDays },
  ],
  admin: [
    { name: "Overview", href: "/dashboard/admin", icon: Activity },
    { name: "Settings", href: "/dashboard/admin/settings", icon: Settings },
  ]
};

export function Sidebar() {
  const pathname = usePathname();
  const [role, setRole] = useState<Role>(null);

  useEffect(() => {
    // Read from localStorage to know what links to show
    const storedRole = localStorage.getItem("userRole") as Role;
    if (storedRole) setRole(storedRole);
  }, [pathname]); // Re-check if pathname changes

  const links = role ? navItems[role] : [];

  return (
    <div className="flex flex-col w-64 h-full bg-white text-slate-900 shadow-sm border-r border-slate-200">
      <div className="p-6 flex items-center gap-3 border-b border-slate-200">
        <div className="w-8 h-8 bg-green-600 rounded flex items-center justify-center">
          <Stethoscope className="w-5 h-5 text-white" />
        </div>
        <span className="font-bold text-lg tracking-tight">RHU Portal</span>
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 px-2">
          {role ? `${role} Menu` : "Menu"}
        </div>
        {links.map((link) => {
          const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
          const Icon = link.icon;
          return (
            <Link
              key={link.name}
              href={link.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-sm font-medium",
                isActive 
                  ? "bg-green-50 text-green-700" 
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <Icon className="w-5 h-5" />
              {link.name}
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-slate-200">
        <Link
          href="/login"
          onClick={() => localStorage.removeItem("userRole")}
          className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </Link>
      </div>
    </div>
  );
}
