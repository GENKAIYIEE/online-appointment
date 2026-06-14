"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
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
import { Separator } from "@/components/ui/separator";
import { User, ShieldCheck, Loader2 } from "lucide-react";

export default function SettingsPage() {
  // --- Profile ---
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");

  // --- Security ---
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [securityLoading, setSecurityLoading] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/admin/settings/profile");
        if (res.ok) {
          const data = await res.json();
          setName(data.name || "");
          setEmail(data.email || "");
        }
      } catch (error) {
        console.error("Failed to load profile", error);
      }
    };
    fetchProfile();
  }, []);

  const handleSaveProfile = async () => {
    setProfileError("");
    setProfileLoading(true);
    try {
      const res = await fetch("/api/admin/settings/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Profile updated successfully.");
      } else {
        setProfileError(data.error || "Failed to update profile.");
      }
    } catch (error) {
      setProfileError("An unexpected error occurred.");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    setPasswordError("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("All password fields are required.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }

    setSecurityLoading(true);
    try {
      const res = await fetch("/api/admin/settings/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Password updated successfully.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPasswordError(data.error || "Failed to update password.");
      }
    } catch (error) {
      setPasswordError("An unexpected error occurred.");
    } finally {
      setSecurityLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* ── Page Header ── */}
      <div>
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 tracking-tight">
          Settings
        </h1>
        <p className="text-slate-500 mt-1">
          Manage your account and preferences.
        </p>
      </div>

      <Separator />

      {/* ── Profile Section ── */}
      <Card className="bg-white/70 backdrop-blur-sm shadow-sm border-slate-200/70">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50">
              <User className="w-4 h-4 text-blue-600" />
            </div>
            Profile
          </CardTitle>
          <CardDescription>
            Update your display name and email address.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label htmlFor="full-name">Full Name</Label>
              <Input
                id="full-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                className="bg-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="bg-white"
              />
            </div>
          </div>
          {profileError && (
            <p className="text-sm text-red-600 flex items-center gap-1.5 mt-2">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-600" />
              {profileError}
            </p>
          )}
        </CardContent>
        <CardFooter className="border-t bg-slate-50/60 flex justify-end px-6 py-4">
          <Button
            onClick={handleSaveProfile}
            disabled={profileLoading}
            className="bg-green-600 hover:bg-green-700 text-white gap-2"
          >
            {profileLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Changes
          </Button>
        </CardFooter>
      </Card>

      {/* ── Security Section ── */}
      <Card className="bg-white/70 backdrop-blur-sm shadow-sm border-slate-200/70">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-50">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
            </div>
            Security
          </CardTitle>
          <CardDescription>
            Change your password to keep your account secure.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="current-password">Current Password</Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => {
                setCurrentPassword(e.target.value);
                setPasswordError("");
              }}
              placeholder="Enter your current password"
              className="bg-white max-w-sm"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setPasswordError("");
                }}
                placeholder="At least 8 characters"
                className="bg-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setPasswordError("");
                }}
                placeholder="Re-enter new password"
                className="bg-white"
              />
            </div>
          </div>

          {/* Inline validation error */}
          {passwordError && (
            <p className="text-sm text-red-600 flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-600" />
              {passwordError}
            </p>
          )}
        </CardContent>
        <CardFooter className="border-t bg-slate-50/60 flex justify-end px-6 py-4">
          <Button
            onClick={handleUpdatePassword}
            disabled={securityLoading}
            variant="outline"
            className="gap-2 border-amber-200 text-amber-700 hover:bg-amber-50"
          >
            {securityLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            Update Password
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
