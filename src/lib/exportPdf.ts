import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { AdminAppointmentRow } from "@/actions/appointments";
import { formatDatePHT } from "@/lib/utils";

// Helper to load image as base64
async function getBase64ImageFromUrl(imageUrl: string): Promise<string> {
  const res = await fetch(imageUrl);
  const blob = await res.blob();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener(
      "load",
      function () {
        resolve(reader.result as string);
      },
      false
    );
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(blob);
  });
}

export async function exportAppointmentsToPDF(appointments: AdminAppointmentRow[], tabName: string) {
  const doc = new jsPDF();
  
  try {
    // Attempt to load the logo
    const logoData = await getBase64ImageFromUrl("/rhu1.png");
    doc.addImage(logoData, "PNG", 14, 10, 20, 20);
  } catch (err) {
    console.warn("Could not load logo for PDF", err);
  }
  
  // Header Title
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(22, 101, 52); // green-800
  doc.text("Agoo Rural Health Unit", 40, 18);

  // Subtitle
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text("Online Appointment System", 40, 24);

  // Report Title
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(`${tabName} Appointments Report`, 14, 40);

  // Generated Date
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  const generatedAt = new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());
  doc.text(`Generated on: ${generatedAt}`, 14, 46);

  // Table Data Preparation
  const tableColumn = ["Patient Name", "Service", "Date", "Time", "Doctor", "Status"];
  const tableRows = appointments.map(app => [
    app.patientName,
    app.service,
    formatDatePHT(app.date, "MMM d, yyyy"),
    app.time,
    app.doctor ?? "Unassigned",
    app.status,
  ]);

  // Generate Table
  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 52,
    theme: "grid",
    styles: {
      fontSize: 9,
      font: "helvetica",
      cellPadding: 4,
    },
    headStyles: {
      fillColor: [22, 163, 74], // green-600
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // slate-50
    },
    didDrawPage: (data) => {
      // Footer with page numbers
      const str = `Page ${(doc as any).internal.getNumberOfPages()}`;
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // slate-400
      const pageSize = doc.internal.pageSize;
      const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
      doc.text(str, data.settings.margin.left, pageHeight - 10);
    },
  });

  // Save the PDF
  const filename = `RHU_Appointments_${tabName}_${new Date().toISOString().split("T")[0]}.pdf`;
  doc.save(filename);
}

export type PatientRecordRow = {
  patientName: string;
  age: number | null;
  sex: string;
  type: string;
  service: string;
  doctor: string;
  date: string | null;
  timeSlot: string;
};

export async function exportPatientRecordsToPDF(records: PatientRecordRow[]) {
  const doc = new jsPDF();
  
  try {
    // Attempt to load the logo
    const logoData = await getBase64ImageFromUrl("/rhu1.png");
    doc.addImage(logoData, "PNG", 14, 10, 20, 20);
  } catch (err) {
    console.warn("Could not load logo for PDF", err);
  }
  
  // Header Title
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(22, 101, 52); // green-800
  doc.text("Agoo Rural Health Unit", 40, 18);

  // Subtitle
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text("Online Appointment System", 40, 24);

  // Report Title
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text("Patient Records Report", 14, 40);

  // Generated Date
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  const generatedAt = new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());
  doc.text(`Generated on: ${generatedAt}`, 14, 46);

  // Table Data Preparation
  const tableColumn = ["Patient Name", "Age", "Sex", "Type", "Service", "Doctor", "Date", "Time"];
  const tableRows = records.map(r => [
    r.patientName,
    r.age !== null ? String(r.age) : "—",
    r.sex,
    r.type === "ONLINE" ? "Online" : "Walk-in",
    r.service,
    r.doctor || "—",
    r.date ? formatDatePHT(r.date, "MMM d, yyyy") : "—",
    r.timeSlot,
  ]);

  // Generate Table
  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 52,
    theme: "grid",
    styles: {
      fontSize: 9,
      font: "helvetica",
      cellPadding: 4,
    },
    headStyles: {
      fillColor: [22, 163, 74], // green-600
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // slate-50
    },
    didDrawPage: (data) => {
      // Footer with page numbers
      const str = `Page ${(doc as any).internal.getNumberOfPages()}`;
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // slate-400
      const pageSize = doc.internal.pageSize;
      const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
      doc.text(str, data.settings.margin.left, pageHeight - 10);
    },
  });

  // Save the PDF
  const filename = `RHU_Patient_Records_${new Date().toISOString().split("T")[0]}.pdf`;
  doc.save(filename);
}

