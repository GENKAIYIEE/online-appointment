import { Metadata } from "next";
import { getMedicineRecords } from "@/actions/medicine";
import { MedicineRecordsClient } from "./MedicineRecordsClient";

export const metadata: Metadata = {
  title: "Medicine Records | RHU Portal",
};

export const dynamic = "force-dynamic";

export default async function MedicineRecordsPage() {
  const response = await getMedicineRecords();
  const records = response.success ? response.records : [];

  return (
    <MedicineRecordsClient initialRecords={records || []} />
  );
}
