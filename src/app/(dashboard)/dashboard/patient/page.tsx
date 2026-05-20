"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { CalendarClock, MapPin, Stethoscope, HeartPulse, Clock, Activity } from "lucide-react";
import { toast } from "sonner";

export default function PatientDashboard() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [service, setService] = useState("");

  const handleBooking = () => {
    if (!date || !service) {
      toast.error("Please select both a date and a service type.");
      return;
    }
    toast.success(`Appointment for ${service} on ${date.toLocaleDateString()} requested successfully!`);
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-3xl font-bold mb-2">Welcome back, Maria!</h1>
          <p className="text-green-100 max-w-lg">
            Manage your appointments, view your health records, and stay connected with the Agoo RHU medical team.
          </p>
        </div>
        <HeartPulse className="absolute right-10 -bottom-10 w-48 h-48 text-white/10" />
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Main Content Column */}
        <div className="md:col-span-2 space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <CalendarClock className="w-5 h-5 text-green-600" />
                Book New Appointment
              </CardTitle>
              <CardDescription>Select a date and service for your next visit.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <Label className="text-base font-semibold">1. Select Date</Label>
                  <div className="border rounded-md p-2 flex justify-center bg-slate-50/50">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      className="rounded-md"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <Label className="text-base font-semibold">2. Select Service</Label>
                  <Select onValueChange={(val: string | null) => setService(val ?? "")}>
                    <SelectTrigger className="w-full h-12">
                      <SelectValue placeholder="Choose consultation type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="General Consultation">General Consultation</SelectItem>
                      <SelectItem value="Maternal Care">Maternal Care</SelectItem>
                      <SelectItem value="Vaccination">Vaccination / Immunization</SelectItem>
                      <SelectItem value="Dental Services">Dental Services</SelectItem>
                      <SelectItem value="Family Planning">Family Planning</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="bg-green-50 text-green-800 p-4 rounded-lg mt-6 border border-green-100 text-sm">
                    <p className="font-semibold mb-1 flex items-center gap-2">
                      <Activity className="w-4 h-4" /> Important Note:
                    </p>
                    <p>
                      Walk-ins are accommodated but prioritized after scheduled appointments. Please arrive 15 minutes before your scheduled time.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-slate-50 border-t flex justify-end p-4">
              <Button onClick={handleBooking} className="bg-green-600 hover:bg-green-700 px-8">
                Request Appointment
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-6">
          <Card className="border-slate-200 shadow-sm bg-emerald-50 border-emerald-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-emerald-900">Upcoming Appointment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-emerald-50 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-900">Maternal Care Checkup</h3>
                    <p className="text-sm text-slate-500">Dr. Sarah Lopez</p>
                  </div>
                  <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-1 rounded-full">Confirmed</span>
                </div>
                
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <CalendarClock className="w-4 h-4 text-emerald-500" />
                    <span>October 24, 2026</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <Clock className="w-4 h-4 text-emerald-500" />
                    <span>09:30 AM - 10:00 AM</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <MapPin className="w-4 h-4 text-emerald-500" />
                    <span>Room 2, Agoo RHU Main</span>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full text-emerald-700 border-emerald-200 hover:bg-emerald-100">
                Reschedule or Cancel
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
