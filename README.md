# 🩺 Optometrista

Sistema web de **agendamento e gestão de atendimentos optométricos**, desenvolvido com foco em organização de fluxo, controle de usuários e regras de negócio reais do dia a dia de uma ótica.

Projeto criado para **estudo avançado e portfólio**, utilizando dados totalmente fictícios.

---

## 🎯 Objetivo do Projeto

Centralizar e organizar o processo de agendamento de consultas optométricas, permitindo:

- Cadastro de clientes
- Agendamento de atendimentos
- Controle de comparecimento
- Regras específicas de funcionamento
- Separação de perfis (admin / optometrista)

---

## 🧠 Funcionalidades Principais

- 📅 Agendamento de consultas
- 👤 Gestão de usuários e permissões
- 🧾 Registro de comparecimento
- 🔒 Controle de acesso por perfil
- ⚙️ Regras de negócio aplicadas no sistema
- 🗄️ Persistência de dados em banco relacional

---

## 🚀 Tecnologias Utilizadas

- **Next.js** (App Router)
- **Node.js**
- **TypeScript**
- **PostgreSQL**
- **Prisma ORM**
- **Tailwind CSS**
- **NextAuth** (autenticação)

---

## 📂 Estrutura do Projeto

```text
app/        # Rotas e páginas (Next.js App Router)
components/ # Componentes reutilizáveis
hooks/      # Hooks customizados
lib/        # Funções auxiliares e serviços
prisma/     # Schema, migrations e seed
scripts/    # Scripts auxiliares
public/     # Assets públicos

