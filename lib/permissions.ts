import { UserGroup, QueueStatus } from "@prisma/client";

export function canViewQueue(userGroup: UserGroup, queueStatus: QueueStatus): boolean {
  switch (userGroup) {
    case "ADMIN":
      return true; // Admin vê todas as filas
    
    case "LOJA":
      return true; // Loja vê todas as filas
    
    case "SAC":
      // SAC vê: Agendados, Não Aptos, Vendas e Repescagem
      return [
        "AGENDADO",
        "NAO_APTO",
        "VENDA",
        "REPESCAGEM"
      ].includes(queueStatus);
    
    case "OPTO":
      // Opto vê apenas Clientes Agendados
      return queueStatus === "AGENDADO";
    
    default:
      return false;
  }
}

export function canManipulateCard(
  userGroup: UserGroup,
  queueStatus: QueueStatus,
  cardCreatorGroup: UserGroup
): boolean {
  switch (userGroup) {
    case "ADMIN":
      return true; // Admin pode manipular tudo
    
    case "LOJA":
      // Loja pode manipular cards em RETORNO_LOJA ou cards que ela criou
      return queueStatus === "RETORNO_LOJA" || cardCreatorGroup === "LOJA";
    
    case "SAC":
      // SAC pode manipular apenas cards que ele criou (reagendamento na fila repescagem)
      return cardCreatorGroup === "SAC";
    
    case "OPTO":
      // Opto pode manipular apenas cards na fila AGENDADO
      return queueStatus === "AGENDADO";
    
    default:
      return false;
  }
}

export function canViewClient(
  userGroup: UserGroup,
  clientCreatorGroup: UserGroup
): boolean {
  switch (userGroup) {
    case "ADMIN":
    case "OPTO":
    case "LOJA":
      return true; // Admin, Opto e Loja veem todos os clientes
    
    case "SAC":
      // SAC vê apenas clientes criados pelo próprio SAC
      return clientCreatorGroup === "SAC";
    
    default:
      return false;
  }
}

export function canCreateClient(userGroup: UserGroup): boolean {
  return userGroup === "ADMIN" || userGroup === "LOJA" || userGroup === "SAC";
}

export function canAccessMaintenance(userGroup: UserGroup): boolean {
  return userGroup === "ADMIN" || userGroup === "LOJA";
}

export function canAccessReports(userGroup: UserGroup): boolean {
  return userGroup === "ADMIN";
}

export function canManageUsers(userGroup: UserGroup): boolean {
  return userGroup === "ADMIN";
}
