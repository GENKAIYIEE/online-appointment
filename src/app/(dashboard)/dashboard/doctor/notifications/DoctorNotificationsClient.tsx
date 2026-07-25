"use client";

import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { Check, MailOpen, Trash2, Bell, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface Notification {
  id: string;
  message: string;
  isRead: boolean;
  created_at: string;
  appointmentId?: string | null;
}

export default function DoctorNotificationsClient() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchNotifications = async (p: number = 1) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/notifications?page=${p}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
        setTotalPages(data.totalPages || 1);
        setTotal(data.total);
      }
    } catch (error) {
      toast.error("Failed to fetch notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications(page);
  }, [page]);

  const handleMarkAsRead = async (id?: string) => {
    try {
      const payload = id ? { id } : { markAll: true };
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(id ? "Notification marked as read" : "All marked as read");
        if (id) {
          setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
          );
        } else {
          setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        }
        
        window.dispatchEvent(
          new CustomEvent("notificationsUpdated", {
            detail: { action: id ? "markOne" : "markAll" },
          })
        );
      }
    } catch (error) {
      toast.error("Failed to mark as read");
    }
  };

  const handleDelete = async (id?: string) => {
    try {
      const payload = id ? { id } : { deleteAll: true };
      const res = await fetch("/api/notifications", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(id ? "Notification deleted" : "All notifications deleted");
        if (id) {
          setNotifications((prev) => prev.filter((n) => n.id !== id));
          setTotal((prev) => Math.max(0, prev - 1));
        } else {
          setNotifications([]);
          setTotal(0);
          setTotalPages(1);
        }
        
        window.dispatchEvent(
          new CustomEvent("notificationsUpdated", {
            detail: { action: id ? "markOneRevert" : "markAll" },
          })
        );
      }
    } catch (error) {
      toast.error("Failed to delete notification");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-heading">Doctor Inbox</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your alerts and notifications.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchNotifications(page)}
            className="text-slate-600 bg-white"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleMarkAsRead()}
            className="bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
          >
            <MailOpen className="w-4 h-4 mr-2" />
            Mark all as read
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleDelete()}
            className="bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete all
          </Button>
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
        <CardHeader className="bg-slate-50 border-b border-slate-100 py-4 px-6 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-slate-500" />
            <CardTitle className="text-base font-semibold text-slate-800">Recent Notifications</CardTitle>
          </div>
          <Badge variant="secondary" className="bg-white text-slate-600 border-slate-200">
            {total} Total
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="divide-y divide-slate-100">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="p-4 flex gap-4">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-slate-50 transition-colors flex items-start justify-between gap-4 ${
                    !notification.isRead ? "bg-blue-50/20" : ""
                  }`}
                >
                  <div className="flex items-start gap-4 flex-1">
                    <div className="mt-1">
                      {!notification.isRead ? (
                        <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-transparent mt-2" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className={`text-sm ${!notification.isRead ? "font-semibold text-slate-900" : "font-medium text-slate-700"}`}>
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>{formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!notification.isRead && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMarkAsRead(notification.id)}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8 px-3"
                      >
                        <Check className="w-4 h-4 mr-1.5" />
                        Mark Read
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(notification.id)}
                      className="text-slate-400 hover:text-red-600 hover:bg-red-50 h-8 w-8"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <Bell className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-lg font-medium text-slate-900">All Caught Up!</h3>
              <p className="text-sm text-slate-500 max-w-[250px] mt-1">
                You have no notifications at the moment. We'll alert you when something happens.
              </p>
            </div>
          )}
        </CardContent>
        {totalPages > 1 && (
          <div className="border-t border-slate-100 p-4 bg-slate-50/50 flex justify-between items-center">
            <p className="text-xs text-slate-500 font-medium">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="h-8 bg-white"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="h-8 bg-white"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
