"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle, XCircle, Upload, Loader2 } from "lucide-react";

interface AttendanceDialogProps {
  open: boolean;
  onClose: () => void;
  client: any;
}

enum Step {
  ATTENDANCE = "attendance",
  APTITUDE = "aptitude", // ✅ agora vem antes
  PHOTO = "photo",       // ✅ só aparece se for APTO
}

export function AttendanceDialog({ open, onClose, client }: AttendanceDialogProps) {
  const router = useRouter();

  const [step, setStep] = useState<Step>(Step.ATTENDANCE);
  const [isLoading, setIsLoading] = useState(false);

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [justification, setJustification] = useState("");

  // Guarda a decisão de aptidão quando for APTO e precisar ir para a foto
  const [pendingIsApt, setPendingIsApt] = useState<boolean | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const latestAppointment = client?.appointments?.[0];

  // Reset ao abrir
  useEffect(() => {
    if (open) {
      setStep(Step.ATTENDANCE);
      setIsLoading(false);

      setPhotoFile(null);
      setPhotoPreview("");
      setJustification("");
      setPendingIsApt(null);

      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [open]);

  const mapStatusFromAptitude = (isApt: boolean) => {
    return isApt ? "RETORNO_LOJA" : "NAO_APTO";
  };

  const updateClientStatus = async (
    currentStatus: string,
    extras?: { renegotiationReason?: string | null; recovered?: boolean | null }
  ) => {
    if (!client?.id) {
      throw new Error("Cliente não encontrado para atualização de status");
    }

    const res = await fetch(`/api/clients/${client.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: currentStatus,
        renegotiationReason: extras?.renegotiationReason ?? undefined,
        recovered: extras?.recovered ?? undefined,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.error || "Erro ao atualizar status do cliente");
    }
  };

  const handleAttendance = async (attended: boolean) => {
    if (!latestAppointment?.id) {
      toast.error("Agendamento não encontrado");
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch(
        `/api/appointments/${latestAppointment.id}/attendance`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ attended }),
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.error || "Erro ao registrar comparecimento");
      }

      if (attended) {
        // ✅ Agora vai direto para aptidão
        setJustification("");
        setPhotoFile(null);
        setPhotoPreview("");
        setPendingIsApt(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        setStep(Step.APTITUDE);
      } else {
        // ✅ Move cliente para RENEGOCIACAO com motivo NAO_COMPARECEU
        await updateClientStatus("RENEGOCIACAO", {
          renegotiationReason: "NAO_COMPARECEU",
        });

        toast.success("Cliente marcado como não comparecido");
        onClose();
        router.refresh();
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Erro ao registrar comparecimento");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoFile(file);

    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  /**
   * Upload via presigned:
   * 1) POST /api/upload/presigned { filename, contentType }
   * 2) PUT no uploadUrl retornado
   * 3) POST /api/upload/complete { cloud_storage_path } -> cria registro no DB e devolve photo.id
   */
  const uploadPhoto = async (): Promise<string | null> => {
    if (!photoFile) return null;

    const contentType = photoFile.type || "application/octet-stream";

    const presignedResponse = await fetch("/api/upload/presigned", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: photoFile.name,
        contentType,
      }),
    });

    if (!presignedResponse.ok) {
      const err = await presignedResponse.json().catch(() => null);
      throw new Error(err?.error || "Erro ao obter URL de upload");
    }

    const { uploadUrl, cloud_storage_path } = await presignedResponse.json();

    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      body: photoFile,
    });

    if (!uploadResponse.ok) {
      throw new Error("Erro ao fazer upload da foto");
    }

    const completeResponse = await fetch("/api/upload/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cloud_storage_path, isPublic: false }),
    });

    if (!completeResponse.ok) {
      const err = await completeResponse.json().catch(() => null);
      throw new Error(err?.error || "Erro ao completar upload");
    }

    const photo = await completeResponse.json();
    return photo?.id ?? null;
  };

  const handleAptitude = async (isApt: boolean) => {
    if (!latestAppointment?.id) {
      toast.error("Agendamento não encontrado");
      return;
    }

    // ✅ Se for APTO, primeiro vai para a tela de foto (sem registrar ainda)
    if (isApt) {
      setPendingIsApt(true);
      setStep(Step.PHOTO);
      return;
    }

    // ❌ Não apto: exige justificativa e registra direto
    if (!justification.trim()) {
      toast.error("Justificativa é obrigatória para clientes não aptos");
      return;
    }

    try {
      setIsLoading(true);

      // garante que não vai "carregar foto velha"
      setPhotoFile(null);
      setPhotoPreview("");
      if (fileInputRef.current) fileInputRef.current.value = "";

      const response = await fetch(
        `/api/appointments/${latestAppointment.id}/aptitude`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            isApt: false,
            aptJustification: justification.trim(),
            photoId: null,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.error || "Erro ao registrar aptidão");
      }

      const newStatus = mapStatusFromAptitude(false);
      await updateClientStatus(newStatus);

      toast.success("Cliente marcado como não apto");
      onClose();
      router.refresh();
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Erro ao registrar aptidão");
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Continuar na tela de foto (somente para APTO)
  const handleContinueWithPhoto = async () => {
    if (!latestAppointment?.id) {
      toast.error("Agendamento não encontrado");
      return;
    }

    if (!pendingIsApt) {
      toast.error("Fluxo inválido: aptidão não definida");
      return;
    }

    if (!photoFile) {
      toast.error("Foto da receita é obrigatória para clientes aptos");
      return;
    }

    try {
      setIsLoading(true);

      const photoId = await uploadPhoto();

      const response = await fetch(
        `/api/appointments/${latestAppointment.id}/aptitude`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            isApt: true,
            aptJustification: null,
            photoId,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.error || "Erro ao registrar aptidão");
      }

      const newStatus = mapStatusFromAptitude(true);
      await updateClientStatus(newStatus);

      toast.success("Cliente marcado como apto");
      onClose();
      router.refresh();
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Erro ao registrar aptidão");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Registrar Atendimento - {client?.name}</DialogTitle>
          <DialogDescription>
            {step === Step.ATTENDANCE && "Registre o comparecimento do cliente"}
            {step === Step.APTITUDE && "Registre a aptidão do cliente"}
            {step === Step.PHOTO && "Tire a foto da receita (obrigatório para aptos)"}
          </DialogDescription>
        </DialogHeader>

        {step === Step.ATTENDANCE && (
          <div className="space-y-4 py-4">
            <p className="text-center text-gray-600">
              O cliente compareceu ao atendimento?
            </p>
            <div className="flex gap-4 justify-center">
              <Button
                onClick={() => handleAttendance(true)}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="w-5 h-5 mr-2" />
                )}
                Compareceu
              </Button>

              <Button
                onClick={() => handleAttendance(false)}
                disabled={isLoading}
                variant="destructive"
                className="flex-1"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <XCircle className="w-5 h-5 mr-2" />
                )}
                Não compareceu
              </Button>
            </div>
          </div>
        )}

        {step === Step.APTITUDE && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Justificativa (preencha apenas se NÃO apto)</Label>
              <Textarea
                placeholder="Informe o motivo da não aptidão..."
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                rows={4}
                disabled={isLoading}
              />
            </div>

            <p className="text-center text-gray-600">
              O cliente é apto para o uso de óculos?
            </p>

            <div className="flex gap-4 justify-center">
              <Button
                onClick={() => handleAptitude(true)}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="w-5 h-5 mr-2" />
                )}
                Apto
              </Button>

              <Button
                onClick={() => handleAptitude(false)}
                disabled={isLoading}
                variant="destructive"
                className="flex-1"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <XCircle className="w-5 h-5 mr-2" />
                )}
                Não Apto
              </Button>
            </div>
          </div>
        )}

        {step === Step.PHOTO && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Foto da Receita</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
              >
                <Upload className="w-4 h-4 mr-2" />
                Selecionar Foto
              </Button>
            </div>

            {photoPreview && (
              <div className="border rounded-lg p-4">
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="max-w-full h-auto max-h-64 mx-auto rounded"
                />
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleContinueWithPhoto}
                disabled={!photoFile || isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : null}
                Continuar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
