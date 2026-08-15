"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, UserPlus, Users, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { createAdmin, getAdmins, updateAdmin, deleteUser } from "@/actions/users";

export function AdminManagement() {
  // --- Add Admin ---
  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [adminError, setAdminError] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const getPasswordStrength = (password: string) => {
    if (!password) return { score: 0, label: "", color: "bg-slate-200", isStrong: false };
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[^a-zA-Z\d]/.test(password)) score += 1;

    if (score <= 2) return { score, label: "Weak", color: "bg-red-500", isStrong: false };
    if (score <= 4) return { score, label: "Good", color: "bg-amber-500", isStrong: false };
    return { score, label: "Strong", color: "bg-emerald-500", isStrong: true };
  };

  const strength = getPasswordStrength(newAdminPassword);

  // --- List Admins ---
  const [adminsList, setAdminsList] = useState<any[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);

  // --- Edit Admin ---
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<any>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  // --- Delete Admin ---
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState<any>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchAdmins = async () => {
    setLoadingAdmins(true);
    try {
      const data = await getAdmins();
      setAdminsList(data);
    } catch (error) {
      console.error("Failed to load admins", error);
    } finally {
      setLoadingAdmins(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleAddAdmin = async () => {
    setAdminError("");

    if (!newAdminName.trim() || !newAdminEmail.trim() || !newAdminPassword) {
      setAdminError("All fields are required to create an admin.");
      return;
    }
    if (newAdminPassword.length < 8) {
      setAdminError("Password must be at least 8 characters.");
      return;
    }
    if (!strength.isStrong) {
      setAdminError("Password is not strong enough. Please use a stronger password.");
      return;
    }

    setAdminLoading(true);
    try {
      await createAdmin({
        name: newAdminName,
        email: newAdminEmail,
        password: newAdminPassword,
      });
      toast.success("Administrator account created successfully.");
      setNewAdminName("");
      setNewAdminEmail("");
      setNewAdminPassword("");
      fetchAdmins();
    } catch (error: any) {
      setAdminError(error.message || "Failed to create administrator account.");
    } finally {
      setAdminLoading(false);
    }
  };

  const openEditDialog = (admin: any) => {
    setEditingAdmin({ ...admin, password: "" });
    setEditError("");
    setIsEditDialogOpen(true);
  };

  const handleEditAdmin = async () => {
    if (!editingAdmin.name.trim() || !editingAdmin.email.trim()) {
      setEditError("Name and email are required.");
      return;
    }
    if (editingAdmin.password && editingAdmin.password.length < 8) {
      setEditError("Password must be at least 8 characters.");
      return;
    }

    setEditLoading(true);
    setEditError("");
    try {
      await updateAdmin(editingAdmin.id, {
        name: editingAdmin.name,
        email: editingAdmin.email,
        password: editingAdmin.password || undefined,
      });
      toast.success("Administrator updated successfully.");
      setIsEditDialogOpen(false);
      fetchAdmins();
    } catch (error: any) {
      setEditError(error.message || "Failed to update administrator.");
    } finally {
      setEditLoading(false);
    }
  };

  const openDeleteDialog = (admin: any) => {
    setAdminToDelete(admin);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteAdmin = async () => {
    setDeleteLoading(true);
    try {
      await deleteUser(adminToDelete.id);
      toast.success("Administrator deleted successfully.");
      setIsDeleteDialogOpen(false);
      fetchAdmins();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete administrator.");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Add Administrator Section ── */}
      <Card className="bg-white/70 backdrop-blur-sm shadow-sm border-slate-200/70">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-50">
              <UserPlus className="w-4 h-4 text-emerald-600" />
            </div>
            Add Administrator
          </CardTitle>
          <CardDescription>
            Create a new administrator account with full system access.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label htmlFor="new-admin-name">Full Name</Label>
              <Input
                id="new-admin-name"
                type="text"
                value={newAdminName}
                onChange={(e) => {
                  setNewAdminName(e.target.value);
                  setAdminError("");
                }}
                placeholder="Admin name"
                className="bg-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-admin-email">Email Address</Label>
              <Input
                id="new-admin-email"
                type="email"
                value={newAdminEmail}
                onChange={(e) => {
                  setNewAdminEmail(e.target.value);
                  setAdminError("");
                }}
                placeholder="admin@example.com"
                className="bg-white"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="new-admin-password">Password</Label>
              <div className="relative max-w-sm">
                <Input
                  id="new-admin-password"
                  type={showPassword ? "text" : "password"}
                  value={newAdminPassword}
                  onChange={(e) => {
                    setNewAdminPassword(e.target.value);
                    setAdminError("");
                  }}
                  placeholder="At least 8 characters"
                  className="bg-white pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {newAdminPassword && (
                <div className="max-w-sm mt-2">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-500 font-medium">Password strength</span>
                    <span className={cn("font-medium", {
                      "text-red-600": strength.label === "Weak",
                      "text-amber-600": strength.label === "Good",
                      "text-emerald-600": strength.label === "Strong",
                    })}>
                      {strength.label}
                    </span>
                  </div>
                  <div className="flex h-1.5 gap-1 w-full">
                    <div className={cn("flex-1 rounded-full transition-colors", newAdminPassword ? strength.color : "bg-slate-200")} />
                    <div className={cn("flex-1 rounded-full transition-colors", strength.score >= 3 ? strength.color : "bg-slate-200")} />
                    <div className={cn("flex-1 rounded-full transition-colors", strength.score >= 5 ? strength.color : "bg-slate-200")} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {adminError && (
            <p className="text-sm text-red-600 flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-600" />
              {adminError}
            </p>
          )}
        </CardContent>
        <CardFooter className="border-t bg-slate-50/60 flex justify-end px-6 py-4">
          <Button
            onClick={handleAddAdmin}
            disabled={adminLoading}
            variant="outline"
            className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
          >
            {adminLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            Create Admin
          </Button>
        </CardFooter>
      </Card>

      {/* ── Admin List Section ── */}
      <Card className="bg-white/70 backdrop-blur-sm shadow-sm border-slate-200/70">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-50">
              <Users className="w-4 h-4 text-indigo-600" />
            </div>
            Administrator Accounts
          </CardTitle>
          <CardDescription>
            List of all administrators with access to the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingAdmins ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
            </div>
          ) : adminsList.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              No other administrators found.
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Created On</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {adminsList.map((admin) => (
                    <tr key={admin.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-900">{admin.name}</td>
                      <td className="px-4 py-3 text-slate-600">{admin.email}</td>
                      <td className="px-4 py-3 text-slate-500">
                        {admin.created_at ? format(new Date(admin.created_at), "MMM d, yyyy") : "N/A"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(admin)}
                            className="h-8 w-8 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDeleteDialog(admin)}
                            className="h-8 w-8 text-slate-500 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Edit Admin Dialog ── */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Administrator</DialogTitle>
            <DialogDescription>
              Update administrator details. Leave the password blank if you do not wish to change it.
            </DialogDescription>
          </DialogHeader>
          {editingAdmin && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Full Name</Label>
                <Input
                  id="edit-name"
                  value={editingAdmin.name}
                  onChange={(e) => setEditingAdmin({ ...editingAdmin, name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-email">Email Address</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editingAdmin.email}
                  onChange={(e) => setEditingAdmin({ ...editingAdmin, email: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-password">New Password (Optional)</Label>
                <Input
                  id="edit-password"
                  type="password"
                  placeholder="Leave blank to keep current"
                  value={editingAdmin.password}
                  onChange={(e) => setEditingAdmin({ ...editingAdmin, password: e.target.value })}
                />
              </div>
              {editError && (
                <p className="text-sm text-red-600 mt-2">{editError}</p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={editLoading}>
              Cancel
            </Button>
            <Button onClick={handleEditAdmin} disabled={editLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {editLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Admin Dialog ── */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Delete Administrator
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete <strong>{adminToDelete?.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={deleteLoading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteAdmin} disabled={deleteLoading}>
              {deleteLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
