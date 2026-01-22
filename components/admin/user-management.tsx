"use client";

import { useState, useEffect } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, RefreshCw, Edit, Trash2, Loader2, Building2 } from "lucide-react";

interface Unidade {
  id: string;
  nome: string;
}

export function UserManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewUserDialog, setShowNewUserDialog] = useState(false);
  const [showEditUserDialog, setShowEditUserDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userToDelete, setUserToDelete] = useState<any>(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    userGroup: "LOJA",
    unidadeId: "global",
  });
  const [editFormData, setEditFormData] = useState({
    email: "",
    password: "",
    name: "",
    userGroup: "LOJA",
    unidadeId: "global",
  });

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/users");
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else {
        toast.error("Erro ao carregar usuários");
      }
    } catch (error: any) {
      console.error("Erro ao buscar usuários:", error);
      toast.error("Erro ao carregar usuários");
    } finally {
      setIsLoading(false);
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

  useEffect(() => {
    fetchUsers();
    fetchUnidades();
  }, []);

  // Verificar se unidade é obrigatória baseado no grupo
  const isUnidadeRequired = (userGroup: string) => {
    return userGroup === "LOJA" || userGroup === "OPTO";
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar unidade para LOJA e OPTO
    if (isUnidadeRequired(formData.userGroup) && (!formData.unidadeId || formData.unidadeId === "global")) {
      toast.error("Unidade é obrigatória para usuários LOJA e OPTO");
      return;
    }
    
    setIsLoading(true);

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          unidadeId: formData.unidadeId === "global" ? null : formData.unidadeId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao criar usuário");
      }

      toast.success("Usuário criado com sucesso");
      setFormData({ email: "", password: "", name: "", userGroup: "LOJA", unidadeId: "global" });
      setShowNewUserDialog(false);
      fetchUsers();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro ao criar usuário");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleActive = async (userId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });

      if (!response.ok) {
        throw new Error("Erro ao atualizar usuário");
      }

      toast.success(
        isActive ? "Usuário desativado" : "Usuário ativado"
      );
      fetchUsers();
    } catch (error: any) {
      console.error(error);
      toast.error("Erro ao atualizar usuário");
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      const response = await fetch(`/api/users/${userToDelete.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao excluir usuário");
      }

      toast.success("Usuário excluído com sucesso");
      setShowDeleteDialog(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro ao excluir usuário");
    }
  };

  const handleOpenEditDialog = (user: any) => {
    setSelectedUser(user);
    setEditFormData({
      email: user.email,
      password: "",
      name: user.name,
      userGroup: user.userGroup,
      unidadeId: user.unidadeId || "global",
    });
    setShowEditUserDialog(true);
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar unidade para LOJA e OPTO
    if (isUnidadeRequired(editFormData.userGroup) && (!editFormData.unidadeId || editFormData.unidadeId === "global")) {
      toast.error("Unidade é obrigatória para usuários LOJA e OPTO");
      return;
    }
    
    setIsLoading(true);

    try {
      const updateData: any = {
        name: editFormData.name,
        email: editFormData.email,
        userGroup: editFormData.userGroup,
        unidadeId: editFormData.unidadeId === "global" ? null : editFormData.unidadeId,
      };

      // Apenas incluir senha se foi preenchida
      if (editFormData.password) {
        updateData.password = editFormData.password;
      }

      const response = await fetch(`/api/users/${selectedUser?.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao editar usuário");
      }

      toast.success("Usuário editado com sucesso");
      setEditFormData({ email: "", password: "", name: "", userGroup: "LOJA", unidadeId: "global" });
      setShowEditUserDialog(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro ao editar usuário");
    } finally {
      setIsLoading(false);
    }
  };

  const getUserGroupBadgeColor = (group: string) => {
    switch (group) {
      case "ADMIN":
        return "bg-purple-100 text-purple-800";
      case "LOJA":
        return "bg-blue-100 text-blue-800";
      case "SAC":
        return "bg-green-100 text-green-800";
      case "OPTO":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Gestão de Usuários</h3>
          <p className="text-sm text-gray-600">Crie e gerencie usuários do sistema</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchUsers} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
          <Button onClick={() => setShowNewUserDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Usuário
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Carregando usuários...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((user) => (
            <Card key={user?.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{user?.name}</CardTitle>
                    <CardDescription>{user?.email}</CardDescription>
                  </div>
                  <Badge className={getUserGroupBadgeColor(user?.userGroup)}>
                    {user?.userGroup}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {/* Unidade */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      Unidade:
                    </span>
                    <span className="text-sm font-medium">
                      {user?.unidade?.nome || "Global"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Status:</span>
                    <Badge variant={user?.isActive ? "default" : "outline"}>
                      {user?.isActive ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEditDialog(user)}
                      className="flex-1"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setUserToDelete(user);
                        setShowDeleteDialog(true);
                      }}
                      className="flex-1"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Excluir
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog: Novo Usuário */}
      <Dialog open={showNewUserDialog} onOpenChange={setShowNewUserDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Usuário</DialogTitle>
            <DialogDescription>
              Crie um novo usuário para o sistema
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateUser} className="space-y-4" autoComplete="off" data-form-type="other">
            <div className="space-y-2">
              <Label htmlFor="new-user-name">Nome Completo *</Label>
              <Input
                id="new-user-name"
                name="new-user-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                disabled={isLoading}
                autoComplete="off"
                data-lpignore="true"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-user-email">Email *</Label>
              <Input
                id="new-user-email"
                name="new-user-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                disabled={isLoading}
                autoComplete="off"
                data-lpignore="true"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-user-password">Senha *</Label>
              <Input
                id="new-user-password"
                name="new-user-password"
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required
                disabled={isLoading}
                autoComplete="new-password"
                data-lpignore="true"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="userGroup">Grupo de Acesso *</Label>
              <Select
                value={formData.userGroup}
                onValueChange={(value) =>
                  setFormData({ ...formData, userGroup: value, unidadeId: "global" })
                }
                required
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o grupo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin (Global)</SelectItem>
                  <SelectItem value="LOJA">Loja</SelectItem>
                  <SelectItem value="SAC">SAC (Global)</SelectItem>
                  <SelectItem value="OPTO">Optometrista</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Campo Unidade */}
            <div className="space-y-2">
              <Label htmlFor="unidadeId">
                Unidade {isUnidadeRequired(formData.userGroup) ? "*" : "(opcional)"}
              </Label>
              <Select
                value={formData.unidadeId}
                onValueChange={(value) =>
                  setFormData({ ...formData, unidadeId: value })
                }
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a unidade" />
                </SelectTrigger>
                <SelectContent>
                  {!isUnidadeRequired(formData.userGroup) && (
                    <SelectItem value="global">Sem unidade (Global)</SelectItem>
                  )}
                  {unidades.map((unidade) => (
                    <SelectItem key={unidade.id} value={unidade.id}>
                      {unidade.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isUnidadeRequired(formData.userGroup) && (
                <p className="text-xs text-gray-500">
                  Usuários LOJA e OPTO devem pertencer a uma unidade
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowNewUserDialog(false)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  "Criar Usuário"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Editar Usuário */}
      <Dialog open={showEditUserDialog} onOpenChange={setShowEditUserDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto sm:max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Editar Usuário</DialogTitle>
            <DialogDescription className="text-sm">
              Edite as informações do usuário
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditUser} className="space-y-3 sm:space-y-4" autoComplete="off" data-form-type="other">
            <div className="space-y-2">
              <Label htmlFor="edit-user-name">Nome Completo *</Label>
              <Input
                id="edit-user-name"
                name="edit-user-name"
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                required
                disabled={isLoading}
                autoComplete="off"
                data-lpignore="true"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-user-email">Email *</Label>
              <Input
                id="edit-user-email"
                name="edit-user-email"
                type="email"
                value={editFormData.email}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                required
                disabled={isLoading}
                autoComplete="off"
                data-lpignore="true"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-user-password">Nova Senha (deixe em branco para manter a atual)</Label>
              <Input
                id="edit-user-password"
                name="edit-user-password"
                type="password"
                value={editFormData.password}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, password: e.target.value })
                }
                placeholder="Digite apenas se quiser alterar a senha"
                disabled={isLoading}
                autoComplete="new-password"
                data-lpignore="true"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-userGroup">Grupo de Acesso *</Label>
              <Select
                value={editFormData.userGroup}
                onValueChange={(value) =>
                  setEditFormData({ ...editFormData, userGroup: value })
                }
                required
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o grupo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin (Global)</SelectItem>
                  <SelectItem value="LOJA">Loja</SelectItem>
                  <SelectItem value="SAC">SAC (Global)</SelectItem>
                  <SelectItem value="OPTO">Optometrista</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Campo Unidade */}
            <div className="space-y-2">
              <Label htmlFor="edit-unidadeId">
                Unidade {isUnidadeRequired(editFormData.userGroup) ? "*" : "(opcional)"}
              </Label>
              <Select
                value={editFormData.unidadeId}
                onValueChange={(value) =>
                  setEditFormData({ ...editFormData, unidadeId: value })
                }
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a unidade" />
                </SelectTrigger>
                <SelectContent>
                  {!isUnidadeRequired(editFormData.userGroup) && (
                    <SelectItem value="global">Sem unidade (Global)</SelectItem>
                  )}
                  {unidades.map((unidade) => (
                    <SelectItem key={unidade.id} value={unidade.id}>
                      {unidade.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isUnidadeRequired(editFormData.userGroup) && (
                <p className="text-xs text-gray-500">
                  Usuários LOJA e OPTO devem pertencer a uma unidade
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowEditUserDialog(false);
                  setSelectedUser(null);
                }}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar Alterações"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* AlertDialog: Excluir Usuário */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o usuário <strong>{userToDelete?.name}</strong>?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Não</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser}>Sim, Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
