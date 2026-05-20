"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Stethoscope, User, Clock, FileText, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const doctorQueue = [
  { id: "APT-002", name: "Maria Clara", type: "Maternal Care", time: "08:30 AM", status: "Next", age: 28 },
  { id: "APT-003", name: "Pedro Penduko", type: "Dental", time: "09:00 AM", status: "Waiting", age: 34 },
  { id: "APT-004", name: "Lolo Jose", type: "General", time: "09:15 AM", status: "Waiting", age: 72 },
];

export default function DoctorDashboard() {
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [notes, setNotes] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleSaveNotes = () => {
    toast.success(`Consultation notes saved for ${selectedPatient?.name}. Status updated to Completed.`);
    setDialogOpen(false);
    setNotes("");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Doctor's Console</h1>
          <p className="text-slate-500">Dr. Sarah Lopez • Today's Consultations</p>
        </div>
        <div className="flex gap-2">
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200" variant="outline">
            Available
          </Badge>
          <Badge className="bg-slate-100 text-slate-800 border-slate-200" variant="outline">
            8 Patients Left
          </Badge>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          {doctorQueue.map((patient) => (
            <Card key={patient.id} className={`transition-all ${patient.status === 'Next' ? 'border-green-300 shadow-md bg-green-50/30' : 'border-slate-200'}`}>
              <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${patient.status === 'Next' ? 'bg-green-100' : 'bg-slate-100'}`}>
                    <User className={`w-6 h-6 ${patient.status === 'Next' ? 'text-green-600' : 'text-slate-500'}`} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-900">{patient.name} <span className="text-sm font-normal text-slate-500">({patient.age} yrs)</span></h3>
                    <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                      <span className="flex items-center gap-1"><Stethoscope className="w-4 h-4" /> {patient.type}</span>
                      <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {patient.time}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {patient.status === "Next" && (
                    <Badge className="bg-green-600 animate-pulse">Now Serving</Badge>
                  )}
                  
                  <Dialog open={dialogOpen && selectedPatient?.id === patient.id} onOpenChange={(open) => {
                    setDialogOpen(open);
                    if(open) setSelectedPatient(patient);
                  }}>
                    <DialogTrigger
                      render={
                        <Button variant={patient.status === "Next" ? "default" : "outline"} className={patient.status === "Next" ? "bg-green-600" : ""}>
                          <FileText className="w-4 h-4 mr-2" /> Open File
                        </Button>
                      }
                    />
                    <DialogContent className="sm:max-w-xl">
                      <DialogHeader>
                        <DialogTitle>Patient File: {patient.name}</DialogTitle>
                        <DialogDescription>
                          Consultation details for {patient.type} at {patient.time}
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-4 py-4">
                        <div className="bg-slate-50 p-3 rounded-md border text-sm text-slate-600 space-y-1">
                          <p><strong>Previous Visit:</strong> Oct 10, 2026 (Follow-up checkup)</p>
                          <p><strong>Allergies:</strong> None reported</p>
                          <p><strong>Vitals:</strong> BP 120/80 • Temp 36.8°C • Wt 65kg</p>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Consultation Notes / Diagnosis</Label>
                          <Textarea 
                            placeholder="Type your medical notes here..." 
                            className="min-h-[150px]"
                            value={notes}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
                          />
                        </div>
                      </div>

                      <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSaveNotes}>
                          <CheckCircle2 className="w-4 h-4 mr-2" /> Mark Completed
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start">Request Lab Test</Button>
              <Button variant="outline" className="w-full justify-start">E-Prescription</Button>
              <Button variant="outline" className="w-full justify-start">Medical Certificate</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
