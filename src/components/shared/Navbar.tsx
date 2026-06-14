"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Search, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";

interface NavbarProps {
  role?: string;
  userName?: string;
}

export function Navbar({ role = "User", userName = "Account" }: NavbarProps) {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);

  // Re-fetch unread count on every navigation (pathname change)
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await fetch("/api/notifications/unread-count", {
          // Bypass Next.js cache so count is always fresh
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.count ?? 0);
        }
      } catch {
        // Silently ignore — bell just shows no badge
      }
    };

    fetchCount();

    // Listen for custom events to instantly update the UI without waiting for a re-fetch
    const handleNotificationUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.action === "markAll") {
        setUnreadCount(0);
      } else if (customEvent.detail?.action === "markOne") {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } else if (customEvent.detail?.action === "markOneRevert") {
        setUnreadCount((prev) => prev + 1); // Revert optimistic UI if it failed
      }
      
      // Still fetch in background to ensure absolute sync with DB
      fetchCount();
    };

    window.addEventListener("notificationsUpdated", handleNotificationUpdate);
    return () => window.removeEventListener("notificationsUpdated", handleNotificationUpdate);
  }, [pathname]);

  const isPatient = role.toLowerCase() === "patient";

  return (
    <header className="h-[64px] flex items-center justify-between px-6 bg-white border-b border-[var(--color-border)] shrink-0 transition-all duration-200">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="w-5 h-5 text-slate-600" />
        </Button>
        <div className="relative hidden md:block">
          <span className="text-sm font-medium text-[var(--color-text-muted)] capitalize">{role} Portal</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Bell — links to notifications for patients, static for others */}
        {isPatient ? (
          <Link href="/dashboard/patient/notifications">
            <Button
              variant="ghost"
              size="icon"
              id="navbar-notifications-btn"
              className="relative text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-main)] transition-colors duration-200 rounded-full"
              aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-[var(--color-error)] rounded-full border-2 border-white flex items-center justify-center text-white text-[9px] font-bold leading-none px-0.5 shadow-sm">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Button>
          </Link>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="relative text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-main)] transition-colors duration-200 rounded-full"
          >
            <Bell className="w-5 h-5" />
          </Button>
        )}

        <div className="flex items-center gap-3 pl-4 border-l border-[var(--color-border)] ml-1">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-[14px] font-heading font-medium text-[var(--color-text-primary)]">{userName}</span>
            <span className="text-[12px] text-[var(--color-text-muted)] font-inter capitalize">{role}</span>
          </div>
          <Avatar className="h-9 w-9 border border-[var(--color-border)] shadow-sm">
            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${role}`} />
            <AvatarFallback className="bg-[var(--color-primary-light)] text-[var(--color-primary)] font-heading font-semibold">{role.charAt(0)}</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}

