"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ClientCard } from "@/components/client-card";
import { NewClientDialog } from "@/components/new-client-dialog";
import { ClientDetailDialog } from "@/components/client-detail-dialog";
import { Input } from "@/components/ui/input";
import { Plus, Search, RefreshCw, Building2 } from "lucide-react";
import { toast } from "sonner";

export default function LojaPage() {
  const { data: session } = useSession() || {};
  const [clients, setClients] = useState<any[]>([]);
  const [filteredClients, setFilteredClients] = useState<Record<string, any[]>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showNewClientDialog, setShowNewClientDialog] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("AGENDADO");
  const [unidadeNome, setUnidadeNome] = useState<string>("");

  const userGroup = (session?.user as any)?.userGroup;
  const userUnidadeId = (session?.user as any)?.unidadeId;

  const queues = [
    { status: "AGENDADO", label: "Agendados" },
    { status: "RETORNO_LOJA", label: "Retorno à Loja" },
    { status: "NAO_APTO", label: "Não Aptos" },
    { status: "VENDA", label: "Vendas" },
    { status: "RENEGOCIACAO", label: "Renegociação" },
    { status: "REPESCAGEM", label: "Repescagem" },
  ];

  const fetchClients = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/clients");
      if (response.ok) {
        const data = await response.json();
        setClients(data);
        // Pegar nome da unidade do primeiro cliente
        if (data.length > 0 && data[0]?.unidade?.nome) {
          setUnidadeNome(data[0].unidade.nome);
        }
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

  // Buscar nome da unidade
  const fetchUnidadeNome = async () => {
    if (!userUnidadeId) return;
    try {
      const response = await fetch("/api/unidades");
      if (response.ok) {
        const unidades = await response.json();
        const unidade = unidades.find((u: any) => u.id === userUnidadeId);
        if (unidade) {
          setUnidadeNome(unidade.nome);
        }
      }
    } catch (error) {
      console.error("Erro ao buscar unidade:", error);
    }
  };

  useEffect(() => {
    fetchClients();
    fetchUnidadeNome();
  }, [userUnidadeId]);

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
    setShowDetailDialog(true);
  };

  const handleDialogClose = () => {
    setShowDetailDialog(false);
    setShowNewClientDialog(false);
    setSelectedClient(null);
    fetchClients();
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">Gestão de Clientes - Loja</h2>
          <p className="text-sm sm:text-base text-gray-600 flex items-center gap-1">
            <Building2 className="w-4 h-4" />
            {unidadeNome || "Carregando..."}
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button onClick={fetchClients} variant="outline" size="sm" className="flex-1 sm:flex-none">
            <RefreshCw className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>
          <Button onClick={() => setShowNewClientDialog(true)} size="sm" className="flex-1 sm:flex-none">
            <Plus className="w-4 h-4 sm:mr-2" />
            <span className="sm:hidden">Novo</span>
            <span className="hidden sm:inline">Novo Cliente</span>
          </Button>
        </div>
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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0 scrollbar-hide">
          <TabsList className="inline-flex sm:grid sm:w-full sm:grid-cols-6 min-w-max sm:min-w-0">
            {queues.map((queue) => (
              <TabsTrigger 
                key={queue.status} 
                value={queue.status}
                className="text-xs sm:text-sm whitespace-nowrap"
              >
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

      <NewClientDialog
        open={showNewClientDialog}
        onClose={handleDialogClose}
        userGroup={userGroup}
        userUnidadeId={userUnidadeId}
      />

      {selectedClient && (
        <ClientDetailDialog
          open={showDetailDialog}
          onClose={handleDialogClose}
          client={selectedClient}
          userGroup="LOJA"
        />
      )}
    </div>
  );
}
