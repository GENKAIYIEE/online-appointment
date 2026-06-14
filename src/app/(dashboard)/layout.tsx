import { ReactNode } from "react";
import { Sidebar } from "@/components/shared/Sidebar";
import { Navbar } from "@/components/shared/Navbar";
import { verifySession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await verifySession();

  if (!session) {
    redirect("/login");
  }

  const role = session.role ? session.role.toLowerCase() as any : "user";
  const userName = session.name as string;

  return (
    <div className="flex h-screen w-full bg-[var(--color-bg-main)] overflow-hidden">
      <Sidebar role={role} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Navbar role={role} userName={userName} />
        <main className="flex-1 overflow-y-auto p-[32px]">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
