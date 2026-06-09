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
  LogOut,
  LayoutDashboard,
  CalendarPlus,
  Bell,
  MonitorCheck,
  CalendarClock,
  ClipboardEdit,
  CalendarSearch,
  PieChart
} from "lucide-react";
import { cn } from "@/lib/utils";

type Role = "patient" | "staff" | "doctor" | "admin" | null;

type NavItem = {
  name: string;
  href: string;
  icon: any;
};

const navItems: Record<NonNullable<Role>, NavItem[]> = {
  patient: [
    { name: "My Dashboard", href: "/dashboard/patient", icon: LayoutDashboard },
    { name: "Book Appointment", href: "/dashboard/patient/book", icon: CalendarPlus },
    { name: "My Appointments", href: "/dashboard/patient/appointments", icon: CalendarDays },
    { name: "View Available Slots", href: "/dashboard/patient/slots", icon: CalendarSearch },
    { name: "Notifications", href: "/dashboard/patient/notifications", icon: Bell },
    { name: "Update Health Record", href: "/dashboard/patient/itr", icon: ClipboardEdit },
  ],
  staff: [
    { name: "Staff Desk", href: "/dashboard/staff", icon: MonitorCheck },
    { name: "Slot Management", href: "/dashboard/staff/slots", icon: CalendarClock },
  ],
  doctor: [
    { name: "Doctor's Console", href: "/dashboard/doctor", icon: MonitorCheck },
    { name: "Consultation History", href: "/dashboard/doctor/history", icon: ClipboardList },
  ],
  admin: [
    { name: "Analytics", href: "/dashboard/admin", icon: PieChart },
    { name: "User Management", href: "/dashboard/admin/users", icon: Users },
    { name: "Service Management", href: "/dashboard/admin/services", icon: Stethoscope },
    { name: "Audit Logs", href: "/dashboard/admin/audit-logs", icon: ClipboardList },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
  ]
};

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();

  const links = role ? navItems[role] : [];

  return (
    <div className="flex flex-col w-[240px] h-full bg-[var(--color-bg-sidebar)] border-r border-[var(--color-border)]">
      {/* Logo Area */}
      <div className="py-[20px] px-[16px] flex items-center gap-3 border-b border-[var(--color-border)]">
        <div className="w-8 h-8 bg-[var(--color-primary)] rounded-[8px] flex items-center justify-center shrink-0">
          <Stethoscope className="w-5 h-5 text-white" />
        </div>
        <span className="font-heading font-bold text-[18px] text-[var(--color-text-primary)] truncate">RHU Portal</span>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
        <div className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-[0.08em] mb-4 px-2">
          {role ? `${role} Menu` : "Menu"}
        </div>
        {links.map((link) => {
          const isActive = pathname === link.href || (pathname.startsWith(`${link.href}/`) && !["/dashboard/patient", "/dashboard/staff", "/dashboard/doctor", "/dashboard/admin"].includes(link.href));
          const Icon = link.icon;
          return (
            <Link
              key={link.name}
              href={link.href}
              className={cn(
                "flex items-center gap-3 px-[16px] py-[10px] rounded-[8px] transition-all duration-150 text-[14px] font-heading",
                isActive 
                  ? "bg-[#F0FDF4] text-[#16a34a] border-l-[3px] border-[#16a34a] font-semibold" 
                  : "text-[#4B5563] font-medium border-l-[3px] border-transparent hover:bg-[#F0FDF4] hover:text-[#16a34a]"
              )}
            >
              <Icon className={cn("w-[18px] h-[18px] transition-colors duration-150", isActive ? "text-[#16a34a]" : "text-[#9CA3AF] group-hover:text-[#16a34a]")} />
              {link.name}
            </Link>
          );
        })}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-[var(--color-border)]">
        <Link
          href="#"
          onClick={async (e) => {
            e.preventDefault();
            const { logoutUser } = await import('@/actions/auth');
            await logoutUser();
            window.location.href = '/login';
          }}
          className="flex items-center gap-3 px-[16px] py-[10px] rounded-[8px] text-[14px] font-heading font-medium text-[#4B5563] hover:text-[#EF4444] hover:bg-[#FEF2F2] transition-all duration-150"
        >
          <LogOut className="w-[18px] h-[18px] text-[#9CA3AF]" />
          Sign Out
        </Link>
      </div>
    </div>
  );
}
