"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2, ClipboardList, Clock } from "lucide-react";

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entity_id: string | null;
  details: any;
  actor: string;
  created_at: string;
}

export function AuditLogsViewer() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/audit-logs");
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      } else {
        toast.error("Failed to load audit logs");
      }
    } catch {
      toast.error("Network error loading audit logs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    });

  const getActionBadge = (action: string) => {
    if (action.includes("CREATE")) {
      return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">{action}</Badge>;
    }
    if (action.includes("DELETE") || action.includes("STOP")) {
      return <Badge className="bg-red-50 text-red-700 border-red-200">{action}</Badge>;
    }
    if (action.includes("UPDATE")) {
      return <Badge className="bg-blue-50 text-blue-700 border-blue-200">{action}</Badge>;
    }
    return <Badge variant="outline" className="text-slate-600">{action}</Badge>;
  };

  return (
    <Card className="bg-white/60 backdrop-blur-md shadow-lg border-slate-200/60">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-indigo-600" />
            System Audit Logs
          </CardTitle>
          <CardDescription>
            A chronological record of administrative actions taken within the portal.
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            Loading logs...
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Clock className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No audit logs found.</p>
            <p className="text-sm">Administrative actions will appear here.</p>
          </div>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80">
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Actor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-slate-50/60 transition-colors">
                    <TableCell className="text-slate-500 whitespace-nowrap text-sm">
                      {formatDate(log.created_at)}
                    </TableCell>
                    <TableCell>{getActionBadge(log.action)}</TableCell>
                    <TableCell className="font-medium text-sm">{log.actor}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
