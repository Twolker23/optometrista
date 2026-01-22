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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Building2 } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { TimeGridPicker } from "@/components/ui/time-grid-picker";

// Função para formatar telefone no padrão (11) 99999-9999
function formatPhone(value: string): string {
  // Remove tudo que não é dígito
  const digits = value.replace(/\D/g, "");
  
  // Limita a 11 dígitos
  const limited = digits.slice(0, 11);
  
  // Aplica a máscara
  if (limited.length <= 2) {
    return limited.length > 0 ? `(${limited}` : "";
  } else if (limited.length <= 7) {
    return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
  } else {
    return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`;
  }
}

// Função para extrair apenas dígitos
function getPhoneDigits(value: string): string {
  return value.replace(/\D/g, "");
}

// Validar se tem 11 dígitos
function isValidPhone(value: string): boolean {
  const digits = getPhoneDigits(value);
  return digits.length === 11;
}

interface Unidade {
  id: string;
  nome: string;
}

interface NewClientDialogProps {
  open: boolean;
  onClose: () => void;
  userGroup?: string;
  userUnidadeId?: string | null;
}

export function NewClientDialog({ open, onClose, userGroup, userUnidadeId }: NewClientDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [optometrists, setOptometrists] = useState<any[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    birthDate: "",
    phone: "",
    scheduledDate: "",
    scheduledTime: "",
    optometristId: "",
    unidadeId: "",
  });

  // Verificar se usuário pode escolher unidade (ADMIN ou SAC)
  const canSelectUnidade = userGroup === "ADMIN" || userGroup === "SAC";

  useEffect(() => {
    if (open) {
      fetchOptometrists();
      fetchUnidades();
      
      // Se usuário não pode escolher, pré-seleciona sua unidade
      if (!canSelectUnidade && userUnidadeId) {
        setFormData(prev => ({ ...prev, unidadeId: userUnidadeId }));
      }
    }
  }, [open, canSelectUnidade, userUnidadeId]);

  const fetchOptometrists = async () => {
    try {
      // Se já tem unidade selecionada, filtrar optometristas por unidade
      const url = formData.unidadeId 
        ? `/api/optometrists?unidadeId=${formData.unidadeId}`
        : "/api/optometrists";
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setOptometrists(data);
      }
    } catch (error: any) {
      console.error("Erro ao buscar optometristas:", error);
    }
  };

  const fetchUnidades = async () => {
    try {
      const response = await fetch("/api/unidades");
      if (response.ok) {
        const data = await response.json();
        setUnidades(data);
      }
    } catch (error: any) {
      console.error("Erro ao buscar unidades:", error);
    }
  };

  // Recarregar optometristas quando unidade mudar
  useEffect(() => {
    if (formData.unidadeId) {
      fetchOptometrists();
      // Limpar optometrista selecionado quando mudar unidade
      setFormData(prev => ({ ...prev, optometristId: "" }));
    }
  }, [formData.unidadeId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação frontend
    if (!formData.scheduledDate || !formData.scheduledTime) {
      toast.error("Data e horário são obrigatórios");
      return;
    }

    if (!formData.unidadeId) {
      toast.error("Unidade é obrigatória");
      return;
    }

    if (!isValidPhone(formData.phone)) {
      toast.error("Telefone deve ter 11 dígitos (DDD + 9 dígitos)");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao cadastrar cliente");
      }

      toast.success("Cliente cadastrado com sucesso");
      setFormData({
        name: "",
        birthDate: "",
        phone: "",
        scheduledDate: "",
        scheduledTime: "",
        optometristId: "",
        unidadeId: canSelectUnidade ? "" : (userUnidadeId || ""),
      });
      onClose();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro ao cadastrar cliente");
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = formData.name && formData.birthDate && formData.phone && 
                      formData.scheduledDate && formData.scheduledTime && 
                      formData.optometristId && formData.unidadeId &&
                      isValidPhone(formData.phone);

  // Obter nome da unidade pré-selecionada
  const selectedUnidadeNome = unidades.find(u => u.id === formData.unidadeId)?.nome || "";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto sm:max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Novo Cliente</DialogTitle>
          <DialogDescription className="text-sm">
            Cadastre um novo cliente e agende o atendimento
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          {/* Campo Unidade */}
          <div className="space-y-2">
            <Label htmlFor="unidadeId" className="flex items-center gap-1">
              <Building2 className="w-4 h-4" />
              Unidade do Atendimento *
            </Label>
            {canSelectUnidade ? (
              <Select
                value={formData.unidadeId}
                onValueChange={(value) =>
                  setFormData({ ...formData, unidadeId: value })
                }
                required
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a unidade" />
                </SelectTrigger>
                <SelectContent>
                  {unidades.map((unidade) => (
                    <SelectItem key={unidade.id} value={unidade.id}>
                      {unidade.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={selectedUnidadeNome}
                disabled
                className="bg-gray-100"
              />
            )}
            {!canSelectUnidade && (
              <p className="text-xs text-gray-500">
                Você só pode cadastrar clientes para sua unidade
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="client-name">Nome Completo *</Label>
            <Input
              id="client-name"
              name="client-name-field"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              disabled={isLoading}
              autoComplete="off"
              data-lpignore="true"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client-birthDate">Data de Nascimento *</Label>
              <Input
                id="client-birthDate"
                name="client-birthdate-field"
                type="date"
                value={formData.birthDate}
                onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                required
                disabled={isLoading}
                autoComplete="off"
                data-lpignore="true"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone *</Label>
              <Input
                id="phone"
                name="client-phone-field"
                placeholder="(11) 99999-9999"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                required
                disabled={isLoading}
                autoComplete="off"
                data-lpignore="true"
                maxLength={16}
              />
              {formData.phone && !isValidPhone(formData.phone) && (
                <p className="text-xs text-red-500">Telefone deve ter 11 dígitos (DDD + 9 dígitos)</p>
              )}
            </div>
          </div>

          {/* Data e Horário lado a lado */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data do Agendamento *</Label>
              <DatePicker
                value={formData.scheduledDate}
                onChange={(value) => {
                  setFormData({ ...formData, scheduledDate: value, scheduledTime: "" });
                }}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label>Horário *</Label>
              <TimeGridPicker
                value={formData.scheduledTime}
                onChange={(value) => setFormData({ ...formData, scheduledTime: value })}
                disabled={isLoading || !formData.scheduledDate}
                selectedDate={formData.scheduledDate}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="optometrist">Optometrista *</Label>
            <Select
              value={formData.optometristId}
              onValueChange={(value) =>
                setFormData({ ...formData, optometristId: value })
              }
              required
              disabled={isLoading || !formData.unidadeId}
            >
              <SelectTrigger>
                <SelectValue placeholder={formData.unidadeId ? "Selecione um optometrista" : "Selecione a unidade primeiro"} />
              </SelectTrigger>
              <SelectContent>
                {optometrists.map((opto) => (
                  <SelectItem key={opto?.id} value={opto?.id}>
                    {opto?.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {optometrists.length === 0 && formData.unidadeId && (
              <p className="text-xs text-amber-600">
                Nenhum optometrista disponível para esta unidade
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !isFormValid}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Cadastrando...
                </>
              ) : (
                "Cadastrar Cliente"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
