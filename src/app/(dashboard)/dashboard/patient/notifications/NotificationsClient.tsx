"use client";

import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Bell,
  CheckCircle,
  CheckCircle2,
  XCircle,
  CalendarClock,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { markNotificationRead, markAllNotificationsRead, deleteAllNotifications } from "@/actions/notifications";

// ─── Types ───────────────────────────────────────────────────────────────────
type Notification = {
  id: string;
  message: string;
  isRead: boolean;
  created_at: string;
  user_id: string;
};

// ─── Icon Resolver ────────────────────────────────────────────────────────────
function getIconConfig(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("confirmed")) {
    return { Icon: CheckCircle, iconColor: "text-emerald-600", bgColor: "bg-emerald-100" };
  }
  if (lower.includes("cancelled") || lower.includes("canceled") || lower.includes("no show")) {
    return { Icon: XCircle, iconColor: "text-red-500", bgColor: "bg-red-100" };
  }
  if (lower.includes("completed")) {
    return { Icon: CheckCircle2, iconColor: "text-slate-500", bgColor: "bg-slate-100" };
  }
  if (lower.includes("rescheduled")) {
    return { Icon: CalendarClock, iconColor: "text-blue-500", bgColor: "bg-blue-100" };
  }
  // Default: pending / submitted / reminder
  return { Icon: Bell, iconColor: "text-amber-500", bgColor: "bg-amber-100" };
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function NotificationsClient({
  notifications: initial,
  dbError,
}: {
  notifications: Notification[];
  dbError: boolean;
}) {
  const [notifications, setNotifications] = useState<Notification[]>(initial);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  const hasUnread = notifications.some((n) => !n.isRead);

  // Mark a single notification as read (optimistic)
  const handleMarkRead = async (id: string) => {
    const target = notifications.find((n) => n.id === id);
    if (!target || target.isRead) return;

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    window.dispatchEvent(new CustomEvent("notificationsUpdated", { detail: { action: "markOne" } }));

    try {
      const result = await markNotificationRead(id);
      if (!result.success) {
        // Revert optimistic update
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: false } : n))
        );
        window.dispatchEvent(new CustomEvent("notificationsUpdated", { detail: { action: "markOneRevert" } }));
        toast.error(result.error ?? "Failed to mark notification as read.");
      }
    } catch {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: false } : n))
      );
      window.dispatchEvent(new CustomEvent("notificationsUpdated", { detail: { action: "markOneRevert" } }));
      toast.error("An unexpected error occurred.");
    }
  };

  // Mark all as read (optimistic)
  const handleMarkAllRead = async () => {
    setIsMarkingAll(true);
    const snapshot = notifications;

    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    window.dispatchEvent(new CustomEvent("notificationsUpdated", { detail: { action: "markAll" } }));

    try {
      const result = await markAllNotificationsRead();
      if (!result.success) {
        setNotifications(snapshot);
        // We could revert the markAll instantly, but triggering a re-fetch is safer for reverting 'all'
        window.dispatchEvent(new Event("notificationsUpdated"));
        toast.error(result.error ?? "Failed to mark all as read.");
      } else {
        toast.success("All notifications marked as read.");
      }
    } catch {
      setNotifications(snapshot);
      window.dispatchEvent(new Event("notificationsUpdated"));
      toast.error("An unexpected error occurred.");
    } finally {
      setIsMarkingAll(false);
    }
  };

  // Delete all notifications (optimistic)
  const handleDeleteAll = async () => {
    if (hasUnread) {
      toast.error("Please mark all notifications as read before deleting.");
      return;
    }
    
    setIsDeletingAll(true);
    const snapshot = notifications;
    setNotifications([]);
    window.dispatchEvent(new CustomEvent("notificationsUpdated", { detail: { action: "deleteAll" } }));

    try {
      const result = await deleteAllNotifications();
      if (!result.success) {
        setNotifications(snapshot);
        window.dispatchEvent(new Event("notificationsUpdated"));
        toast.error(result.error ?? "Failed to delete notifications.");
      } else {
        toast.success("All notifications deleted.");
      }
    } catch {
      setNotifications(snapshot);
      window.dispatchEvent(new Event("notificationsUpdated"));
      toast.error("An unexpected error occurred.");
    } finally {
      setIsDeletingAll(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header ───────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Stay updated on your appointments and reminders.
          </p>
        </div>

        {!dbError && notifications.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            <Button
              onClick={handleMarkAllRead}
              disabled={isMarkingAll || !hasUnread}
              variant="outline"
              id="mark-all-read-btn"
              className={cn(
                "transition-colors",
                hasUnread 
                  ? "text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300"
                  : "text-slate-400 border-slate-200"
              )}
            >
              {isMarkingAll ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
                  Marking…
                </span>
              ) : (
                "Mark All as Read"
              )}
            </Button>

            <Button
              onClick={handleDeleteAll}
              disabled={isDeletingAll || hasUnread}
              variant="outline"
              id="delete-all-btn"
              title={hasUnread ? "Please read all notifications first" : "Delete all notifications"}
              className={cn(
                "transition-colors",
                !hasUnread
                  ? "text-red-700 border-red-200 hover:bg-red-50 hover:border-red-300"
                  : "text-slate-400 border-slate-200"
              )}
            >
              {isDeletingAll ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-red-200 border-t-red-600 rounded-full animate-spin" />
                  Deleting…
                </span>
              ) : (
                "Delete All"
              )}
            </Button>
          </div>
        )}
      </div>

      {/* ── DB Error ───────────────────────────────────────────────────── */}
      {dbError && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
          <div>
            <h3 className="font-semibold">Unable to load notifications</h3>
            <p className="text-sm mt-0.5">
              We&apos;re having trouble connecting to the database. Please try
              refreshing the page.
            </p>
          </div>
        </div>
      )}

      {/* ── Notification List ─────────────────────────────────────────── */}
      {!dbError && (
        <>
          {notifications.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-dashed border-slate-200 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <Bell className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-lg font-semibold text-slate-700 mb-1">
                No notifications yet
              </h3>
              <p className="text-sm text-slate-400 max-w-xs">
                You&apos;ll see updates about your appointments and clinic
                reminders right here.
              </p>
            </div>
          ) : (
            /* Notification rows */
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm divide-y divide-slate-100">
              {notifications.map((notif) => {
                const { Icon, iconColor, bgColor } = getIconConfig(notif.message);

                return (
                  <button
                    key={notif.id}
                    id={`notification-item-${notif.id}`}
                    onClick={() => handleMarkRead(notif.id)}
                    className={cn(
                      "w-full text-left flex items-start gap-4 px-5 py-4 transition-colors duration-150 group",
                      notif.isRead
                        ? "bg-white hover:bg-slate-50/70"
                        : "bg-emerald-50/70 hover:bg-emerald-50"
                    )}
                  >
                    {/* Icon bubble */}
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                        bgColor
                      )}
                    >
                      <Icon className={cn("w-4.5 h-4.5", iconColor)} />
                    </div>

                    {/* Text content */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          "text-sm leading-relaxed",
                          notif.isRead
                            ? "text-slate-500 font-normal"
                            : "text-slate-800 font-medium"
                        )}
                      >
                        {notif.message.replace("[NO_SHOW] ", "")}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {format(new Date(notif.created_at), "MMM d, yyyy · h:mm a")}
                      </p>
                    </div>

                    {/* Unread indicator dot */}
                    {!notif.isRead && (
                      <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full shrink-0 mt-2 ring-2 ring-white" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
