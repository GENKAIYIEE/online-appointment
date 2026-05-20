"use client";

import { useEffect, useState } from "react";
import { Bell, Search, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";

export function Navbar() {
  const [role, setRole] = useState<string>("User");

  useEffect(() => {
    const storedRole = localStorage.getItem("userRole");
    if (storedRole) {
      setRole(storedRole.charAt(0).toUpperCase() + storedRole.slice(1));
    }
  }, []);

  return (
    <header className="h-16 flex items-center justify-between px-6 bg-white border-b border-slate-200">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="w-5 h-5 text-slate-600" />
        </Button>
        <div className="relative hidden md:block">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input 
            placeholder="Search..." 
            className="w-64 pl-9 bg-slate-50 border-slate-200 h-9"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="relative text-slate-500 hover:text-slate-700">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
        </Button>
        
        <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-sm font-medium text-slate-900">{role} Account</span>
            <span className="text-xs text-slate-500">RHU Clinic</span>
          </div>
          <Avatar className="h-9 w-9 border border-slate-200">
            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${role}`} />
            <AvatarFallback>{role.charAt(0)}</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}