export type MedicineRecordRow = {
  patient: { name: string } | null;
  walkInName: string | null;
  medicineName: string;
  quantity: number;
  date: Date;
  reason: string | null;
  staff: { name: string };
};

export async function exportMedicineRecordsToPDF(records: MedicineRecordRow[]) {
  const doc = new jsPDF();
  
  try {
    const logoData = await getBase64ImageFromUrl("/rhu1.png");
    doc.addImage(logoData, "PNG", 14, 10, 20, 20);
  } catch (err) {
    console.warn("Could not load logo for PDF", err);
  }
  
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(22, 101, 52); 
  doc.text("Agoo Rural Health Unit", 40, 18);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139); 
  doc.text("Online Appointment System", 40, 24);

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("Medicine Handout Records", 14, 40);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  const generatedAt = new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());
  doc.text(`Generated on: ${generatedAt}`, 14, 46);

  const tableColumn = ["Date", "Patient Name", "Medicine", "Qty", "Reason", "Staff"];
  const tableRows = records.map(r => [
    new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric" }).format(new Date(r.date)),
    r.patient ? r.patient.name : (r.walkInName || "Unknown"),
    r.medicineName,
    r.quantity.toString(),
    r.reason || "—",
    r.staff.name,
  ]);

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 52,
    theme: "grid",
    styles: { fontSize: 9, font: "helvetica", cellPadding: 4 },
    headStyles: { fillColor: [22, 163, 74], textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    didDrawPage: (data) => {
      const str = `Page ${(doc as any).internal.getNumberOfPages()}`;
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      const pageSize = doc.internal.pageSize;
      const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
      doc.text(str, data.settings.margin.left, pageHeight - 10);
    },
  });

  const filename = `RHU_Medicine_Records_${new Date().toISOString().split("T")[0]}.pdf`;
  doc.save(filename);
}

export type ServiceAppointmentRow = {
  patientName: string;
  age: number | string | null;
  sex: string;
  service: string;
  doctor: string;
  time: string;
  status: string;
  type: string;
};

export async function exportServiceAppointmentsToPDF(appointments: ServiceAppointmentRow[], dateString: string, serviceName: string) {
  const doc = new jsPDF();
  
  try {
    const logoData = await getBase64ImageFromUrl("/rhu1.png");
    doc.addImage(logoData, "PNG", 14, 10, 20, 20);
  } catch (err) {
    console.warn("Could not load logo for PDF", err);
  }
  
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(22, 101, 52); 
  doc.text("Agoo Rural Health Unit", 40, 18);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139); 
  doc.text("Online Appointment System", 40, 24);

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(`Appointments - ${serviceName}`, 14, 40);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  const formattedDate = dateString ? formatDatePHT(dateString, "MMMM d, yyyy") : "All Dates";
  doc.text(`Schedule Date: ${formattedDate}`, 14, 46);

  const tableColumn = ["Time", "Patient Name", "Age/Sex", "Type", "Service", "Doctor", "Status"];
  const tableRows = appointments.map(app => [
    app.time,
    app.patientName,
    `${app.age || "—"}/${app.sex ? app.sex.charAt(0) : "—"}`,
    app.type === "ONLINE" ? "Online" : "Walk-in",
    app.service,
    app.doctor || "—",
    app.status,
  ]);

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 52,
    theme: "grid",
    styles: { fontSize: 9, font: "helvetica", cellPadding: 4 },
    headStyles: { fillColor: [22, 163, 74], textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    didDrawPage: (data) => {
      const str = `Page ${(doc as any).internal.getNumberOfPages()}`;
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      const pageSize = doc.internal.pageSize;
      const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
      doc.text(str, data.settings.margin.left, pageHeight - 10);
    },
  });

  const filename = `RHU_Appointments_${dateString || "all"}.pdf`;
  doc.save(filename);
}
