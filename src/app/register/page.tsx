"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Stethoscope, ArrowRight, ArrowLeft } from "lucide-react";

const formSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  middleName: z.string().optional(),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  birthday: z.string()
    .min(1, "Date of birth is required")
    .regex(/^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/, "Please enter date in MM/DD/YYYY format")
    .refine((val) => {
      const parts = val.split("/");
      if (parts.length !== 3) return false;
      const month = parseInt(parts[0], 10);
      const day = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);
      
      const currentYear = new Date().getFullYear();
      if (year < 1900 || year > currentYear) return false;

      const date = new Date(year, month - 1, day);
      return (
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day &&
        date <= new Date()
      );
    }, "Please enter a valid past birthdate"),
  sex: z.string().min(1, "Sex is required"),
  maritalStatus: z.string().min(1, "Civil status is required"),
  phone: z.string().regex(/^\d{11}$/, "Contact number must be exactly 11 digits"),
  address: z.string().min(5, "Complete address is required"),
  email: z.string().email("Invalid email address"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[a-z]/, "Must contain at least one lowercase letter")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[0-9]/, "Must contain at least one number"),
  confirmPassword: z.string(),
  terms: z.boolean().refine((val) => val === true, "You must agree to the terms"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type FormValues = z.infer<typeof formSchema>;

const formatBirthdayInput = (value: string) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-");
    return `${month}/${day}/${year}`;
  }
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length === 0) return "";
  if (digits.length <= 2) {
    if (digits.length === 2 && value.endsWith("/")) {
      return `${digits}/`;
    }
    return digits;
  }
  if (digits.length <= 4) {
    const month = digits.slice(0, 2);
    const day = digits.slice(2);
    if (digits.length === 4 && value.endsWith("/")) {
      return `${month}/${day}/`;
    }
    return `${month}/${day}`;
  }
  const month = digits.slice(0, 2);
  const day = digits.slice(2, 4);
  const year = digits.slice(4);
  return `${month}/${day}/${year}`;
};

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { terms: false },
  });

  const { onChange: onBirthdayChange, ...birthdayProps } = register("birthday");
  const { onChange: onPhoneChange, ...phoneProps } = register("phone");
  const passwordValue = watch("password", "");
  const formData = watch();

  const calculateStrength = (pwd: string) => {
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (/[a-z]/.test(pwd)) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;
    return score;
  };

  const strengthScore = calculateStrength(passwordValue);

  const nextStep = async () => {
    const fieldsToValidate: any[] = [
      "firstName",
      "lastName",
      "birthday",
      "sex",
      "maritalStatus",
      "phone",
      "address",
    ];
    const isStep1Valid = await trigger(fieldsToValidate);
    if (isStep1Valid) {
      setStep(2);
    }
  };

  const nextStep2 = async () => {
    const fieldsToValidate: any[] = [
      "email",
      "password",
      "confirmPassword",
      "terms",
    ];
    const isStep2Valid = await trigger(fieldsToValidate);
    if (isStep2Valid) {
      setStep(3);
    }
  };

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    try {
      const { registerPatient } = await import("@/actions/auth");
      
      let isoBirthday = data.birthday;
      const parts = data.birthday.split("/");
      if (parts.length === 3) {
        const [month, day, year] = parts;
        isoBirthday = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      }

      const res = await registerPatient({
        ...data,
        birthday: isoBirthday,
      });

      if (res.success && res.redirect) {
        toast.success("Registration successful! Redirecting...");
        router.push(res.redirect);
      } else {
        toast.error(res.error || "Failed to register. Please try again.");
        setLoading(false);
      }
    } catch (error) {
      toast.error("An unexpected error occurred. Please try again later.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-white font-sans">
      {/* Left Panel */}
      <div className="hidden lg:flex w-2/5 bg-green-900 relative overflow-hidden flex-col p-12">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-green-800/50 blur-3xl mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-emerald-700/40 blur-3xl mix-blend-screen" />
        
        <div className="relative z-10 flex-1">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg mb-10 overflow-hidden">
            <Image src="/rhu1.png" alt="RHU Logo" width={64} height={64} className="w-full h-full object-contain scale-125" />
          </div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight leading-tight mb-4">
            Your health,<br />our priority.
          </h1>
          <p className="text-green-100 text-lg leading-relaxed mb-10">
            Create your account to book appointments at RHU Agoo, La Union.
          </p>
        </div>
        
        <div className="relative z-10 mt-auto">
          <a href="/login" className="text-white font-medium hover:underline">
            Already have an account? Sign in
          </a>
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-full lg:w-3/5 flex items-center justify-center p-6 md:p-12 bg-slate-50 relative">
        <div className="w-full max-w-2xl bg-white p-8 md:p-10 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
          
          <div className="flex items-center justify-between mb-10">
            <div className={`flex items-center gap-3 ${step >= 1 ? 'text-slate-900' : 'text-slate-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= 1 ? 'bg-green-600 text-white' : 'bg-slate-100'}`}>1</div>
              <span className="font-semibold text-sm hidden sm:inline">Personal info</span>
            </div>
            <div className={`h-1 flex-1 mx-2 rounded-full ${step >= 2 ? 'bg-green-600' : 'bg-slate-100'}`} />
            <div className={`flex items-center gap-3 ${step >= 2 ? 'text-slate-900' : 'text-slate-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= 2 ? 'bg-green-600 text-white' : 'bg-slate-100'}`}>2</div>
              <span className="font-semibold text-sm hidden sm:inline">Account setup</span>
            </div>
            <div className={`h-1 flex-1 mx-2 rounded-full ${step >= 3 ? 'bg-green-600' : 'bg-slate-100'}`} />
            <div className={`flex items-center gap-3 ${step >= 3 ? 'text-slate-900' : 'text-slate-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= 3 ? 'bg-green-600 text-white' : 'bg-slate-100'}`}>3</div>
              <span className="font-semibold text-sm hidden sm:inline">Review</span>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-bold">First name</Label>
                    <Input {...register("firstName")} placeholder="Juan" className={errors.firstName ? 'border-red-500' : ''} />
                    {errors.firstName && <p className="text-red-500 text-xs">{errors.firstName.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-1">
                      <Label className="text-slate-700 font-bold whitespace-nowrap">Middle name</Label>
                      <span className="text-slate-400 font-normal text-sm whitespace-nowrap">(If applicable)</span>
                    </div>
                    <Input {...register("middleName")} placeholder="Santos" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-bold">Last name</Label>
                    <Input {...register("lastName")} placeholder="Dela Cruz" className={errors.lastName ? 'border-red-500' : ''} />
                    {errors.lastName && <p className="text-red-500 text-xs">{errors.lastName.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-bold">Date of birth</Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="MM/DD/YYYY"
                      maxLength={10}
                      {...birthdayProps}
                      onChange={(e) => {
                        const formatted = formatBirthdayInput(e.target.value);
                        e.target.value = formatted;
                        onBirthdayChange(e);
                      }}
                      className={errors.birthday ? 'border-red-500' : ''}
                    />
                    {errors.birthday && <p className="text-red-500 text-xs">{errors.birthday.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-bold">Sex</Label>
                    <select {...register("sex")} className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600/20 focus-visible:border-green-600 disabled:cursor-not-allowed disabled:opacity-50 ${errors.sex ? 'border-red-500' : ''}`}>
                      <option value="">Select</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                    {errors.sex && <p className="text-red-500 text-xs">{errors.sex.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-bold">Civil status</Label>
                    <select {...register("maritalStatus")} className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600/20 focus-visible:border-green-600 disabled:cursor-not-allowed disabled:opacity-50 ${errors.maritalStatus ? 'border-red-500' : ''}`}>
                      <option value="">Select</option>
                      <option value="Single">Single</option>
                      <option value="Married">Married</option>
                      <option value="Widowed">Widowed</option>
                      <option value="Separated">Separated</option>
                    </select>
                    {errors.maritalStatus && <p className="text-red-500 text-xs">{errors.maritalStatus.message}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700 font-bold">Contact number</Label>
                  <Input 
                    type="tel" 
                    {...phoneProps} 
                    placeholder="09XXXXXXXXX" 
                    maxLength={11}
                    onChange={(e) => {
                      e.target.value = e.target.value.replace(/\D/g, "");
                      onPhoneChange(e);
                    }}
                    className={errors.phone ? 'border-red-500' : ''} 
                  />
                  {errors.phone && <p className="text-red-500 text-xs">{errors.phone.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700 font-bold">Complete address</Label>
                  <Textarea {...register("address")} placeholder="House/Block/Lot No., Street, Subdivision" className={errors.address ? 'border-red-500' : ''} />
                  {errors.address && <p className="text-red-500 text-xs">{errors.address.message}</p>}
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
                  <div className="lg:hidden w-full text-center sm:text-left order-2 sm:order-1">
                    <p className="text-sm text-slate-500">
                      Already have an account?{" "}
                      <a href="/login" className="text-green-600 font-semibold hover:underline">
                        Sign in
                      </a>
                    </p>
                  </div>
                  <Button type="button" onClick={nextStep} className="w-full sm:w-auto gap-2 bg-green-600 hover:bg-green-700 order-1 sm:order-2 ml-auto">
                    Next Step <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="space-y-2">
                  <Label className="text-slate-700 font-bold">Email address</Label>
                  <Input type="email" {...register("email")} placeholder="juan@example.com" className={errors.email ? 'border-red-500' : ''} />
                  {errors.email && <p className="text-red-500 text-xs">{errors.email.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700 font-bold">Password</Label>
                  <Input type="password" {...register("password")} placeholder="Create a password" className={errors.password ? 'border-red-500' : ''} />
                  
                  {/* Password Strength Indicator */}
                  <div className="flex gap-1 mt-1.5">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div
                        key={level}
                        className={`h-1.5 w-full rounded-full transition-all duration-300 ${
                          strengthScore >= level
                            ? strengthScore < 3
                              ? "bg-red-500"
                              : strengthScore < 5
                              ? "bg-yellow-500"
                              : "bg-green-500"
                            : "bg-slate-200"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 font-medium">
                    {strengthScore === 0 
                      ? "Password strength" 
                      : strengthScore < 3 
                        ? <span className="text-red-500">Weak: Needs uppercase, lowercase, & numbers</span>
                        : strengthScore < 5 
                          ? <span className="text-yellow-600">Good: Add a special symbol to make it stronger</span>
                          : <span className="text-green-600">Strong: Great password!</span>}
                  </p>

                  {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700 font-bold">Confirm password</Label>
                  <Input type="password" {...register("confirmPassword")} placeholder="Confirm password" className={errors.confirmPassword ? 'border-red-500' : ''} />
                  {errors.confirmPassword && <p className="text-red-500 text-xs">{errors.confirmPassword.message}</p>}
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input type="checkbox" id="terms" {...register("terms")} className="rounded text-green-600 focus:ring-green-600 w-4 h-4" />
                  <label htmlFor="terms" className="text-sm text-slate-600">
                    I agree to the Terms and Conditions and Privacy Policy
                  </label>
                </div>
                {errors.terms && <p className="text-red-500 text-xs">{errors.terms.message}</p>}

                <div className="flex justify-between pt-4">
                  <Button type="button" variant="outline" onClick={() => setStep(1)} className="gap-2">
                    <ArrowLeft className="w-4 h-4" /> Back
                  </Button>
                  <Button type="button" onClick={nextStep2} className="gap-2 bg-green-600 hover:bg-green-700">
                    Next Step <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="bg-slate-100 p-6 rounded-xl space-y-4 border border-slate-200">
                  <h3 className="font-bold text-lg text-slate-800 border-b border-slate-200 pb-2">Review Your Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-500">Full Name:</span>
                      <p className="font-semibold text-slate-900">{formData.firstName} {formData.middleName ? formData.middleName + ' ' : ''}{formData.lastName}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Date of Birth:</span>
                      <p className="font-semibold text-slate-900">{formData.birthday}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Sex:</span>
                      <p className="font-semibold text-slate-900">{formData.sex}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Civil Status:</span>
                      <p className="font-semibold text-slate-900">{formData.maritalStatus}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Contact Number:</span>
                      <p className="font-semibold text-slate-900">{formData.phone}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Email Address:</span>
                      <p className="font-semibold text-slate-900">{formData.email}</p>
                    </div>
                    <div className="md:col-span-2">
                      <span className="text-slate-500">Complete Address:</span>
                      <p className="font-semibold text-slate-900">{formData.address}</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <Button type="button" variant="outline" onClick={() => setStep(2)} className="gap-2">
                    <ArrowLeft className="w-4 h-4" /> Back
                  </Button>
                  <Button type="submit" disabled={loading} className="gap-2 bg-green-600 hover:bg-green-700">
                    {loading ? "Registering..." : "Complete Registration"}
                  </Button>
                </div>
              </div>
            )}
            
          </form>
        </div>
      </div>
    </div>
  );
}
