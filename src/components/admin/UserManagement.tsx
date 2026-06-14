"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  UserPlus,
  Stethoscope,
  ShieldCheck,
  RefreshCw,
  Loader2,
  Pencil,
  Trash2,
  Eye,
  EyeOff
} from "lucide-react";
import { getServices } from "@/actions/slots-management";
import { getServiceDoctorMap } from "@/actions/users";

// ── Types ────────────────────────────────────────────────────────────────────
interface Service {
  id: string;
  name: string;
}

interface UserRecord {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: "STAFF" | "DOCTOR";
  assignedService: Service | null;
  created_at: string;
}

// ── Component ────────────────────────────────────────────────────────────────
export function UserManagement() {
  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"STAFF" | "DOCTOR">("STAFF");
  const [assignedServiceId, setAssignedServiceId] = useState("");
  
  const [creating, setCreating] = useState(false);

  // List and Meta state
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [serviceDoctorMap, setServiceDoctorMap] = useState<Record<string, { doctorId: string; doctorName: string } | null>>({});
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Modals state
  const [editUser, setEditUser] = useState<UserRecord | null>(null);
  const [deleteUser, setDeleteUser] = useState<UserRecord | null>(null);
  const [confirmOverrideServiceId, setConfirmOverrideServiceId] = useState<string | null>(null);
  const [overrideMode, setOverrideMode] = useState<"CREATE" | "UPDATE" | null>(null);

  const [editPassword, setEditPassword] = useState("");
  const [editConfirmPassword, setEditConfirmPassword] = useState("");
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [showEditConfirmPassword, setShowEditConfirmPassword] = useState(false);
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Fetch Initial Data ─────────────────────────────────────────────────────
  const fetchData = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoadingUsers(true);
    try {
      const [resUsers, svcs, svcDocMap] = await Promise.all([
        fetch("/api/admin/users"),
        getServices(),
        getServiceDoctorMap(),
      ]);

      if (resUsers.ok) {
        setUsers(await resUsers.json());
      } else if (!isBackground) {
        toast.error("Failed to load users");
      }
      setServices(svcs);
      setServiceDoctorMap(svcDocMap);
    } catch {
      if (!isBackground) toast.error("Network error loading data");
    } finally {
      if (!isBackground) setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const openEditModal = (user: UserRecord) => {
    setEditUser(user);
    setEditPassword("");
    setEditConfirmPassword("");
    setShowEditPassword(false);
    setShowEditConfirmPassword(false);
  };

  const closeEditModal = () => {
    setEditUser(null);
    setEditPassword("");
    setEditConfirmPassword("");
    setShowEditPassword(false);
    setShowEditConfirmPassword(false);
  };

  // ── Create user ──────────────────────────────────────────────────────────
  const doCreate = async (forceReassign = false) => {
    setCreating(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: name.trim(), 
          email: email.trim(),
          password: password,
          phone: phone.trim() || null, 
          role,
          assignedServiceId: role === "DOCTOR" ? assignedServiceId : undefined,
          forceReassign
        }),
      });
      if (res.ok) {
        const serviceName = services.find(s => s.id === assignedServiceId)?.name;
        toast.success(role === "DOCTOR" 
          ? `Doctor account created and assigned to ${serviceName} successfully!` 
          : `Staff account created successfully!`);
        setName("");
        setEmail("");
        setPassword("");
        setPhone("");
        setRole("STAFF");
        setAssignedServiceId("");
        setConfirmOverrideServiceId(null);
        setOverrideMode(null);
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to create user");
        setConfirmOverrideServiceId(null);
        setOverrideMode(null);
      }
    } catch {
      toast.error("Network error while creating user");
      setConfirmOverrideServiceId(null);
      setOverrideMode(null);
    } finally {
      setCreating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      toast.error("Name, email, and password are required");
      return;
    }
    if (role === "DOCTOR" && !assignedServiceId) {
      toast.error("Please assign a service for this doctor.");
      return;
    }

    if (role === "DOCTOR") {
      const existingAssignment = serviceDoctorMap[assignedServiceId];
      if (existingAssignment) {
        setConfirmOverrideServiceId(assignedServiceId);
        setOverrideMode("CREATE");
        return;
      }
    }

    doCreate(false);
  };

  // ── Update user ──────────────────────────────────────────────────────────
  const handleUpdate = async (e?: React.FormEvent, forceReassign = false) => {
    if (e) e.preventDefault();
    if (!editUser) return;
    
    if (editUser.role === "DOCTOR" && !editUser.assignedService?.id) {
      toast.error("Please assign a service for this doctor.");
      return;
    }

    if (!forceReassign && editUser.role === "DOCTOR" && editUser.assignedService?.id) {
      const newSvcId = editUser.assignedService.id;
      const originalUser = users.find(u => u.id === editUser.id);
      const oldSvcId = originalUser?.assignedService?.id;
      
      if (newSvcId !== oldSvcId) {
        const existingAssignment = serviceDoctorMap[newSvcId];
        if (existingAssignment && existingAssignment.doctorId !== editUser.id) {
          setConfirmOverrideServiceId(newSvcId);
          setOverrideMode("UPDATE");
          return;
        }
      }
    }

    if (editPassword || editConfirmPassword) {
      if (!editPassword || !editConfirmPassword) {
        toast.error("Please fill both password fields");
        return;
      }
      if (editPassword !== editConfirmPassword) {
        toast.error("Passwords do not match");
        return;
      }
      if (editPassword.length < 8) {
        toast.error("Minimum 8 characters required");
        return;
      }
    }

    setIsUpdating(true);
    try {
      const payload: any = {
        name: editUser.name.trim(),
        phone: editUser.phone?.trim() || null,
        assignedServiceId: editUser.role === "DOCTOR" ? editUser.assignedService?.id : undefined,
        forceReassign
      };
      
      if (editPassword) {
        payload.password = editPassword;
      }

      const res = await fetch(`/api/admin/users/${editUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success("User updated successfully!");
        closeEditModal();
        setConfirmOverrideServiceId(null);
        setOverrideMode(null);
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update user");
        setConfirmOverrideServiceId(null);
        setOverrideMode(null);
      }
    } catch {
      toast.error("Network error while updating");
      setConfirmOverrideServiceId(null);
      setOverrideMode(null);
    } finally {
      setIsUpdating(false);
    }
  };

  // ── Delete user ──────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteUser) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/users/${deleteUser.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("User deleted successfully!");
        setDeleteUser(null);
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete user");
      }
    } catch {
      toast.error("Network error while deleting");
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Helpers ──────────────────────────────────────────────────────────────
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const roleBadge = (r: "STAFF" | "DOCTOR") =>
    r === "DOCTOR" ? (
      <Badge className="bg-blue-50 text-blue-700 border border-blue-200 shadow-none flex w-fit items-center gap-1">
        <Stethoscope className="w-3 h-3" /> Doctor
      </Badge>
    ) : (
      <Badge className="bg-amber-50 text-amber-700 border border-amber-200 shadow-none flex w-fit items-center gap-1">
        <ShieldCheck className="w-3 h-3" /> Staff
      </Badge>
    );

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Registration Form ───────────────────────────────────────────── */}
      <Card className="bg-white/60 backdrop-blur-md shadow-lg border-slate-200/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-[#16a34a]" />
            Register New Staff / Doctor
          </CardTitle>
          <CardDescription>
            Enter user details and assign a role. The new account will appear in
            the list below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div className="sm:col-span-1">
              <label className="block text-sm font-medium mb-1" htmlFor="reg-name">
                Name <span className="text-red-500">*</span>
              </label>
              <Input
                id="reg-name"
                placeholder="e.g., Dr. Alice Nguyen"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="sm:col-span-1">
              <label className="block text-sm font-medium mb-1" htmlFor="reg-email">
                Email <span className="text-red-500">*</span>
              </label>
              <Input
                id="reg-email"
                type="email"
                placeholder="alice@clinic.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="sm:col-span-1 relative">
              <label className="block text-sm font-medium mb-1" htmlFor="reg-password">
                Password <span className="text-red-500">*</span>
              </label>
              <Input
                id="reg-password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-[32px] text-slate-400 hover:text-slate-600"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="sm:col-span-1">
              <label className="block text-sm font-medium mb-1" htmlFor="reg-phone">
                Phone <span className="text-slate-400">(optional)</span>
              </label>
              <Input
                id="reg-phone"
                placeholder="+63 912 345 6789"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            
            <div className="sm:col-span-1">
              <label className="block text-sm font-medium mb-1" htmlFor="reg-role">
                Role <span className="text-red-500">*</span>
              </label>
              <Select value={role} onValueChange={(v) => {
                setRole(v as "STAFF" | "DOCTOR");
                if (v === "STAFF") setAssignedServiceId("");
              }}>
                <SelectTrigger id="reg-role">
                  <SelectValue placeholder="Select role">
                    {role === "STAFF" ? "Staff" : "Doctor"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STAFF">Staff</SelectItem>
                  <SelectItem value="DOCTOR">Doctor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {role === "DOCTOR" && (
              <div className="sm:col-span-1 lg:col-span-2">
                <label className="block text-sm font-medium mb-1" htmlFor="reg-service">
                  Assigned Service <span className="text-red-500">*</span>
                </label>
                <Select value={assignedServiceId} onValueChange={(val) => setAssignedServiceId(val || "")}>
                  <SelectTrigger id="reg-service">
                    <SelectValue placeholder="Select a service">
                      {assignedServiceId ? services.find(s => s.id === assignedServiceId)?.name : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {services.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} {serviceDoctorMap[s.id] ? `(Assigned: ${serviceDoctorMap[s.id]?.doctorName})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="sm:col-span-1">
              <Button
                type="submit"
                disabled={creating}
                className="w-full bg-[#16a34a] hover:bg-green-700 text-white transition-colors"
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating…
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" /> Create User
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ── User List ───────────────────────────────────────────────────── */}
      <Card className="bg-white/60 backdrop-blur-md shadow-lg border-slate-200/60">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>All Staff &amp; Doctors</CardTitle>
            <CardDescription>
              {users.length} registered user{users.length !== 1 && "s"}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData()}
            disabled={loadingUsers}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loadingUsers ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {loadingUsers ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              Loading users…
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <UserPlus className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No staff or doctors registered yet.</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80">
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Assigned Service</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Registered</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} className="hover:bg-slate-50/60 transition-colors">
                      <TableCell className="font-semibold">
                        {user.name}
                        <div className="text-xs text-slate-400 font-normal">{user.email}</div>
                      </TableCell>
                      <TableCell>{roleBadge(user.role)}</TableCell>
                      <TableCell>
                        {user.role === "DOCTOR" ? (
                          <span className="font-medium text-slate-700">{user.assignedService?.name || <span className="text-red-500">Unassigned</span>}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-500">
                        {user.phone || "—"}
                      </TableCell>
                      <TableCell className="text-slate-500">
                        {formatDate(user.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openEditModal(user)}>
                            <Pencil className="w-4 h-4 text-slate-500" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteUser(user)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Override Warning Modal ──────────────────────────────────────── */}
      <Dialog open={!!confirmOverrideServiceId} onOpenChange={(o) => {
        if (!o) {
          setConfirmOverrideServiceId(null);
          setOverrideMode(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reassign Service?</DialogTitle>
            <DialogDescription>
              This service already has an assigned doctor: <strong className="text-slate-800">{confirmOverrideServiceId ? serviceDoctorMap[confirmOverrideServiceId]?.doctorName : ""}</strong>.
              <br /><br />
              Assigning a new doctor will replace them. Are you sure?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setConfirmOverrideServiceId(null);
              setOverrideMode(null);
            }}>Cancel</Button>
            <Button 
              onClick={() => overrideMode === "CREATE" ? doCreate(true) : handleUpdate(undefined, true)} 
              disabled={creating || isUpdating} 
              className="bg-[#16a34a] hover:bg-green-700"
            >
              {(creating || isUpdating) ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Confirm Reassignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Modal ──────────────────────────────────────────────────── */}
      <Dialog open={!!editUser} onOpenChange={(o) => !o && closeEditModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update information for {editUser?.name}. Role and Email cannot be changed.
            </DialogDescription>
          </DialogHeader>
          {editUser && (
            <form onSubmit={handleUpdate} className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input value={editUser.name} onChange={e => setEditUser({...editUser, name: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Phone</label>
                <Input value={editUser.phone || ""} onChange={e => setEditUser({...editUser, phone: e.target.value})} />
              </div>
              {editUser.role === "DOCTOR" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Assigned Service <span className="text-red-500">*</span></label>
                  <Select 
                    value={editUser.assignedService?.id || ""} 
                    onValueChange={v => setEditUser({...editUser, assignedService: services.find(s => s.id === v) || null})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a service">
                        {editUser.assignedService?.name || undefined}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {services.map(s => {
                        const existingAssigned = serviceDoctorMap[s.id];
                        // Don't show "Assigned to [This Doctor]" in their own dropdown, just show it if assigned to someone else
                        const assignedText = existingAssigned && existingAssigned.doctorId !== editUser.id 
                          ? ` (Assigned: ${existingAssigned.doctorName})` 
                          : "";
                        return (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}{assignedText}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="pt-4 mt-2 border-t border-slate-100">
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-slate-900">Reset Password</h4>
                  <p className="text-xs text-slate-500">Leave blank to keep current password</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 relative">
                    <label className="text-sm font-medium">New Password</label>
                    <Input 
                      type={showEditPassword ? "text" : "password"} 
                      placeholder="••••••••" 
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-[32px] text-slate-400 hover:text-slate-600"
                      onClick={() => setShowEditPassword(!showEditPassword)}
                    >
                      {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="space-y-2 relative">
                    <label className="text-sm font-medium">Confirm Password</label>
                    <Input 
                      type={showEditConfirmPassword ? "text" : "password"} 
                      placeholder="••••••••" 
                      value={editConfirmPassword}
                      onChange={(e) => setEditConfirmPassword(e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-[32px] text-slate-400 hover:text-slate-600"
                      onClick={() => setShowEditConfirmPassword(!showEditConfirmPassword)}
                    >
                      {showEditConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={closeEditModal}>Cancel</Button>
                <Button type="submit" disabled={isUpdating} className="bg-[#16a34a] hover:bg-green-700">
                  {isUpdating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Modal ───────────────────────────────────── */}
      <Dialog open={!!deleteUser} onOpenChange={(o) => !o && setDeleteUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong className="text-slate-800">{deleteUser?.name}</strong>? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteUser(null)} disabled={isDeleting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Yes, Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
