import { UserManagement } from "@/components/admin/UserManagement";
import { Badge } from "@/components/ui/badge";

export default function UsersPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 tracking-tight">
            User Management
          </h1>
          <p className="text-slate-500 mt-1">
            Manage staff and doctor accounts within the portal.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="bg-white px-3 py-1 text-slate-600 border-slate-200">
            System Status:{" "}
            <span className="text-emerald-600 font-medium ml-1 flex items-center">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
              Online
            </span>
          </Badge>
        </div>
      </div>
      
      <UserManagement />
    </div>
  );
}
