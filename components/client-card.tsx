"use client";

import { formatAge } from "@/lib/utils-age";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Phone, User, Stethoscope, AlertCircle, CheckCircle, XCircle, PhoneMissed, RotateCcw, Building2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseDateFromDB } from "@/lib/date-utils";

interface ClientCardProps {
  client: any;
  onClick?: () => void;
}

export function ClientCard({ client, onClick }: ClientCardProps) {
  const latestAppointment = client?.appointments?.[0];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "AGENDADO":
        return "bg-blue-100 text-blue-800";
      case "RETORNO_LOJA":
        return "bg-green-100 text-green-800";
      case "NAO_APTO":
        return "bg-red-100 text-red-800";
      case "VENDA":
        return "bg-purple-100 text-purple-800";
      case "RENEGOCIACAO":
        return "bg-yellow-100 text-yellow-800";
      case "REPESCAGEM":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "AGENDADO":
        return "Agendado";
      case "RETORNO_LOJA":
        return "Retorno à Loja";
      case "NAO_APTO":
        return "Não Apto";
      case "VENDA":
        return "Venda Efetivada";
      case "RENEGOCIACAO":
        return "Renegociação";
      case "REPESCAGEM":
        return "Repescagem";
      default:
        return status;
    }
  };

  // Determina o badge de status para exibição abaixo do card
  const renderStatusBadge = () => {
    // Cliente RECUPERADO da Repescagem (azul) - mostrar junto com o status atual
    if (client?.recovered) {
      return (
        <div className="flex items-center gap-1.5 mt-2 pt-2 border-t">
          <RotateCcw className="w-4 h-4 text-blue-600" />
          <Badge className="bg-blue-100 text-blue-800 border-blue-300">
            Recuperado
          </Badge>
        </div>
      );
    }

    // VENDA - Sucesso na Negociação (verde)
    if (client?.currentStatus === "VENDA") {
      return (
        <div className="flex items-center gap-1.5 mt-2 pt-2 border-t">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <Badge className="bg-green-100 text-green-800 border-green-300">
            Sucesso na Negociação
          </Badge>
        </div>
      );
    }

    // RENEGOCIACAO - badges específicos
    if (client?.currentStatus === "RENEGOCIACAO") {
      if (client?.renegotiationReason === "NAO_COMPARECEU") {
        return (
          <div className="flex items-center gap-1.5 mt-2 pt-2 border-t">
            <PhoneMissed className="w-4 h-4 text-yellow-600" />
            <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
              Não Compareceu à Consulta
            </Badge>
          </div>
        );
      }
      if (client?.renegotiationReason === "NAO_COMPROU") {
        return (
          <div className="flex items-center gap-1.5 mt-2 pt-2 border-t">
            <XCircle className="w-4 h-4 text-yellow-600" />
            <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
              Não Houve Negociação
            </Badge>
          </div>
        );
      }
    }

    // REPESCAGEM - Encerrado sem Venda (vermelho) ou Sem Sucesso de Contato (laranja)
    if (client?.currentStatus === "REPESCAGEM") {
      if (client?.renegotiationReason === "NAO_COMPROU") {
        return (
          <div className="flex items-center gap-1.5 mt-2 pt-2 border-t">
            <XCircle className="w-4 h-4 text-red-600" />
            <Badge className="bg-red-100 text-red-800 border-red-300">
              Encerrado sem Venda
            </Badge>
          </div>
        );
      }
      if (client?.renegotiationReason === "NAO_COMPARECEU") {
        return (
          <div className="flex items-center gap-1.5 mt-2 pt-2 border-t">
            <PhoneMissed className="w-4 h-4 text-orange-600" />
            <Badge className="bg-orange-100 text-orange-800 border-orange-300">
              Sem Sucesso de Contato
            </Badge>
          </div>
        );
      }
      // Casos antigos sem renegotiationReason
      if (!client?.renegotiationReason && latestAppointment?.attended === false) {
        return (
          <div className="flex items-center gap-1.5 mt-2 pt-2 border-t">
            <PhoneMissed className="w-4 h-4 text-gray-500" />
            <Badge className="bg-gray-100 text-gray-700 border-gray-300">
              Não Compareceu
            </Badge>
          </div>
        );
      }
    }

    return null;
  };

  return (
    <Card
      className="hover:shadow-md transition-shadow cursor-pointer active:shadow-lg"
      onClick={onClick}
    >
      <CardContent className="p-3 sm:p-4 space-y-2 sm:space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center space-x-2 min-w-0 flex-1">
            <User className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <h3 className="font-semibold text-base sm:text-lg truncate">{client?.name}</h3>
          </div>
          <Badge className={`${getStatusColor(client?.currentStatus)} flex-shrink-0 text-xs`}>
            {getStatusLabel(client?.currentStatus)}
          </Badge>
        </div>

        <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-gray-600">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4" />
            <span>
              {client?.birthDate
                ? `${format(parseDateFromDB(client.birthDate), "dd/MM/yyyy", { locale: ptBR })} (${formatAge(parseDateFromDB(client.birthDate))})`
                : "N/A"}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <Phone className="w-4 h-4" />
            <span>{client?.phone || "N/A"}</span>
          </div>

          {latestAppointment && (
            <>
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>
                  {format(parseDateFromDB(latestAppointment.scheduledDate), "dd/MM/yyyy", { locale: ptBR })} às {latestAppointment.scheduledTime}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <Stethoscope className="w-4 h-4" />
                <span>{latestAppointment.optometrist?.name || "N/A"}</span>
              </div>
            </>
          )}

          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4" />
            <span className="text-xs">Cadastrado por: {client?.createdByGroup}</span>
          </div>

          {client?.unidade?.nome && (
            <div className="flex items-center space-x-2">
              <Building2 className="w-4 h-4" />
              <span className="text-xs font-medium">{client.unidade.nome}</span>
            </div>
          )}
        </div>

        {/* Badge de status fixo abaixo do card */}
        {renderStatusBadge()}
      </CardContent>
    </Card>
  );
}
