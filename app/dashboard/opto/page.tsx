"use client";

import { useState, useEffect } from "react";
import { ClientCard } from "@/components/client-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, RefreshCw } from "lucide-react";
import { AttendanceDialog } from "@/components/attendance-dialog";
import { toast } from "sonner";

export default function OptoPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [filteredClients, setFilteredClients] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [showAttendanceDialog, setShowAttendanceDialog] = useState(false);

  const fetchClients = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/clients?queueStatus=AGENDADO");
      if (response.ok) {
        const data = await response.json();
        setClients(data);
        setFilteredClients(data);
      } else {
        toast.error("Erro ao carregar clientes");
      }
    } catch (error: any) {
      console.error("Erro ao buscar clientes:", error);
      toast.error("Erro ao carregar clientes");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    if (!searchTerm) {
      setFilteredClients(clients);
    } else {
      const filtered = clients.filter(
        (client) =>
          client?.name?.toLowerCase()?.includes(searchTerm.toLowerCase()) ||
          client?.phone?.includes(searchTerm)
      );
      setFilteredClients(filtered);
    }
  }, [searchTerm, clients]);

  const handleClientClick = (client: any) => {
    setSelectedClient(client);
    setShowAttendanceDialog(true);
  };

  const handleDialogClose = () => {
    setShowAttendanceDialog(false);
    setSelectedClient(null);
    fetchClients();
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">Clientes Agendados</h2>
          <p className="text-sm sm:text-base text-gray-600">Registre o comparecimento e aptidão dos clientes</p>
        </div>
        <Button onClick={fetchClients} variant="outline" size="sm" className="flex-shrink-0">
          <RefreshCw className="w-4 h-4 sm:mr-2" />
          <span className="hidden sm:inline">Atualizar</span>
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
        <Input
          placeholder="Buscar por nome ou telefone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 sm:pl-10 text-sm sm:text-base"
        />
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Carregando clientes...</p>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Nenhum cliente agendado encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client) => (
            <ClientCard
              key={client?.id}
              client={client}
              onClick={() => handleClientClick(client)}
            />
          ))}
        </div>
      )}

      {selectedClient && (
        <AttendanceDialog
          open={showAttendanceDialog}
          onClose={handleDialogClose}
          client={selectedClient}
        />
      )}
    </div>
  );
}
