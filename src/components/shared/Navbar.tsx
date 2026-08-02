
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Search, Menu, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from "date-fns";
import { Sidebar } from "./Sidebar";

interface NavbarProps {
  role?: string;
  userName?: string;
}

export function Navbar({ role = "User", userName = "Account" }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const isAdmin = role.toLowerCase() === "admin";
  const isStaff = role.toLowerCase() === "staff";
  const isDoctor = role.toLowerCase() === "doctor";
  const isPatient = role.toLowerCase() === "patient";
  const hasAdvancedNotifications = isAdmin || isStaff || isDoctor;

  useEffect(() => {
    setIsMobileMenuOpen(false);
    
    const fetchCount = async () => {
      try {
        const res = await fetch("/api/notifications/unread-count", {
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.total ?? data.count ?? 0);
          
          // Dispatch detailed counts for the Sidebar to listen to
          window.dispatchEvent(
            new CustomEvent("unreadCountsUpdated", { detail: data })
          );
        }
      } catch {}
    };

    const fetchNotifications = async () => {
      try {
        const res = await fetch("/api/notifications?limit=3", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.notifications || []);
        }
      } catch {}
    };

    fetchCount();
    if (hasAdvancedNotifications) {
      fetchNotifications();
    }

    const handleNotificationUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.action === "markAll") {
        setUnreadCount(0);
      } else if (customEvent.detail?.action === "markOne") {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } else if (customEvent.detail?.action === "markOneRevert") {
        setUnreadCount((prev) => prev + 1);
      }
      fetchCount();
    };

    window.addEventListener("notificationsUpdated", handleNotificationUpdate);

    let intervalId: NodeJS.Timeout;
    if (hasAdvancedNotifications) {
      intervalId = setInterval(() => {
        fetchCount();
        if (isPopoverOpen) {
          fetchNotifications();
        }
      }, 10000);
    }

    return () => {
      window.removeEventListener("notificationsUpdated", handleNotificationUpdate);
      if (intervalId) clearInterval(intervalId);
    };
  }, [pathname, hasAdvancedNotifications, isPopoverOpen]);

  const handleMarkAsRead = async (id?: string) => {
    try {
      const payload = id ? { id } : { markAll: true };
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        if (id) {
          setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
          );
          setUnreadCount((prev) => Math.max(0, prev - 1));
        } else {
          setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
          setUnreadCount(0);
        }
      }
    } catch (error) {
      console.error("Failed to mark notification as read", error);
    }
  };

  return (
    <>
      <header className="h-[64px] flex items-center justify-between px-4 sm:px-6 bg-white border-b border-[var(--color-border)] shrink-0 transition-all duration-200">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden text-slate-700 hover:bg-slate-100"
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </Button>
          <div className="relative font-heading font-semibold text-slate-800 text-sm capitalize">
            {role} Portal
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
        ) : hasAdvancedNotifications ? (
          <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <PopoverTrigger className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-9 w-9 relative text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-main)] transition-colors duration-200 rounded-full">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-[var(--color-error)] rounded-full border-2 border-white flex items-center justify-center text-white text-[9px] font-bold leading-none px-0.5 shadow-sm">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 mr-4" align="end">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <span className="font-semibold text-sm">Notifications</span>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMarkAsRead()}
                    className="h-auto p-0 text-xs text-blue-600 hover:text-blue-800 hover:bg-transparent"
                  >
                    Mark all as read
                  </Button>
                )}
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`flex flex-col gap-1 p-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors ${
                        !n.isRead ? "bg-blue-50/30" : ""
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <p className={`text-sm ${!n.isRead ? "font-medium text-slate-800" : "text-slate-600"}`}>
                          {n.message}
                        </p>
                        {!n.isRead && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleMarkAsRead(n.id)}
                            className="h-6 w-6 shrink-0 text-slate-400 hover:text-blue-600"
                            title="Mark as read"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-sm text-slate-500">
                    No new notifications
                  </div>
                )}
              </div>
              <div className="p-2 border-t border-slate-100">
                <Button
                  variant="ghost"
                  className="w-full text-xs text-slate-600 justify-center h-8"
                  onClick={() => {
                    setIsPopoverOpen(false);
                    if (isAdmin) router.push("/dashboard/admin/notifications");
                    else if (isStaff) router.push("/dashboard/staff/notifications");
                    else if (isDoctor) router.push("/dashboard/doctor/notifications");
                  }}
                >
                  View all
                </Button>
              </div>
            </PopoverContent>
          </Popover>
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
            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${userName}`} />
            <AvatarFallback className="bg-[var(--color-primary-light)] text-[var(--color-primary)] font-heading font-semibold">{userName ? userName.charAt(0).toUpperCase() : role.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
        </div>
      </div>
      </header>

      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden animate-in fade-in duration-200">
          <div 
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative z-10 w-[260px] h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-left duration-200">
            <div className="absolute top-3 right-3 z-20">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-slate-500 hover:text-slate-900 rounded-full"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <Sidebar role={role as any} onNavigate={() => setIsMobileMenuOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
