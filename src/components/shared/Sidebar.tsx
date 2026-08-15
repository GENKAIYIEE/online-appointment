"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { 
  Stethoscope, 
  CalendarDays, 
  Users, 
  Settings, 
  ClipboardList, 
  LogOut,
  LayoutDashboard,
  CalendarPlus,
  Bell,
  MonitorCheck,
  CalendarClock,
  FolderHeart,
  CalendarSearch,
  PieChart,
  ClipboardCheck,
  Users2,
  CalendarOff,
  Pill,
  Inbox
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";

type Role = "patient" | "staff" | "doctor" | "admin" | null;

type NavItem = {
  name: string;
  href: string;
  icon: any;
  badgeKey?: "appointments" | "leaves" | "users" | "total";
};

const navItems: Record<NonNullable<Role>, NavItem[]> = {
  patient: [
    { name: "My Dashboard", href: "/dashboard/patient", icon: LayoutDashboard },
    { name: "Book Appointment", href: "/dashboard/patient/book", icon: CalendarPlus },
    { name: "My Appointments", href: "/dashboard/patient/appointments", icon: CalendarDays },
    { name: "View Available Slots", href: "/dashboard/patient/slots", icon: CalendarSearch },
    { name: "Notifications", href: "/dashboard/patient/notifications", icon: Bell },
    { name: "Family Profiles", href: "/dashboard/patient/family", icon: Users2 },
    { name: "Medical Records", href: "/dashboard/patient/records", icon: FolderHeart },
  ],
  staff: [
    { name: "Staff Desk", href: "/dashboard/staff", icon: MonitorCheck },
    { name: "Appointments by Service", href: "/dashboard/staff/appointments-by-service", icon: CalendarSearch },
    { name: "Slot Management", href: "/dashboard/staff/slots", icon: CalendarClock },
    { name: "Patient Records", href: "/dashboard/staff/records", icon: ClipboardCheck },
    { name: "Medicine Records", href: "/dashboard/staff/medicine", icon: Pill },
    { name: "Notifications", href: "/dashboard/staff/notifications", icon: Bell, badgeKey: "total" },
  ],
  doctor: [
    { name: "Doctor's Console", href: "/dashboard/doctor", icon: MonitorCheck },
    { name: "Consultation History", href: "/dashboard/doctor/history", icon: ClipboardList },
    { name: "Leave Requests", href: "/dashboard/doctor/leave", icon: CalendarOff },
  ],
  admin: [
    { name: "Analytics", href: "/dashboard/admin", icon: PieChart },
    { name: "Appointments", href: "/dashboard/admin/appointments", icon: CalendarDays, badgeKey: "appointments" },
    { name: "User Management", href: "/dashboard/admin/users", icon: Users, badgeKey: "users" },
    { name: "Service Management", href: "/dashboard/admin/services", icon: Stethoscope },
    { name: "Leave Requests", href: "/dashboard/admin/leaves", icon: CalendarOff, badgeKey: "leaves" },
    { name: "Audit Logs", href: "/dashboard/admin/audit-logs", icon: ClipboardList },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
  ]

};

export function Sidebar({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  const pathname = usePathname();
  const [counts, setCounts] = useState({ appointments: 0, leaves: 0, users: 0, total: 0 });

  useEffect(() => {
    const handleCounts = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setCounts({
          appointments: customEvent.detail.appointments || 0,
          leaves: customEvent.detail.leaves || 0,
          users: customEvent.detail.users || 0,
          total: customEvent.detail.total ?? customEvent.detail.count ?? 0,
        });
      }
    };
    window.addEventListener("unreadCountsUpdated", handleCounts);
    return () => window.removeEventListener("unreadCountsUpdated", handleCounts);
  }, []);

  const links = role ? navItems[role] : [];

  return (
    <div className="flex flex-col w-[240px] h-full bg-[var(--color-bg-sidebar)] border-r border-[var(--color-border)]">
      {/* Logo Area */}
      <div className="py-[20px] px-[16px] flex items-center gap-3 border-b border-[var(--color-border)]">
        <div className="w-10 h-10 bg-white rounded-[8px] flex items-center justify-center shrink-0 overflow-hidden">
          <Image src="/rhu1.png" alt="RHU Logo" width={40} height={40} className="w-full h-full object-contain scale-125" />
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
          const badgeCount = link.badgeKey ? counts[link.badgeKey] : 0;
          return (
            <Link
              key={link.name}
              href={link.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center justify-between px-[16px] py-[10px] rounded-[8px] transition-all duration-150 text-[14px] font-heading",
                isActive 
                  ? "bg-[#F0FDF4] text-[#16a34a] border-l-[3px] border-[#16a34a] font-semibold" 
                  : "text-[#4B5563] font-medium border-l-[3px] border-transparent hover:bg-[#F0FDF4] hover:text-[#16a34a]"
              )}
            >
              <div className="flex items-center gap-3">
                <Icon className={cn("w-[18px] h-[18px] transition-colors duration-150", isActive ? "text-[#16a34a]" : "text-[#9CA3AF] group-hover:text-[#16a34a]")} />
                {link.name}
              </div>
              {badgeCount > 0 && (
                <span className="bg-[var(--color-error)] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center leading-none">
                  {badgeCount > 99 ? "99+" : badgeCount}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-[var(--color-border)]">
        <Dialog>
          <DialogTrigger
            render={
              <button className="flex w-full items-center gap-3 px-[16px] py-[10px] rounded-[8px] text-[14px] font-heading font-medium text-[#4B5563] hover:text-[#EF4444] hover:bg-[#FEF2F2] transition-all duration-150">
                <LogOut className="w-[18px] h-[18px] text-[#9CA3AF]" />
                Sign Out
              </button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Sign Out</DialogTitle>
              <DialogDescription>
                Are you sure you want to sign out? You will need to log in again to access the portal.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose render={<Button variant="outline">Cancel</Button>} />
              <Button
                variant="destructive"
                onClick={async () => {
                  const { logoutUser } = await import("@/actions/auth");
                  await logoutUser();
                  window.location.href = "/login";
                }}
              >
                Sign Out
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
