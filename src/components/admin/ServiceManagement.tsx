"use client";

import { useState, useEffect } from "react";
import { 
  Stethoscope, 
  Trash2, 
  Plus, 
  AlertCircle, 
  RefreshCw 
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

type Service = {
  id: string;
  name: string;
  doctor_name: string;
  created_at: string;
  assignedDoctor?: {
    id: string;
    name: string;
  } | null;
};

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  assignedService?: Service | null;
};

import { createService, deleteService } from "@/actions/services";

export function ServiceManagement() {
  const [services, setServices] = useState<Service[]>([]);
  const [doctors, setDoctors] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [newServiceName, setNewServiceName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete State
  const [deleteServiceId, setDeleteServiceId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [svcRes, usrRes] = await Promise.all([
        fetch("/api/admin/services"),
        fetch("/api/admin/users")
      ]);
      
      if (svcRes.ok && usrRes.ok) {
        const svcs = await svcRes.json();
        const usrs = await usrRes.json();
        
        setServices(svcs);
        // Filter only doctors
        setDoctors(usrs.filter((u: User) => u.role === "DOCTOR"));
      } else {
        toast.error("Failed to load data");
      }
    } catch (e) {
      console.error(e);
      toast.error("Error connecting to server");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceName.trim()) {
      toast.error("Service name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createService({
        name: newServiceName
      });

      if (result.success) {
        toast.success("Service created successfully!");
        setNewServiceName("");
        fetchData();
      } else {
        toast.error(result.error || "Failed to create service");
      }
    } catch (e) {
      toast.error("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteService = async () => {
    if (!deleteServiceId) return;
    
    setIsDeleting(true);
    try {
      const result = await deleteService(deleteServiceId);

      if (result.success) {
        toast.success("Service deleted successfully");
        setDeleteServiceId(null);
        fetchData();
      } else {
        toast.error(result.error || "Failed to delete service");
      }
    } catch (e) {
      toast.error("An error occurred");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Service Management</h2>
          <p className="text-slate-500">Add or remove clinic services and manage doctor assignments.</p>
        </div>
        <Button onClick={fetchData} variant="outline" size="sm" className="gap-2">
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ADD SERVICE FORM */}
        <div className="lg:col-span-1">
          <Card className="shadow-sm">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
              <CardTitle className="text-lg flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-600" />
                Add New Service
              </CardTitle>
              <CardDescription>
                Create a new service. A doctor must be assigned to activate it.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleCreateService} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Service Name <span className="text-red-500">*</span></label>
                  <Input 
                    placeholder="e.g. Maternity Care" 
                    value={newServiceName}
                    onChange={(e) => setNewServiceName(e.target.value)}
                    required
                  />
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <p>
                    <strong>Note:</strong> Newly created services will remain hidden from patients until you assign a Doctor to them in the <strong>User Management</strong> tab.
                  </p>
                </div>
                <Button type="submit" disabled={isSubmitting || !newServiceName} className="w-full bg-emerald-600 hover:bg-emerald-700">
                  {isSubmitting ? "Creating..." : "Create Service"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* SERVICES LIST */}
        <div className="lg:col-span-2">
          <Card className="h-full shadow-sm">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
              <CardTitle className="text-lg flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-blue-600" />
                Active Services
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-12 text-center text-slate-500">Loading services...</div>
              ) : services.length === 0 ? (
                <div className="p-12 text-center text-slate-500">No services found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead>Service Name</TableHead>
                        <TableHead>Assigned Doctor</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {services.map(service => (
                        <TableRow key={service.id}>
                          <TableCell className="font-medium text-slate-900">{service.name}</TableCell>
                          <TableCell>
                            {service.assignedDoctor ? (
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                                <span className="text-slate-700">{service.assignedDoctor.name}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-red-600 font-medium">
                                <AlertCircle className="w-4 h-4" /> Unassigned
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-red-600 hover:bg-red-50 hover:text-red-700"
                              onClick={() => setDeleteServiceId(service.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deleteServiceId} onOpenChange={(open) => !open && setDeleteServiceId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Service?</DialogTitle>
            <DialogDescription>
              This will completely remove the service and any associated disabled slots. The assigned doctor will remain in the system but will be unassigned.
              <br /><br />
              <strong className="text-slate-900">Are you absolutely sure?</strong>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteServiceId(null)}>Cancel</Button>
            <Button variant="destructive" disabled={isDeleting} onClick={handleDeleteService}>
              {isDeleting ? "Deleting..." : "Delete Service"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
