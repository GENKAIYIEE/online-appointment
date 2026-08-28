"use client";

import { useState } from "react";
import { format } from "date-fns";
import { CalendarX, Search, Trash2, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { addDoctorLeave, deleteDoctorLeave } from "@/actions/admin-leaves";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type LeaveRecord = {
  id: string;
  doctorId: string;
  doctorName: string;
  serviceName: string;
  startDate: string;
  endDate: string;
  reason: string;
  createdAt: string;
};

type DoctorOption = {
  id: string;
  name: string;
  serviceName: string;
};

export default function AdminLeavesClient({
  initialLeaves,
  doctors,
}: {
  initialLeaves: LeaveRecord[];
  doctors: DoctorOption[];
}) {
  const [leaves, setLeaves] = useState<LeaveRecord[]>(initialLeaves);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Dialog State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete State
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filteredLeaves = leaves.filter((l) =>
    l.doctorName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorId || !startDate || !endDate) return;

    if (new Date(endDate) < new Date(startDate)) {
      toast.error("End date cannot be before start date.");
      return;
    }

    setIsSubmitting(true);
    const res = await addDoctorLeave(selectedDoctorId, startDate, endDate, reason);
    if (res.success) {
      toast.success("Doctor leave successfully recorded.");
      setIsAddOpen(false);
      // Reset form
      setSelectedDoctorId("");
      setStartDate("");
      setEndDate("");
      setReason("");
      window.location.reload(); 
    } else {
      toast.error(res.error || "Failed to add doctor leave.");
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsSubmitting(true);
    const res = await deleteDoctorLeave(deleteId);
    if (res.success) {
      toast.success("Doctor leave successfully removed.");
      setDeleteId(null);
      window.location.reload();
    } else {
      toast.error(res.error || "Failed to remove leave.");
      setIsSubmitting(false);
      setDeleteId(null);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarX className="w-8 h-8 text-blue-600" />
            Doctor Leaves
          </h1>
          <p className="text-slate-500 mt-1">
            Manage doctor unavailabilities. Blocked dates will automatically disable slots in the patient portal.
          </p>
        </div>
        <Button
          onClick={() => setIsAddOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Declare Leave
        </Button>
      </div>

      {/* Main Card */}
      <Card className="border-slate-200 shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="bg-white border-b border-slate-100 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg">Declared Leaves</CardTitle>
              <CardDescription>All blocked dates for doctors</CardDescription>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by doctor name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-slate-50 border-slate-200 focus-visible:ring-blue-500 rounded-lg"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="font-semibold text-slate-600 pl-6">Doctor</TableHead>
                <TableHead className="font-semibold text-slate-600">Service</TableHead>
                <TableHead className="font-semibold text-slate-600">Date Range</TableHead>
                <TableHead className="font-semibold text-slate-600">Notes</TableHead>
                <TableHead className="font-semibold text-slate-600 text-right pr-6">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeaves.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-slate-500">
                    <CalendarX className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                    No doctor leaves found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredLeaves.map((leave) => (
                  <TableRow key={leave.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell className="pl-6 font-medium text-slate-900">
                      {leave.doctorName}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-slate-100 text-slate-700 font-normal">
                        {leave.serviceName}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        <span className="font-semibold text-slate-700">
                          {format(new Date(leave.startDate), "MMM d, yyyy")} - {format(new Date(leave.endDate), "MMM d, yyyy")}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm">
                      {leave.reason}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteId(leave.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 mr-1.5" />
                        Revoke
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Leave Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleAddLeave}>
            <DialogHeader>
              <DialogTitle>Declare Doctor Leave</DialogTitle>
              <DialogDescription>
                Block out a specific date for a doctor. This will disable booking slots for that day.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Select Doctor <span className="text-red-500">*</span></label>
                <select
                  required
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                >
                  <option value="" disabled>-- Choose a doctor --</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.serviceName})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Start Date <span className="text-red-500">*</span></label>
                  <Input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]} // Prevents past dates
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">End Date <span className="text-red-500">*</span></label>
                  <Input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate || new Date().toISOString().split('T')[0]} // Must be after start date
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Notes (Optional)</label>
                <Input
                  type="text"
                  placeholder="e.g. Sick leave, Vacation, Seminar..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Confirm Leave"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Revoke Dialog */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke Leave</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this leave? The appointment slots for this date will become available again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Yes, Revoke Leave"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
