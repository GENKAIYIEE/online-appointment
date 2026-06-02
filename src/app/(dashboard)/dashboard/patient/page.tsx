import { redirect } from "next/navigation";
import Link from "next/link";
import { formatDatePHT, getTodayPHT } from "@/lib/utils";
import { verifySession } from "@/lib/session";
import { 
  HeartPulse, 
  CalendarClock, 
  MapPin, 
  Clock, 
  Stethoscope, 
  CalendarPlus,
  CalendarDays,
  Bell,
  ArrowRight,
  AlertCircle,
  ClipboardList
} from "lucide-react";
import { prisma } from "@/lib/prisma";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Helper function to render status badges
function TableStatusBadge({ status }: { status: string }) {
  if (status === "CONFIRMED") {
    return (
      <div className="flex items-center gap-1.5 text-[#D97706] font-medium text-[12px]">
        <Clock className="w-3.5 h-3.5" />
        Please arrive 15 mins early
      </div>
    );
  }
  return <Badge variant="outline">{status}</Badge>;
}

function CardStatusBadge({ status }: { status: string }) {
  if (status === "CONFIRMED") {
    return (
      <Badge className="bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A] hover:bg-[#FFFBEB] flex items-center gap-1">
        <Clock className="w-3 h-3" />
        Arrive 15 mins early
      </Badge>
    );
  }
  return <Badge variant="outline">{status}</Badge>;
}

