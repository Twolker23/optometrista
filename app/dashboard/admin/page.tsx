"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, BarChart3, FolderKanban } from "lucide-react";
import { UserManagement } from "@/components/admin/user-management";
import { Reports } from "@/components/admin/reports";
import { AllQueues } from "@/components/admin/all-queues";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("queues");

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Painel Administrativo</h2>
        <p className="text-sm sm:text-base text-gray-600">Gerencie o sistema completo</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0 scrollbar-hide">
          <TabsList className="inline-flex sm:grid sm:w-full sm:grid-cols-3 min-w-max sm:min-w-0">
            <TabsTrigger value="queues" className="text-xs sm:text-sm">
              <FolderKanban className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Filas</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="text-xs sm:text-sm">
              <Users className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Usuários</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="text-xs sm:text-sm">
              <BarChart3 className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Relatórios</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="queues" className="mt-6">
          <AllQueues />
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          <UserManagement />
        </TabsContent>

        <TabsContent value="reports" className="mt-6">
          <Reports />
        </TabsContent>
      </Tabs>
    </div>
  );
}
