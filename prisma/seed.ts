import { PrismaClient, UserGroup } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed do sistema...");

  /* ===============================
     1️⃣ UNIDADES
  ================================ */
  await prisma.unidade.createMany({
    data: [{ nome: "Diadema" }, { nome: "Campinas" }],
    skipDuplicates: true,
  });

  console.log("🏢 Unidades garantidas");

  /* ===============================
     2️⃣ USUÁRIO ADMIN
  ================================ */
  const email = "admin@demo.com";
  const plainPassword = "admin123";

  const existingAdmin = await prisma.user.findUnique({
    where: { email },
  });

  if (existingAdmin) {
    console.log("⚠️ Usuário admin já existe");
    return;
  }

  const passwordHash = await bcrypt.hash(plainPassword, 10);

  await prisma.user.create({
    data: {
      name: "Administrador",
      email,
      password: passwordHash,
      userGroup: UserGroup.ADMIN,
      isActive: true,
      unidadeId: null, // ADMIN global
    },
  });

  console.log("✅ Usuário ADMIN criado");
  console.log("📧 Email: admin@demo.com");
  console.log("🔑 Senha: admin123");
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
