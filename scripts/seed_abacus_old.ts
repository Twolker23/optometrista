import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando seed...");

  // === CRIAR UNIDADES ===
  const carapicuiba = await prisma.unidade.upsert({
    where: { nome: "Carapicuíba" },
    update: {},
    create: { nome: "Carapicuíba", ativo: true },
  });
  console.log("Unidade criada:", carapicuiba.nome);

  const santoAntonio = await prisma.unidade.upsert({
    where: { nome: "Santo Antônio" },
    update: {},
    create: { nome: "Santo Antônio", ativo: true },
  });
  console.log("Unidade criada:", santoAntonio.nome);

  // === CRIAR USUÁRIOS ===
  const adminPassword = await bcrypt.hash("Admin123!", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@otica.com" },
    update: {},
    create: {
      email: "admin@otica.com",
      password: adminPassword,
      name: "Administrador",
      userGroup: "ADMIN",
      // ADMIN não tem unidade (acesso global)
    },
  });
  console.log("Usuário admin criado:", admin.email);

  // Criar usuário de teste (john@doe.com)
  const testPassword = await bcrypt.hash("johndoe123", 10);
  const testUser = await prisma.user.upsert({
    where: { email: "john@doe.com" },
    update: {},
    create: {
      email: "john@doe.com",
      password: testPassword,
      name: "John Doe",
      userGroup: "ADMIN",
      // ADMIN não tem unidade (acesso global)
    },
  });
  console.log("Usuário de teste criado:", testUser.email);

  // === USUÁRIOS CARAPICUÍBA ===
  const lojaPassword = await bcrypt.hash("loja123", 10);
  const loja = await prisma.user.upsert({
    where: { email: "loja@otica.com" },
    update: { unidadeId: carapicuiba.id },
    create: {
      email: "loja@otica.com",
      password: lojaPassword,
      name: "Vendedor Loja - Carapicuíba",
      userGroup: "LOJA",
      unidadeId: carapicuiba.id,
    },
  });
  console.log("Usuário loja criado:", loja.email, "- Unidade:", carapicuiba.nome);

  const sacPassword = await bcrypt.hash("sac123", 10);
  const sac = await prisma.user.upsert({
    where: { email: "sac@otica.com" },
    update: { unidadeId: carapicuiba.id },
    create: {
      email: "sac@otica.com",
      password: sacPassword,
      name: "Atendente SAC",
      userGroup: "SAC",
      // SAC não tem restrição de unidade (acesso global)
    },
  });
  console.log("Usuário SAC criado:", sac.email);

  const optoPassword = await bcrypt.hash("opto123", 10);
  const opto = await prisma.user.upsert({
    where: { email: "opto@otica.com" },
    update: { unidadeId: carapicuiba.id },
    create: {
      email: "opto@otica.com",
      password: optoPassword,
      name: "Optometrista - Carapicuíba",
      userGroup: "OPTO",
      unidadeId: carapicuiba.id,
    },
  });
  console.log("Usuário opto criado:", opto.email, "- Unidade:", carapicuiba.nome);

  // Optometristas de Carapicuíba
  const optometrist1 = await prisma.user.upsert({
    where: { id: "opt-1" },
    update: { unidadeId: carapicuiba.id },
    create: {
      id: "opt-1",
      name: "Dr. Carlos Silva",
      email: "dr.carlos.silva@otica.com",
      password: optoPassword,
      userGroup: "OPTO",
      unidadeId: carapicuiba.id,
    },
  });
  console.log("Optometrista criado:", optometrist1.name, "- Unidade:", carapicuiba.nome);

  const optometrist2 = await prisma.user.upsert({
    where: { id: "opt-2" },
    update: { unidadeId: carapicuiba.id },
    create: {
      id: "opt-2",
      name: "Dra. Ana Costa",
      email: "dra.ana.costa@otica.com",
      password: optoPassword,
      userGroup: "OPTO",
      unidadeId: carapicuiba.id,
    },
  });
  console.log("Optometrista criado:", optometrist2.name, "- Unidade:", carapicuiba.nome);

  // === USUÁRIOS SANTO ANTÔNIO ===
  const lojaSA = await prisma.user.upsert({
    where: { email: "loja.sa@otica.com" },
    update: { unidadeId: santoAntonio.id },
    create: {
      email: "loja.sa@otica.com",
      password: lojaPassword,
      name: "Vendedor Loja - Santo Antônio",
      userGroup: "LOJA",
      unidadeId: santoAntonio.id,
    },
  });
  console.log("Usuário loja criado:", lojaSA.email, "- Unidade:", santoAntonio.nome);

  const optoSA = await prisma.user.upsert({
    where: { email: "opto.sa@otica.com" },
    update: { unidadeId: santoAntonio.id },
    create: {
      email: "opto.sa@otica.com",
      password: optoPassword,
      name: "Optometrista - Santo Antônio",
      userGroup: "OPTO",
      unidadeId: santoAntonio.id,
    },
  });
  console.log("Usuário opto criado:", optoSA.email, "- Unidade:", santoAntonio.nome);

  const optometrist3 = await prisma.user.upsert({
    where: { id: "opt-3" },
    update: { unidadeId: santoAntonio.id },
    create: {
      id: "opt-3",
      name: "Dr. Roberto Lima",
      email: "dr.roberto.lima@otica.com",
      password: optoPassword,
      userGroup: "OPTO",
      unidadeId: santoAntonio.id,
    },
  });
  console.log("Optometrista criado:", optometrist3.name, "- Unidade:", santoAntonio.nome);

  console.log("\nSeed completo!");
  console.log("\n=== CREDENCIAIS DE ACESSO ===");
  console.log("\n--- ADMIN (acesso global) ---");
  console.log("Admin: admin@otica.com / Admin123!");
  console.log("\n--- CARAPICUÍBA ---");
  console.log("Loja: loja@otica.com / loja123");
  console.log("Opto: opto@otica.com / opto123");
  console.log("\n--- SANTO ANTÔNIO ---");
  console.log("Loja: loja.sa@otica.com / loja123");
  console.log("Opto: opto.sa@otica.com / opto123");
  console.log("\n--- SAC (acesso global) ---");
  console.log("SAC: sac@otica.com / sac123");
}

main()
  .catch((e) => {
    console.error("Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
