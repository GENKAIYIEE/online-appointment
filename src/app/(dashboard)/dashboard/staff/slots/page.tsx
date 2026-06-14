import { getActiveServices } from "@/actions/slots-management";
import { SlotManagementClient } from "./SlotManagementClient";

export default async function SlotManagementPage() {
  const services = await getActiveServices();
  return <SlotManagementClient services={services} />;
}
