"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, Users, ShieldAlert, CheckCircle } from "lucide-react";
import { toast } from "sonner";

const mockUsers = [
  { id: "USR-101", name: "Dr. Sarah Lopez", role: "Doctor", department: "General", status: "Active" },
  { id: "USR-102", name: "Maria Garcia", role: "Staff", department: "Front Desk", status: "Active" },
  { id: "USR-103", name: "Dr. Robert Chen", role: "Doctor", department: "Dental", status: "Inactive" },
  { id: "USR-104", name: "Juan Reyes", role: "Admin", department: "IT", status: "Active" },
];

export default function AdminDashboard() {
  const [capacity, setCapacity] = useState("50");
  
  const handleSaveConfig = () => {
    toast.success("System configuration saved successfully.");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Administration</h1>
        <p className="text-slate-500">Configure global settings and manage system users.</p>
      </div>

      <Tabs defaultValue="config" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="config" className="flex items-center gap-2"><Settings className="w-4 h-4" /> System Config</TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2"><Users className="w-4 h-4" /> User Management</TabsTrigger>
        </TabsList>
        
        {/* System Config Tab */}
        <TabsContent value="config">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Appointment Rules</CardTitle>
                <CardDescription>Set global constraints for online booking.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Accept Online Appointments</Label>
                    <p className="text-sm text-slate-500">Allow patients to book via portal</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Allow Same-Day Booking</Label>
                    <p className="text-sm text-slate-500">Patients can book for today if slots open</p>
                  </div>
                  <Switch />
                </div>

                <div className="space-y-2 pt-4 border-t">
                  <Label className="text-base">Daily Patient Capacity limit</Label>
                  <p className="text-sm text-slate-500 mb-2">Maximum appointments processed per day across all services.</p>
                  <Input type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} className="w-32" />
                </div>
              </CardContent>
              <CardFooter className="bg-slate-50 border-t flex justify-end p-4">
                <Button onClick={handleSaveConfig} className="bg-green-600">Save Configuration</Button>
              </CardFooter>
            </Card>

            <Card className="border-red-100 bg-red-50/30">
              <CardHeader>
                <CardTitle className="text-red-700 flex items-center gap-2"><ShieldAlert className="w-5 h-5" /> Danger Zone</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-white border border-red-100 rounded-md flex justify-between items-center">
                  <div>
                    <h4 className="font-semibold text-slate-900">Emergency Stop</h4>
                    <p className="text-sm text-slate-500">Temporarily disable all logins and bookings.</p>
                  </div>
                  <Button variant="destructive">Disable System</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* User Management Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>System Users</CardTitle>
                <CardDescription>Manage staff, doctors, and admin accounts.</CardDescription>
              </div>
              <Button className="bg-slate-900 text-white hover:bg-slate-800">Add New User</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium text-slate-500">{user.id}</TableCell>
                      <TableCell className="font-semibold">{user.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={user.role === 'Admin' ? 'bg-purple-50 text-purple-700 border-purple-200' : ''}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>{user.department}</TableCell>
                      <TableCell>
                        {user.status === 'Active' 
                          ? <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 shadow-none border-none flex w-fit items-center gap-1"><CheckCircle className="w-3 h-3" /> Active</Badge>
                          : <Badge variant="secondary">Inactive</Badge>
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="text-green-600">Edit</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
