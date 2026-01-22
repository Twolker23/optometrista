"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { formatAge } from "@/lib/utils-age";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseDateFromDB, formatDateForInput } from "@/lib/date-utils";
import {
  History,
  DollarSign,
  Calendar,
  Image,
  Loader2,
  ArrowLeft,
  Settings,
  Check,
  X,
  AlertCircle,
  RefreshCw,
  Store,
} from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { TimeGridPicker } from "@/components/ui/time-grid-picker";

// Função para formatar telefone no padrão (11) 99999-9999
function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  const limited = digits.slice(0, 11);
  
  if (limited.length <= 2) {
    return limited.length > 0 ? `(${limited}` : "";
  } else if (limited.length <= 7) {
    return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
  } else {
    return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`;
  }
}

function isValidPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length === 11;
}

interface ClientDetailDialogProps {
  open: boolean;
  onClose: () => void;
  client: any;
  userGroup: string;
}

export function ClientDetailDialog({
  open,
  onClose,
  client,
  userGroup,
}: ClientDetailDialogProps) {
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("info");
  const [photoUrl, setPhotoUrl] = useState<string>("");

  // Estados para venda
  const [showSaleForm, setShowSaleForm] = useState(false);
  const [saleOs, setSaleOs] = useState("");
  const [saleValue, setSaleValue] = useState("");
  const [saleJustification, setSaleJustification] = useState("");

  // Estados para reagendamento
  const [showRescheduleForm, setShowRescheduleForm] = useState(false);
  const [optometrists, setOptometrists] = useState<any[]>([]);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [rescheduleOptometrist, setRescheduleOptometrist] = useState("");

  // Estados para edição
  const [editName, setEditName] = useState("");
  const [editBirthDate, setEditBirthDate] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editScheduledDate, setEditScheduledDate] = useState("");
  const [editScheduledTime, setEditScheduledTime] = useState("");
  const [editOptometrist, setEditOptometrist] = useState("");

  // Estados para ações de renegociação
  const [renegAction, setRenegAction] = useState<"RETORNO" | "CONVERSAO" | "DESISTENCIA" | "SEM_RETORNO" | null>(null);
  const [renegDate, setRenegDate] = useState("");
  const [renegTime, setRenegTime] = useState("");
  const [renegOptometrist, setRenegOptometrist] = useState("");
  const [renegOs, setRenegOs] = useState("");
  const [renegValue, setRenegValue] = useState("");
  const [renegJustification, setRenegJustification] = useState("");

  const latestAppointment = client?.appointments?.[0];

  useEffect(() => {
    if (open) {
      fetchHistory();
      if (latestAppointment?.photo?.id) {
        fetchPhotoUrl(latestAppointment.photo.id);
      }
      // Inicializar campos de edição
      if (client) {
        setEditName(client.name || "");
        setEditBirthDate(
          client.birthDate
            ? formatDateForInput(parseDateFromDB(client.birthDate))
            : ""
        );
        setEditPhone(formatPhone(client.phone || ""));
        if (latestAppointment) {
          setEditScheduledDate(
            latestAppointment.scheduledDate
              ? formatDateForInput(parseDateFromDB(latestAppointment.scheduledDate))
              : ""
          );
          setEditScheduledTime(latestAppointment.scheduledTime || "");
          setEditOptometrist(latestAppointment.optometristId || "");
        }
      }
      // Carregar optometristas se a aba de manutenção estiver disponível
      if (canMaintain) {
        fetchOptometrists();
      }
    }
  }, [open, client, latestAppointment]);

  const fetchHistory = async () => {
    try {
      const response = await fetch(`/api/clients/${client?.id}/history`);
      if (response.ok) {
        const data = await response.json();
        setHistory(data);
      }
    } catch (error: any) {
      console.error("Erro ao buscar histórico:", error);
    }
  };

  const fetchPhotoUrl = async (photoId: string) => {
    try {
      const response = await fetch(`/api/photos/${photoId}/url`);
      if (response.ok) {
        const data = await response.json();
        setPhotoUrl(data.url);
      }
    } catch (error: any) {
      console.error("Erro ao buscar URL da foto:", error);
    }
  };

  const fetchOptometrists = async () => {
    try {
      const response = await fetch("/api/optometrists");
      if (response.ok) {
        const data = await response.json();
        setOptometrists(data);
      }
    } catch (error: any) {
      console.error("Erro ao buscar optometristas:", error);
    }
  };

  const handleSale = async (converted: boolean) => {
    if (!latestAppointment) return;

    if (converted && (!saleOs || !saleValue)) {
      toast.error("OS e valor são obrigatórios");
      return;
    }

    if (!converted && !saleJustification) {
      toast.error("Justificativa é obrigatória");
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId: latestAppointment.id,
          os: saleOs,
          value: saleValue,
          converted,
          justification: saleJustification,
        }),
      });

      if (!response.ok) {
        throw new Error("Erro ao processar venda");
      }

      toast.success(converted ? "Venda registrada" : "Cliente movido para repescagem");
      onClose();
    } catch (error: any) {
      console.error(error);
      toast.error("Erro ao processar venda");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReschedule = async () => {
    if (!rescheduleDate || !rescheduleTime || !rescheduleOptometrist) {
      toast.error("Todos os campos são obrigatórios");
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`/api/clients/${client?.id}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduledDate: rescheduleDate,
          scheduledTime: rescheduleTime,
          optometristId: rescheduleOptometrist,
        }),
      });

      if (!response.ok) {
        throw new Error("Erro ao reagendar cliente");
      }

      toast.success("Cliente reagendado com sucesso");
      onClose();
    } catch (error: any) {
      console.error(error);
      toast.error("Erro ao reagendar cliente");
    } finally {
      setIsLoading(false);
    }
  };

  // Função para ações de recuperação da Repescagem
  const handleRecoverAction = async (action: string) => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/repescagem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: client?.id,
          action,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao processar ação");
      }

      const result = await response.json();
      toast.success(result.message);
      onClose();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro ao processar ação");
    } finally {
      setIsLoading(false);
    }
  };

  // Função para reagendar da Repescagem (com badge Recuperado)
  const handleRescheduleFromRepescagem = async () => {
    if (!rescheduleDate || !rescheduleTime || !rescheduleOptometrist) {
      toast.error("Todos os campos são obrigatórios");
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch("/api/repescagem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: client?.id,
          action: "REAGENDAR",
          scheduledDate: rescheduleDate,
          scheduledTime: rescheduleTime,
          optometristId: rescheduleOptometrist,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao reagendar cliente");
      }

      toast.success("Cliente reagendado com sucesso");
      onClose();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro ao reagendar cliente");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMoveToPreviousQueue = async () => {
    const previousStatus = history.find((h) => h.toStatus !== client?.currentStatus)?.fromStatus;
    if (!previousStatus) {
      toast.error("Não há fila anterior");
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch("/api/queue/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: client?.id,
          toStatus: previousStatus,
          action: "Retornado para fila anterior via manutenção",
        }),
      });

      if (!response.ok) {
        throw new Error("Erro ao mover cliente");
      }

      toast.success("Cliente movido para fila anterior");
      onClose();
    } catch (error: any) {
      console.error(error);
      toast.error("Erro ao mover cliente");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMoveToRetornoLoja = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/queue/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: client?.id,
          toStatus: "RETORNO_LOJA",
          action: "Retornado para Retorno à Loja via manutenção",
        }),
      });

      if (!response.ok) {
        throw new Error("Erro ao mover cliente");
      }

      toast.success("Cliente movido para Retorno à Loja");
      onClose();
    } catch (error: any) {
      console.error(error);
      toast.error("Erro ao mover cliente");
    } finally {
      setIsLoading(false);
    }
  };

  // Handlers para ações de renegociação
  const handleRenegotiationAction = async (action: string, data: any) => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/renegotiation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: client?.id,
          action,
          ...data,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao processar ação");
      }

      const result = await response.json();
      toast.success(result.message || "Ação realizada com sucesso");
      
      // Limpar estados
      setRenegAction(null);
      setRenegDate("");
      setRenegTime("");
      setRenegOptometrist("");
      setRenegOs("");
      setRenegValue("");
      setRenegJustification("");
      
      onClose();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro ao processar ação");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRenegotiationRetorno = async () => {
    if (!renegDate || !renegTime || !renegOptometrist) {
      toast.error("Todos os campos são obrigatórios");
      return;
    }

    await handleRenegotiationAction("RETORNO", {
      scheduledDate: renegDate,
      scheduledTime: renegTime,
      optometristId: renegOptometrist,
    });
  };

  const handleRenegotiationConversao = async () => {
    if (!renegOs || !renegValue) {
      toast.error("OS e valor são obrigatórios");
      return;
    }

    await handleRenegotiationAction("CONVERSAO", {
      os: renegOs,
      value: parseFloat(renegValue),
    });
  };

  const handleRenegotiationDesistencia = async () => {
    await handleRenegotiationAction("DESISTENCIA", {
      justification: renegJustification || "Desistência definitiva",
    });
  };

  const handleRenegotiationSemRetorno = async () => {
    await handleRenegotiationAction("SEM_RETORNO", {
      justification: renegJustification || "Cliente não retornou",
    });
  };

  const handleEditClient = async () => {
    if (!editName || !editBirthDate || !editPhone || !editScheduledDate || !editScheduledTime || !editOptometrist) {
      toast.error("Todos os campos são obrigatórios");
      return;
    }

    if (!isValidPhone(editPhone)) {
      toast.error("Telefone deve ter 11 dígitos (DDD + 9 dígitos)");
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`/api/clients/${client?.id}/edit`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          birthDate: editBirthDate,
          phone: editPhone,
          scheduledDate: editScheduledDate,
          scheduledTime: editScheduledTime,
          optometristId: editOptometrist,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao editar cliente");
      }

      toast.success("Cliente editado com sucesso");
      onClose();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro ao editar cliente");
    } finally {
      setIsLoading(false);
    }
  };

  const isAdmin = userGroup === "ADMIN";
  const canProcessSale =
    (isAdmin || userGroup === "LOJA" || userGroup === "SAC") && client?.currentStatus === "RETORNO_LOJA";
  const canReschedule =
    client?.currentStatus === "REPESCAGEM" &&
    (isAdmin || 
      (userGroup === "LOJA" && client?.createdByGroup === "LOJA") ||
      (userGroup === "SAC" && client?.createdByGroup === "SAC"));
  const canMaintain =
    client?.currentStatus === "AGENDADO" &&
    (isAdmin ||
      (userGroup === "LOJA" && client?.createdByGroup === "LOJA") ||
      (userGroup === "SAC" && client?.createdByGroup === "SAC"));
  const canMaintainRenegociation =
    client?.currentStatus === "RENEGOCIACAO" &&
    (isAdmin ||
      (userGroup === "LOJA" && client?.createdByGroup === "LOJA") ||
      (userGroup === "SAC" && client?.createdByGroup === "SAC"));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{client?.name}</DialogTitle>
          <DialogDescription>
            Detalhes completos do cliente e histórico de atendimento
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className={`grid w-full ${
            canMaintain || canProcessSale || canReschedule || canMaintainRenegociation
              ? canMaintain && canProcessSale
                ? "grid-cols-4"
                : canMaintain || canProcessSale || canReschedule || canMaintainRenegociation
                ? "grid-cols-3"
                : "grid-cols-2"
              : "grid-cols-2"
          }`}>
            <TabsTrigger value="info">Informações</TabsTrigger>
            <TabsTrigger value="history">
              <History className="w-4 h-4 mr-2 hidden sm:inline" />
              Histórico
            </TabsTrigger>
            {canProcessSale && <TabsTrigger value="sale">Venda</TabsTrigger>}
            {canReschedule && <TabsTrigger value="reschedule">Ações de Repescagem</TabsTrigger>}
            {canMaintain && <TabsTrigger value="maintain">Editar</TabsTrigger>}
            {canMaintainRenegociation && <TabsTrigger value="renegociation">Manutenção</TabsTrigger>}
          </TabsList>

          <TabsContent value="info" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Dados do Cliente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <span className="font-semibold">Nome:</span> {client?.name}
                </div>
                <div>
                  <span className="font-semibold">Data de Nascimento:</span>{" "}
                  {client?.birthDate
                    ? format(parseDateFromDB(client.birthDate), "dd/MM/yyyy", { locale: ptBR })
                    : "N/A"}
                </div>
                <div>
                  <span className="font-semibold">Idade:</span>{" "}
                  {client?.birthDate ? formatAge(parseDateFromDB(client.birthDate)) : "N/A"}
                </div>
                <div>
                  <span className="font-semibold">Telefone:</span> {client?.phone}
                </div>
                <div>
                  <span className="font-semibold">Cadastrado por:</span>{" "}
                  {client?.createdByGroup} - {client?.createdBy?.name}
                </div>
                <div>
                  <span className="font-semibold">Status Atual:</span>{" "}
                  <Badge>{client?.currentStatus}</Badge>
                </div>
              </CardContent>
            </Card>

            {latestAppointment && (
              <Card>
                <CardHeader>
                  <CardTitle>Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <span className="font-semibold">Data:</span>{" "}
                    {format(parseDateFromDB(latestAppointment.scheduledDate), "dd/MM/yyyy", {
                      locale: ptBR,
                    })}
                  </div>
                  <div>
                    <span className="font-semibold">Horário:</span>{" "}
                    {latestAppointment.scheduledTime}
                  </div>
                  <div>
                    <span className="font-semibold">Optometrista:</span>{" "}
                    {latestAppointment.optometrist?.name}
                  </div>
                  {latestAppointment.attended !== null && (
                    <div>
                      <span className="font-semibold">Compareceu:</span>{" "}
                      {latestAppointment.attended ? "Sim" : "Não"}
                    </div>
                  )}
                  {latestAppointment.isApt !== null && (
                    <div>
                      <span className="font-semibold">Apto:</span>{" "}
                      {latestAppointment.isApt ? "Sim" : "Não"}
                    </div>
                  )}
                  {latestAppointment.aptJustification && (
                    <div>
                      <span className="font-semibold">Justificativa:</span>{" "}
                      {latestAppointment.aptJustification}
                    </div>
                  )}
                  {latestAppointment.sale && (
                    <div className="space-y-1">
                      <div>
                        <span className="font-semibold">OS:</span>{" "}
                        {latestAppointment.sale.os}
                      </div>
                      <div>
                        <span className="font-semibold">Valor:</span> R${" "}
                        {Number(latestAppointment.sale.value).toFixed(2)}
                      </div>
                    </div>
                  )}
                  {photoUrl && (
                    <div className="mt-4">
                      <span className="font-semibold block mb-2">Foto da Receita:</span>
                      <img
                        src={photoUrl}
                        alt="Receita"
                        className="max-w-full h-auto rounded border"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Movimentações</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] pr-4">
                  {history.length === 0 ? (
                    <p className="text-gray-600">Nenhum histórico encontrado</p>
                  ) : (
                    <div className="space-y-4">
                      {history.map((item) => (
                        <div key={item?.id} className="border-l-2 border-blue-500 pl-4 pb-4">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold">{item?.action}</span>
                            <span className="text-xs text-gray-500">
                              {format(new Date(item?.createdAt), "dd/MM/yyyy HH:mm", {
                                locale: ptBR,
                              })}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600">
                            {item?.fromStatus && (
                              <span>
                                {item?.fromStatus} → {item?.toStatus}
                              </span>
                            )}
                            {!item?.fromStatus && <span>{item?.toStatus}</span>}
                          </div>
                          <div className="text-sm text-gray-600">
                            Por: {item?.user?.name} ({item?.user?.userGroup})
                          </div>
                          {item?.justification && (
                            <div className="text-sm text-gray-600 mt-1">
                              Justificativa: {item?.justification}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {canProcessSale && (
            <TabsContent value="sale" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Processar Venda</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-center text-gray-600">Houve conversão para venda?</p>

                  {!showSaleForm ? (
                    <div className="flex gap-4 justify-center">
                      <Button
                        onClick={() => setShowSaleForm(true)}
                        className="flex-1"
                      >
                        <DollarSign className="w-5 h-5 mr-2" />
                        Sim
                      </Button>
                      <Button
                        onClick={() => {
                          setShowSaleForm(false);
                          handleSale(false);
                        }}
                        variant="destructive"
                        className="flex-1"
                        disabled={isLoading}
                      >
                        Não
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="os">Ordem de Serviço (OS) *</Label>
                        <Input
                          id="os"
                          value={saleOs}
                          onChange={(e) => setSaleOs(e.target.value)}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="value">Valor da Venda *</Label>
                        <Input
                          id="value"
                          type="number"
                          step="0.01"
                          value={saleValue}
                          onChange={(e) => setSaleValue(e.target.value)}
                          required
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowSaleForm(false)}
                        >
                          Cancelar
                        </Button>
                        <Button
                          onClick={() => handleSale(true)}
                          disabled={isLoading}
                          className="flex-1"
                        >
                          {isLoading ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : null}
                          Registrar Venda
                        </Button>
                      </div>
                    </div>
                  )}

                  {!showSaleForm && (
                    <div className="space-y-2 mt-4">
                      <Label htmlFor="justification">Justificativa (obrigatória para Não)</Label>
                      <Textarea
                        id="justification"
                        placeholder="Informe o motivo da não conversão..."
                        value={saleJustification}
                        onChange={(e) => setSaleJustification(e.target.value)}
                        rows={4}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {canReschedule && (
            <TabsContent value="reschedule" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Ações de Repescagem</CardTitle>
                  <CardDescription>
                    Escolha uma ação para recuperar este cliente
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!showRescheduleForm ? (
                    <div className="space-y-3">
                      {/* Reagendar Exame */}
                      <Button
                        onClick={() => {
                          setShowRescheduleForm(true);
                          fetchOptometrists();
                        }}
                        className="w-full justify-start h-auto py-3"
                        variant="outline"
                      >
                        <Calendar className="w-5 h-5 mr-3 text-blue-600" />
                        <div className="text-left">
                          <div className="font-semibold">Reagendar Exame</div>
                          <div className="text-xs text-gray-500">Agendar nova consulta com optometrista</div>
                        </div>
                      </Button>

                      {/* Recuperar para Renegociação */}
                      <Button
                        onClick={() => handleRecoverAction("RECUPERAR_RENEGOCIACAO")}
                        disabled={isLoading}
                        className="w-full justify-start h-auto py-3"
                        variant="outline"
                      >
                        <RefreshCw className="w-5 h-5 mr-3 text-yellow-600" />
                        <div className="text-left">
                          <div className="font-semibold">Recuperar para Renegociação</div>
                          <div className="text-xs text-gray-500">Mover para fila de Renegociação</div>
                        </div>
                      </Button>

                      {/* Recuperar para Retorno à Loja */}
                      <Button
                        onClick={() => handleRecoverAction("RECUPERAR_RETORNO_LOJA")}
                        disabled={isLoading}
                        className="w-full justify-start h-auto py-3"
                        variant="outline"
                      >
                        <Store className="w-5 h-5 mr-3 text-green-600" />
                        <div className="text-left">
                          <div className="font-semibold">Recuperar para Retorno à Loja</div>
                          <div className="text-xs text-gray-500">Mover para fila de Retorno à Loja</div>
                        </div>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <ArrowLeft 
                          className="w-4 h-4 cursor-pointer hover:text-blue-600" 
                          onClick={() => setShowRescheduleForm(false)} 
                        />
                        <span className="font-medium">Reagendar Exame</span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Nova Data *</Label>
                          <DatePicker
                            value={rescheduleDate}
                            onChange={(value) => {
                              setRescheduleDate(value);
                              setRescheduleTime("");
                            }}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Novo Horário *</Label>
                          <TimeGridPicker
                            value={rescheduleTime}
                            onChange={setRescheduleTime}
                            selectedDate={rescheduleDate}
                            disabled={!rescheduleDate}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="rescheduleOptometrist">Optometrista *</Label>
                        <Select
                          value={rescheduleOptometrist}
                          onValueChange={setRescheduleOptometrist}
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um optometrista" />
                          </SelectTrigger>
                          <SelectContent>
                            {optometrists.map((opto) => (
                              <SelectItem key={opto?.id} value={opto?.id}>
                                {opto?.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowRescheduleForm(false)}
                        >
                          Cancelar
                        </Button>
                        <Button
                          onClick={handleRescheduleFromRepescagem}
                          disabled={isLoading}
                          className="flex-1"
                        >
                          {isLoading ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : null}
                          Confirmar Reagendamento
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {canMaintain && (
            <TabsContent value="maintain" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Editar Informações do Cliente</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-600 mb-4">
                    Corrija informações que foram preenchidas incorretamente no cadastro.
                  </p>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Nome Completo *</Label>
                    <Input
                      id="edit-name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-birthDate">Data de Nascimento *</Label>
                    <Input
                      id="edit-birthDate"
                      type="date"
                      value={editBirthDate}
                      onChange={(e) => setEditBirthDate(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-phone">Telefone *</Label>
                    <Input
                      id="edit-phone"
                      name="edit-phone-field"
                      value={editPhone}
                      onChange={(e) => setEditPhone(formatPhone(e.target.value))}
                      placeholder="(11) 99999-9999"
                      required
                      disabled={isLoading}
                      autoComplete="off"
                      data-lpignore="true"
                      maxLength={16}
                    />
                    {editPhone && !isValidPhone(editPhone) && (
                      <p className="text-xs text-red-500">Telefone deve ter 11 dígitos (DDD + 9 dígitos)</p>
                    )}
                  </div>

                  <Separator className="my-4" />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Data do Agendamento *</Label>
                      <DatePicker
                        value={editScheduledDate}
                        onChange={(value) => {
                          setEditScheduledDate(value);
                          setEditScheduledTime("");
                        }}
                        disabled={isLoading}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Horário do Agendamento *</Label>
                      <TimeGridPicker
                        value={editScheduledTime}
                        onChange={setEditScheduledTime}
                        selectedDate={editScheduledDate}
                        disabled={isLoading || !editScheduledDate}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-optometrist">Optometrista *</Label>
                    <Select
                      value={editOptometrist}
                      onValueChange={setEditOptometrist}
                      required
                      disabled={isLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um optometrista" />
                      </SelectTrigger>
                      <SelectContent>
                        {optometrists.map((opto) => (
                          <SelectItem key={opto?.id} value={opto?.id}>
                            {opto?.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onClose}
                      disabled={isLoading}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleEditClient}
                      disabled={isLoading}
                      className="flex-1"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Settings className="w-4 h-4 mr-2" />
                          Salvar Alterações
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {canMaintainRenegociation && (
            <TabsContent value="renegociation" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Gerenciar Renegociação</CardTitle>
                  <p className="text-sm text-gray-600">
                    {client?.renegotiationReason === "NAO_COMPARECEU"
                      ? "Cliente não compareceu ao exame agendado"
                      : "Cliente compareceu mas não realizou a compra"}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!renegAction ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {client?.renegotiationReason === "NAO_COMPARECEU" && (
                        <Button
                          onClick={() => {
                            setRenegAction("RETORNO");
                            fetchOptometrists();
                          }}
                          variant="default"
                          className="w-full h-auto py-4 flex flex-col items-center gap-2"
                        >
                          <Calendar className="w-5 h-5" />
                          <span className="font-semibold">Cliente Retornou</span>
                          <span className="text-xs opacity-80">Reagendar atendimento</span>
                        </Button>
                      )}

                      {client?.renegotiationReason === "NAO_COMPROU" && (
                        <Button
                          onClick={() => setRenegAction("CONVERSAO")}
                          variant="default"
                          className="w-full h-auto py-4 flex flex-col items-center gap-2 bg-green-600 hover:bg-green-700"
                        >
                          <Check className="w-5 h-5" />
                          <span className="font-semibold">Converteu Venda</span>
                          <span className="text-xs opacity-80">Registrar venda</span>
                        </Button>
                      )}

                      <Button
                        onClick={() => setRenegAction("DESISTENCIA")}
                        variant="destructive"
                        className="w-full h-auto py-4 flex flex-col items-center gap-2"
                      >
                        <X className="w-5 h-5" />
                        <span className="font-semibold">Desistência</span>
                        <span className="text-xs opacity-80">Cliente desistiu</span>
                      </Button>

                      <Button
                        onClick={() => setRenegAction("SEM_RETORNO")}
                        variant="outline"
                        className="w-full h-auto py-4 flex flex-col items-center gap-2"
                      >
                        <AlertCircle className="w-5 h-5" />
                        <span className="font-semibold">Sem Retorno</span>
                        <span className="text-xs opacity-80">Não houve retorno</span>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Formulário de Retorno (Reagendamento) */}
                      {renegAction === "RETORNO" && (
                        <>
                          <div className="flex items-center gap-2 mb-4">
                            <ArrowLeft className="w-5 h-5" />
                            <h3 className="font-semibold">Reagendar Cliente</h3>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Data</Label>
                              <DatePicker
                                value={renegDate}
                                onChange={(value) => {
                                  setRenegDate(value);
                                  setRenegTime("");
                                }}
                                disabled={isLoading}
                              />
                            </div>

                            <div className="space-y-2">
                              <Label>Horário</Label>
                              <TimeGridPicker
                                value={renegTime}
                                onChange={setRenegTime}
                                selectedDate={renegDate}
                                disabled={isLoading || !renegDate}
                              />
                            </div>
                          </div>

                          <div>
                            <Label htmlFor="renegOptometrist">Optometrista</Label>
                            <Select
                              value={renegOptometrist}
                              onValueChange={setRenegOptometrist}
                              disabled={isLoading}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o optometrista" />
                              </SelectTrigger>
                              <SelectContent>
                                {optometrists.map((opto) => (
                                  <SelectItem key={opto.id} value={opto.id}>
                                    {opto.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="flex gap-2 pt-4">
                            <Button onClick={() => setRenegAction(null)} variant="outline" className="flex-1">
                              Cancelar
                            </Button>
                            <Button onClick={handleRenegotiationRetorno} disabled={isLoading} className="flex-1">
                              {isLoading ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Salvando...
                                </>
                              ) : (
                                "Confirmar Reagendamento"
                              )}
                            </Button>
                          </div>
                        </>
                      )}

                      {/* Formulário de Conversão (Venda) */}
                      {renegAction === "CONVERSAO" && (
                        <>
                          <div className="flex items-center gap-2 mb-4">
                            <Check className="w-5 h-5 text-green-600" />
                            <h3 className="font-semibold">Registrar Venda</h3>
                          </div>

                          <div>
                            <Label htmlFor="renegOs">Número da OS</Label>
                            <Input
                              id="renegOs"
                              value={renegOs}
                              onChange={(e) => setRenegOs(e.target.value)}
                              placeholder="Ex: OS-12345"
                              disabled={isLoading}
                            />
                          </div>

                          <div>
                            <Label htmlFor="renegValue">Valor da Venda (R$)</Label>
                            <Input
                              id="renegValue"
                              type="number"
                              step="0.01"
                              value={renegValue}
                              onChange={(e) => setRenegValue(e.target.value)}
                              placeholder="Ex: 450.00"
                              disabled={isLoading}
                            />
                          </div>

                          <div className="flex gap-2 pt-4">
                            <Button onClick={() => setRenegAction(null)} variant="outline" className="flex-1">
                              Cancelar
                            </Button>
                            <Button
                              onClick={handleRenegotiationConversao}
                              disabled={isLoading}
                              className="flex-1 bg-green-600 hover:bg-green-700"
                            >
                              {isLoading ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Salvando...
                                </>
                              ) : (
                                "Confirmar Venda"
                              )}
                            </Button>
                          </div>
                        </>
                      )}

                      {/* Formulário de Desistência */}
                      {renegAction === "DESISTENCIA" && (
                        <>
                          <div className="flex items-center gap-2 mb-4">
                            <X className="w-5 h-5 text-red-600" />
                            <h3 className="font-semibold">Registrar Desistência</h3>
                          </div>

                          <p className="text-sm text-gray-600 mb-4">
                            Cliente desistiu definitivamente. Será movido para a fila de Repescagem.
                          </p>

                          <div>
                            <Label htmlFor="renegJustification">Justificativa (opcional)</Label>
                            <Textarea
                              id="renegJustification"
                              value={renegJustification}
                              onChange={(e) => setRenegJustification(e.target.value)}
                              placeholder="Motivo da desistência..."
                              rows={3}
                              disabled={isLoading}
                            />
                          </div>

                          <div className="flex gap-2 pt-4">
                            <Button onClick={() => setRenegAction(null)} variant="outline" className="flex-1">
                              Cancelar
                            </Button>
                            <Button
                              onClick={handleRenegotiationDesistencia}
                              disabled={isLoading}
                              variant="destructive"
                              className="flex-1"
                            >
                              {isLoading ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Processando...
                                </>
                              ) : (
                                "Confirmar Desistência"
                              )}
                            </Button>
                          </div>
                        </>
                      )}

                      {/* Formulário de Sem Retorno */}
                      {renegAction === "SEM_RETORNO" && (
                        <>
                          <div className="flex items-center gap-2 mb-4">
                            <AlertCircle className="w-5 h-5 text-orange-600" />
                            <h3 className="font-semibold">Registrar Sem Retorno</h3>
                          </div>

                          <p className="text-sm text-gray-600 mb-4">
                            Cliente não retornou após tentativas de contato. Será movido para a fila de Repescagem.
                          </p>

                          <div>
                            <Label htmlFor="renegJustificationSemRetorno">Observações (opcional)</Label>
                            <Textarea
                              id="renegJustificationSemRetorno"
                              value={renegJustification}
                              onChange={(e) => setRenegJustification(e.target.value)}
                              placeholder="Tentativas de contato realizadas..."
                              rows={3}
                              disabled={isLoading}
                            />
                          </div>

                          <div className="flex gap-2 pt-4">
                            <Button onClick={() => setRenegAction(null)} variant="outline" className="flex-1">
                              Cancelar
                            </Button>
                            <Button onClick={handleRenegotiationSemRetorno} disabled={isLoading} className="flex-1">
                              {isLoading ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Processando...
                                </>
                              ) : (
                                "Confirmar Sem Retorno"
                              )}
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
