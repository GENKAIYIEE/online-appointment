"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Stethoscope, User, Shield, ClipboardList, ArrowRight, HeartPulse, Eye, EyeOff, ArrowLeft, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { loginUser } from "@/actions/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [view, setView] = useState<"login" | "forgot" | "success">("login");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(forgotEmail)) {
      setForgotError("Please enter a valid email address.");
      return;
    }

    setForgotLoading(true);
    setTimeout(() => {
      setForgotLoading(false);
      setView("success");
    }, 1500);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await loginUser(email, password);

      if (res.success && res.redirect) {
        toast.success("Login successful! Redirecting...");
        router.push(res.redirect);
      } else {
        toast.error(res.error || "Invalid email or password. Please try again.");
        setLoading(false);
      }
    } catch (error) {
      toast.error("An unexpected error occurred. Please try again later.");
      setLoading(false);
    }
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
            {view === "login" && (
              <>
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
                    </div>
                    <div className="relative">
                      <Input 
                        id="password" 
                        type={showPassword ? "text" : "password"} 
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required 
                        className={`h-14 pl-5 pr-12 rounded-2xl border-slate-200 focus-visible:ring-4 focus-visible:ring-green-600/10 focus-visible:border-green-600 bg-slate-50/50 hover:bg-slate-50 transition-all duration-200 text-base font-medium ${
                          showPassword ? "" : "tracking-widest"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none flex items-center justify-center"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => setView("forgot")}
                        className="text-xs text-slate-500 hover:text-slate-700 hover:underline transition-colors font-medium"
                      >
                        Forgot password?
                      </button>
                    </div>
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
                  <a href="/register" className="text-green-600 hover:text-green-700 hover:underline font-bold transition-all">
                    Register here
                  </a>
                </div>
              </>
            )}

            {view === "forgot" && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                <button
                  onClick={() => setView("login")}
                  className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors mb-6"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to login
                </button>
                <div className="space-y-3 mb-8 text-center">
                  <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Forgot Password</h2>
                  <p className="text-slate-500 font-medium text-sm">Enter your registered email and we'll send you a reset link.</p>
                </div>

                <form onSubmit={handleForgotSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="forgot-email" className="text-slate-700 font-bold text-sm">Email Address</Label>
                    <Input 
                      id="forgot-email" 
                      type="email" 
                      placeholder="name@example.com" 
                      value={forgotEmail}
                      onChange={(e) => {
                        setForgotEmail(e.target.value);
                        if (forgotError) setForgotError("");
                      }}
                      required 
                      className={`h-14 px-5 rounded-2xl border-slate-200 focus-visible:ring-4 focus-visible:ring-green-600/10 focus-visible:border-green-600 bg-slate-50/50 hover:bg-slate-50 transition-all duration-200 text-base ${forgotError ? "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/10" : ""}`}
                    />
                    {forgotError && (
                      <p className="text-xs text-red-500 font-medium mt-1">{forgotError}</p>
                    )}
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-14 mt-2 rounded-2xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold text-base transition-all duration-300 shadow-[0_8px_20px_-6px_rgba(22,163,74,0.5)] hover:shadow-[0_12px_25px_-6px_rgba(22,163,74,0.6)] hover:-translate-y-0.5 flex items-center justify-center gap-2" 
                    disabled={forgotLoading}
                  >
                    {forgotLoading ? "Sending..." : "Send Reset Link"}
                  </Button>
                </form>
              </div>
            )}

            {view === "success" && (
              <div className="animate-in fade-in zoom-in-95 duration-500 text-center py-6">
                <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-3">Check your email</h2>
                <p className="text-slate-500 font-medium text-sm mb-8 max-w-xs mx-auto">
                  If an account exists for that email, a reset link has been sent.
                </p>
                <Button 
                  onClick={() => {
                    setView("login");
                    setForgotEmail("");
                  }}
                  className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-base transition-all duration-300"
                >
                  Back to login
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