export default async function PatientDashboard() {
  const session = await verifySession();

  // Session validation
  if (!session || session.role !== "PATIENT") {
    redirect("/login");
  }

  const patientId = session.userId;

  // Initialize data variables
  let patientName = session.name || "Patient";
  let upcomingAppointments: any[] = [];
  let dbError = false;
  let requireItr = false;

  try {
    // 1. Fetch Patient Info
    let patient = await prisma.user.findUnique({
      where: { id: patientId },
      include: { itr: true }
    });

    if (patient) {
      patientName = patient.name;
      if (!patient.itr?.isCompleted) {
        requireItr = true;
      }
    } else {
      redirect("/login");
    }

    // 2. Fetch Upcoming Appointments
    // Use Manila timezone (UTC+8) for correct "today" boundary
    const today = getTodayPHT();

    upcomingAppointments = await prisma.appointment.findMany({
      where: {
        user_id: patientId,
        status: "CONFIRMED",
        schedule: {
          date: {
            gte: today,
          }
        }
      },
      include: {
        schedule: true
      },
      orderBy: {
        schedule: {
          date: "asc"
        }
      },
      take: 3
    });

  } catch (error) {
    console.error("Database connection failed:", error);
    dbError = true;
  }

  // 3. Fetch Recent Completed Appointment with Notes (even if there was a dbError, we just skip it, but let's do it inside a safe try/catch or assume dbError caught it)
  let recentCompleted: any = null;
  if (!dbError) {
    try {
      recentCompleted = await prisma.appointment.findFirst({
        where: {
          user_id: patientId,
          status: "COMPLETED",
          OR: [
            { consultationDiagnosis: { not: null } },
            { consultationNotes: { not: null } }
          ]
        },
        include: { schedule: true },
        orderBy: { schedule: { date: "desc" } }
      });
    } catch (e) {
      console.error("Failed to fetch recent notes", e);
    }
  }

  if (requireItr) {
    redirect("/dashboard/patient/itr");
  }

  const nextAppointment = upcomingAppointments.length > 0 ? upcomingAppointments[0] : null;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-3xl font-bold mb-2 text-white">Welcome back, {patientName}!</h1>
          <p className="text-green-100 max-w-lg">
            Manage your appointments, view your health records, and stay connected with the Agoo RHU medical team.
          </p>
        </div>
        <HeartPulse className="absolute right-10 -bottom-10 w-48 h-48 text-white/10" />
      </div>

      {dbError && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
          <div>
            <h3 className="font-semibold">Unable to load your appointments</h3>
            <p className="text-sm">We are having trouble connecting to the database. Please try refreshing the page later.</p>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        {/* Main Content Column (Cards 1 & 2) */}
        <div className="md:col-span-2 space-y-6">
          
          {/* CARD 1: Upcoming Appointments */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="space-y-1">
                <CardTitle className="text-xl flex items-center gap-2">
                  <CalendarClock className="w-5 h-5 text-emerald-600" />
                  Upcoming Appointments
                </CardTitle>
                <CardDescription>Your scheduled visits for the coming days.</CardDescription>
              </div>
              {!dbError && upcomingAppointments.length > 0 && (
                <Link href="/dashboard/patient/appointments">
                  <Button variant="ghost" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 text-sm h-8">
                    View All <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              )}
            </CardHeader>
            <CardContent>
              {!dbError && upcomingAppointments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-3">
                    <CalendarPlus className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-900 mb-1">No upcoming appointments</h3>
                  <p className="text-sm text-slate-500 max-w-sm mb-4">
                    You don't have any pending or confirmed appointments at the moment.
                  </p>
                  <Link href="/dashboard/patient/book">
                    <Button className="bg-emerald-600 hover:bg-emerald-700 shadow-sm">
                      Book Now
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 border-b border-slate-100">
                        <TableHead className="font-semibold text-slate-700">Service</TableHead>
                        <TableHead className="font-semibold text-slate-700">Booked On</TableHead>
                        <TableHead className="font-semibold text-slate-700">Schedule</TableHead>
                        <TableHead className="font-semibold text-slate-700">Time</TableHead>
                        <TableHead className="font-semibold text-slate-700">Reminder</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {upcomingAppointments.map((appt) => (
                        <TableRow key={appt.id}>
                          <TableCell className="font-medium">{appt.service || "General Checkup"}</TableCell>
                          <TableCell>{formatDatePHT(appt.bookedAt ?? appt.created_at, "MMM d, yyyy")}</TableCell>
                          <TableCell>{formatDatePHT(appt.schedule.date, "MMM d, yyyy")}</TableCell>
                          <TableCell>{appt.time_slot || "TBD"}</TableCell>
                          <TableCell>
                            <TableStatusBadge status={appt.status} />
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

        {/* Right Sidebar Column */}
        <div className="space-y-6">
          <Card className="border-emerald-100 shadow-sm bg-emerald-50/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-emerald-900">Next Appointment</CardTitle>
            </CardHeader>
            <CardContent>
              {!dbError && nextAppointment ? (
                <div className="bg-white rounded-xl p-5 shadow-sm border border-emerald-100 space-y-5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-emerald-100 to-transparent opacity-50 rounded-bl-3xl" />
                  
                  <div className="flex flex-col gap-2 relative z-10">
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-bold text-slate-900 leading-tight">
                        {nextAppointment.service || "General Checkup"}
                      </h3>
                      <CardStatusBadge status={nextAppointment.status} />
                    </div>
                    <p className="text-sm text-slate-500 font-medium flex items-center gap-1.5">
                      <Stethoscope className="w-3.5 h-3.5" />
                      {nextAppointment.doctor_name || "Assigned Doctor"}
                    </p>
                  </div>
                  
                  <div className="space-y-3 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-3 text-sm font-medium text-slate-700">
                      <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                        <CalendarClock className="w-4 h-4 text-emerald-600" />
                      </div>
                      <span>Booked: {formatDatePHT(nextAppointment.bookedAt ?? nextAppointment.created_at, "MMMM d, yyyy")}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm font-medium text-slate-700">
                      <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                        <CalendarClock className="w-4 h-4 text-emerald-600" />
                      </div>
                      <span>Schedule: {formatDatePHT(nextAppointment.schedule.date, "MMMM d, yyyy")}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm font-medium text-slate-700">
                      <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                        <Clock className="w-4 h-4 text-emerald-600" />
                      </div>
                      <span>{nextAppointment.time_slot || "Time TBD"}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm font-medium text-slate-700">
                      <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                        <MapPin className="w-4 h-4 text-emerald-600" />
                      </div>
                      <span>{nextAppointment.room || "Room Assignment Pending"}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 text-center space-y-3">
                  <p className="text-slate-500 text-sm">You have no upcoming visits.</p>
                  <Link href="/dashboard/patient/book" className="block">
                    <Button variant="outline" className="w-full text-emerald-700 border-emerald-200 hover:bg-emerald-50">
                      Schedule a Visit
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
            
            {!dbError && nextAppointment && (
              <CardFooter>
                <Link href="/dashboard/patient/appointments" className="w-full">
                  <Button variant="outline" className="w-full text-emerald-700 border-emerald-200 hover:bg-emerald-100">
                    Reschedule or Cancel
                  </Button>
                </Link>
              </CardFooter>
            )}
          </Card>

          {/* CARD 3: Recent Consultation Notes */}
          {!dbError && recentCompleted && (
            <Card className="border-emerald-100 shadow-sm bg-white overflow-hidden">
              <div className="border-b border-emerald-50 bg-emerald-50/30 p-4 pb-3">
                <h3 className="font-semibold text-emerald-900 flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-emerald-600" />
                  Recent Consultation Notes
                </h3>
              </div>
              <CardContent className="p-5 space-y-4">
                <p className="text-sm font-medium text-slate-700">
                  {formatDatePHT(recentCompleted.schedule.date, "MMMM d, yyyy")} • Dr. {recentCompleted.doctor_name || "Doctor"}
                </p>
                <div className="space-y-3">
                  {recentCompleted.consultationDiagnosis && (
                    <div>
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Diagnosis</h4>
                      <p className="text-sm text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        {recentCompleted.consultationDiagnosis}
                      </p>
                    </div>
                  )}
                  {recentCompleted.consultationNotes && (
                    <div>
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Notes</h4>
                      <p className="text-sm text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-100 line-clamp-3">
                        {recentCompleted.consultationNotes}
                      </p>
                    </div>
                  )}
                </div>
                <Link href="/dashboard/patient/appointments" className="block mt-2">
                  <Button variant="outline" className="w-full text-emerald-700 border-emerald-200 hover:bg-emerald-50 text-xs">
                    View Full Details
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
