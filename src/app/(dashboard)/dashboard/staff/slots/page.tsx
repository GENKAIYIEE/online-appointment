import { getServices } from "@/actions/slots-management";
import { SlotManagementClient } from "./SlotManagementClient";

export default async function SlotManagementPage() {
  const services = await getServices();
  return <SlotManagementClient services={services} />;
}
