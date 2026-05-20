"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, ClipboardList, Clock, CheckCircle2, UserPlus } from "lucide-react";
import { toast } from "sonner";

const queueData = [
  { id: "APT-001", name: "Juan Dela Cruz", type: "General", time: "08:00 AM", status: "Completed" },
  { id: "APT-002", name: "Maria Clara", type: "Maternal", time: "08:30 AM", status: "In Progress" },
  { id: "APT-003", name: "Pedro Penduko", type: "Dental", time: "09:00 AM", status: "Waiting" },
  { id: "APT-004", name: "Lolo Jose (Senior)", type: "General", time: "09:15 AM", status: "Waiting" },
  { id: "APT-005", name: "Baby Angelo", type: "Vaccination", time: "09:30 AM", status: "Waiting" },
];

const getStatusBadge = (status: string) => {
  switch(status) {
    case "Completed": return <Badge className="bg-emerald-500 hover:bg-emerald-600">Completed</Badge>;
    case "In Progress": return <Badge className="bg-green-500 hover:bg-green-600">In Progress</Badge>;
    case "Waiting": return <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">Waiting</Badge>;
    default: return <Badge>{status}</Badge>;
  }
};

export default function StaffDashboard() {
  const handleProxyBooking = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Walk-in patient successfully registered and added to queue.");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Staff Desk</h1>
        <p className="text-slate-500">Manage today's appointments and walk-in patients.</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Today</p>
              <h3 className="text-2xl font-bold text-slate-900">42 <span className="text-sm text-slate-400 font-normal">/ 50 limit</span></h3>
            </div>
            <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center">
              <Users className="text-green-600 w-6 h-6" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Walk-ins</p>
              <h3 className="text-2xl font-bold text-slate-900">12</h3>
            </div>
            <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center">
              <UserPlus className="text-emerald-600 w-6 h-6" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Waiting</p>
              <h3 className="text-2xl font-bold text-slate-900">15</h3>
            </div>
            <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center">
              <Clock className="text-amber-600 w-6 h-6" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Completed</p>
              <h3 className="text-2xl font-bold text-slate-900">14</h3>
            </div>
            <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center">
              <CheckCircle2 className="text-emerald-600 w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="queue" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="queue">Today's Queue</TabsTrigger>
          <TabsTrigger value="proxy">Proxy Booking (Walk-in)</TabsTrigger>
        </TabsList>
        
        <TabsContent value="queue">
          <Card>
            <CardHeader>
              <CardTitle>Live Queue Monitoring</CardTitle>
              <CardDescription>Real-time view of patients scheduled for today.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ref ID</TableHead>
                    <TableHead>Patient Name</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {queueData.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium text-slate-500">{row.id}</TableCell>
                      <TableCell className="font-semibold">{row.name}</TableCell>
                      <TableCell>{row.type}</TableCell>
                      <TableCell>{row.time}</TableCell>
                      <TableCell>{getStatusBadge(row.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="text-green-600">Update</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="proxy">
          <Card className="max-w-2xl">
            <form onSubmit={handleProxyBooking}>
              <CardHeader>
                <CardTitle>Register Walk-in Patient</CardTitle>
                <CardDescription>Book an appointment on behalf of a patient (e.g., Seniors, no internet access).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>First Name</Label>
                    <Input placeholder="Juan" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Last Name</Label>
                    <Input placeholder="Dela Cruz" required />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date of Birth</Label>
                    <Input type="date" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Contact Number</Label>
                    <Input placeholder="09XX XXX XXXX" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Service Required</Label>
                  <Select required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select service type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General Consultation</SelectItem>
                      <SelectItem value="maternal">Maternal Care</SelectItem>
                      <SelectItem value="dental">Dental Services</SelectItem>
                      <SelectItem value="senior">Senior Citizen Checkup</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
              <CardFooter className="bg-slate-50 border-t justify-end p-4">
                <Button type="submit" className="bg-green-600">Register to Queue</Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
