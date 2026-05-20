"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Stethoscope, User, Shield, ClipboardList, ArrowRight, HeartPulse } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Mock Authentication
    setTimeout(() => {
      setLoading(false);
      let role = "";
      const cleanEmail = email.trim().toLowerCase();
      if (cleanEmail === "patient@rhu.com") role = "patient";
      else if (cleanEmail === "staff@rhu.com") role = "staff";
      else if (cleanEmail === "doctor@rhu.com") role = "doctor";
      else if (cleanEmail === "admin@rhu.com") role = "admin";

      if (role && password === "password") {
        toast.success(`Welcome back! Logged in as ${role}.`);
        localStorage.setItem("userRole", role);
        router.push(`/dashboard/${role}`);
      } else {
        toast.error("Invalid credentials. Try using one of the quick login buttons.");
      }
    }, 800);
  };


  return (
    <div className="flex min-h-screen w-full bg-white font-sans">
      
      {/* Left Panel - Hero/Brand (Hidden on small screens) */}
      <div className="hidden lg:flex w-1/2 bg-green-900 relative overflow-hidden items-center justify-center p-12">
        {/* Abstract Background Shapes */}
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-green-800/50 blur-3xl mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-emerald-700/40 blur-3xl mix-blend-screen" />
        <div className="absolute top-[40%] right-[10%] w-[300px] h-[300px] rounded-full bg-green-500/20 blur-2xl mix-blend-screen" />
        
        {/* Glassmorphism Card */}
        <div className="relative z-10 max-w-lg bg-white/10 backdrop-blur-md border border-white/20 p-10 rounded-3xl shadow-2xl">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg mb-8">
            <HeartPulse className="text-green-600 w-8 h-8" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight mb-4">
            Agoo Rural Health Unit
          </h1>
          <p className="text-green-100 text-lg leading-relaxed">
            Streamlining healthcare access for our community. Book appointments, manage records, and access care with our integrated digital portal.
          </p>
          
          <div className="mt-10 flex items-center gap-4 text-green-50 text-sm font-medium">
            <div className="flex -space-x-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-green-800 bg-green-200 overflow-hidden flex items-center justify-center">
                   <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=Doc${i}`} alt="Doctor" className="w-full h-full" />
                </div>
              ))}
            </div>
            <span>Trusted by 50+ Medical Professionals</span>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 md:p-12 relative bg-slate-50/50">
        
        {/* Subtle decorative background for right panel */}
        <div className="absolute inset-0 z-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-50"></div>

        <div className="w-full max-w-[440px] relative z-10">
          
          {/* Mobile Header (Only visible on small screens) */}
          <div className="flex flex-col items-center lg:hidden space-y-4 mb-8">
             <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-700 rounded-2xl flex items-center justify-center shadow-lg shadow-green-600/20">
               <Stethoscope className="text-white w-8 h-8" />
             </div>
             <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Agoo RHU</h2>
          </div>

          {/* Premium Card Wrapper */}
          <div className="bg-white p-8 md:p-10 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
            <div className="space-y-3 mb-8 text-center">
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Welcome back</h2>
              <p className="text-slate-500 font-medium text-sm">Please enter your credentials to access your account.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700 font-bold text-sm">Email Address</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="name@example.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                  className="h-14 px-5 rounded-2xl border-slate-200 focus-visible:ring-4 focus-visible:ring-green-600/10 focus-visible:border-green-600 bg-slate-50/50 hover:bg-slate-50 transition-all duration-200 text-base"
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-slate-700 font-bold text-sm">Password</Label>
                  <a href="#" className="text-sm font-semibold text-green-600 hover:text-green-700 hover:underline transition-all">Forgot password?</a>
                </div>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                  className="h-14 px-5 rounded-2xl border-slate-200 focus-visible:ring-4 focus-visible:ring-green-600/10 focus-visible:border-green-600 bg-slate-50/50 hover:bg-slate-50 transition-all duration-200 text-base font-medium tracking-widest"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full h-14 mt-2 rounded-2xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold text-base transition-all duration-300 shadow-[0_8px_20px_-6px_rgba(22,163,74,0.5)] hover:shadow-[0_12px_25px_-6px_rgba(22,163,74,0.6)] hover:-translate-y-0.5 flex items-center justify-center gap-2 group" 
                disabled={loading}
              >
                {loading ? "Authenticating..." : "Sign In to Portal"}
                {!loading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-100 text-center text-sm font-medium text-slate-600">
              Don't have an account?{" "}
              <a href="/patient-registration.html" className="text-green-600 hover:text-green-700 hover:underline font-bold transition-all">
                Register here
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
