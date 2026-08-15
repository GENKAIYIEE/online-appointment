import { UserManagement } from "@/components/admin/UserManagement";
import { AdminManagement } from "@/components/admin/AdminManagement";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, ShieldCheck } from "lucide-react";

export default function UsersPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 tracking-tight">
            User Management
          </h1>
          <p className="text-slate-500 mt-1">
            Manage staff, doctor, and administrator accounts within the portal.
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
      
      <Tabs defaultValue="clinical" className="space-y-6">
        <TabsList className="bg-slate-100/80 p-1">
          <TabsTrigger 
            value="clinical" 
            className="data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm px-6 py-2"
          >
            <Users className="w-4 h-4 mr-2" />
            Clinical Staff
          </TabsTrigger>
          <TabsTrigger 
            value="administrators" 
            className="data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm px-6 py-2"
          >
            <ShieldCheck className="w-4 h-4 mr-2" />
            System Administrators
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clinical" className="mt-0 outline-none">
          <UserManagement />
        </TabsContent>
        
        <TabsContent value="administrators" className="mt-0 outline-none">
          <AdminManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}
