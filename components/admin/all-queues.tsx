"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ClientCard } from "@/components/client-card";
import { ClientDetailDialog } from "@/components/client-detail-dialog";
import { AttendanceDialog } from "@/components/attendance-dialog";
import { NewClientDialog } from "@/components/new-client-dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, RefreshCw, Trash2, Building2, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Unidade {
  id: string;
  nome: string;
}

export function AllQueues() {
  const [clients, setClients] = useState<any[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [filteredClients, setFilteredClients] = useState<Record<string, any[]>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUnidadeId, setSelectedUnidadeId] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showAttendanceDialog, setShowAttendanceDialog] = useState(false);
  const [showNewClientDialog, setShowNewClientDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("AGENDADO");
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const queues = [
    { status: "AGENDADO", label: "Agendados" },
    { status: "RETORNO_LOJA", label: "Retorno à Loja" },
    { status: "NAO_APTO", label: "Não Aptos" },
    { status: "VENDA", label: "Vendas" },
    { status: "RENEGOCIACAO", label: "Renegociação" },
    { status: "REPESCAGEM", label: "Repescagem" },
  ];

  const fetchUnidades = async () => {
    try {
      const response = await fetch("/api/unidades");
      if (response.ok) {
        const data = await response.json();
        setUnidades(data);
      }
    } catch (error) {
      console.error("Erro ao buscar unidades:", error);
    }
  };

  const fetchClients = async () => {
    try {
      setIsLoading(true);
      const url = selectedUnidadeId && selectedUnidadeId !== "all"
        ? `/api/clients?unidadeId=${selectedUnidadeId}`
        : "/api/clients";
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setClients(data);
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

  const handleClearAllQueues = async () => {
    try {
      setIsClearing(true);
      const response = await fetch("/api/queue/clear", {
        method: "DELETE",
      });
      if (response.ok) {
        toast.success("Todas as filas foram limpas com sucesso");
        fetchClients();
      } else {
        const data = await response.json();
        toast.error(data.error || "Erro ao limpar filas");
      }
    } catch (error: any) {
      console.error("Erro ao limpar filas:", error);
      toast.error("Erro ao limpar filas");
    } finally {
      setIsClearing(false);
      setShowClearDialog(false);
    }
  };

  useEffect(() => {
    fetchUnidades();
  }, []);

  useEffect(() => {
    fetchClients();
  }, [selectedUnidadeId]);

  useEffect(() => {
    const filtered: Record<string, any[]> = {};
    queues.forEach((queue) => {
      const queueClients = clients.filter(
        (client) => client?.currentStatus === queue.status
      );
      if (!searchTerm) {
        filtered[queue.status] = queueClients;
      } else {
        filtered[queue.status] = queueClients.filter(
          (client) =>
            client?.name?.toLowerCase()?.includes(searchTerm.toLowerCase()) ||
            client?.phone?.includes(searchTerm)
        );
      }
    });
    setFilteredClients(filtered);
  }, [searchTerm, clients]);

  const handleClientClick = (client: any) => {
    setSelectedClient(client);
    // Se cliente está em AGENDADO, mostrar dialog de comparecimento (função OPTO)
    if (client?.currentStatus === "AGENDADO") {
      setShowAttendanceDialog(true);
    } else {
      setShowDetailDialog(true);
    }
  };

  const handleDialogClose = () => {
    setShowDetailDialog(false);
    setShowAttendanceDialog(false);
    setSelectedClient(null);
    fetchClients();
  };

  const handleNewClientClose = () => {
    setShowNewClientDialog(false);
    fetchClients();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h3 className="text-xl font-semibold">Todas as Filas</h3>
        <div className="flex gap-2">
          <Button onClick={fetchClients} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
          <Button onClick={() => setShowNewClientDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Cliente
          </Button>
          <Button
            onClick={() => setShowClearDialog(true)}
            variant="destructive"
            disabled={clients.length === 0}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Excluir Fila
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            placeholder="Buscar por nome ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="w-full sm:w-48">
          <Select value={selectedUnidadeId} onValueChange={setSelectedUnidadeId}>
            <SelectTrigger>
              <Building2 className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filtrar por unidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Unidades</SelectItem>
              {unidades.map((unidade) => (
                <SelectItem key={unidade.id} value={unidade.id}>
                  {unidade.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto scrollbar-hide">
          <TabsList className="inline-flex sm:grid sm:w-full sm:grid-cols-6 min-w-max sm:min-w-0">
            {queues.map((queue) => (
              <TabsTrigger key={queue.status} value={queue.status} className="text-xs sm:text-sm">
                <span className="hidden sm:inline">{queue.label}</span>
                <span className="sm:hidden">{queue.label.split(' ')[0]}</span>
                {" "}({filteredClients[queue.status]?.length || 0})
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {queues.map((queue) => (
          <TabsContent key={queue.status} value={queue.status} className="mt-6">
            {isLoading ? (
              <div className="text-center py-12">
                <p className="text-gray-600">Carregando clientes...</p>
              </div>
            ) : (filteredClients[queue.status]?.length || 0) === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600">Nenhum cliente nesta fila</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredClients[queue.status]?.map((client: any) => (
                  <ClientCard
                    key={client?.id}
                    client={client}
                    onClick={() => handleClientClick(client)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {selectedClient && (
        <ClientDetailDialog
          open={showDetailDialog}
          onClose={handleDialogClose}
          client={selectedClient}
          userGroup="ADMIN"
        />
      )}

      {selectedClient && (
        <AttendanceDialog
          open={showAttendanceDialog}
          onClose={handleDialogClose}
          client={selectedClient}
        />
      )}

      <NewClientDialog
        open={showNewClientDialog}
        onClose={handleNewClientClose}
        userGroup="ADMIN"
      />

      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Todas as Filas</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir TODOS os clientes e agendamentos?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClearing}>NÃO</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearAllQueues}
              disabled={isClearing}
              className="bg-red-600 hover:bg-red-700"
            >
              {isClearing ? "Excluindo..." : "SIM, Excluir Tudo"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
