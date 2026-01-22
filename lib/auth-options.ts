import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";
import prisma from "./db";

// Função para verificar se é sábado e dentro do horário permitido (08:00-18:30) em São Paulo
function isOptoAccessAllowed(): boolean {
  const now = new Date();
  // Converter para horário de São Paulo
  const spTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const dayOfWeek = spTime.getDay(); // 0 = domingo, 6 = sábado
  const hours = spTime.getHours();
  const minutes = spTime.getMinutes();
  const totalMinutes = hours * 60 + minutes;
  
  // Sábado = 6, horário 08:00 (480 min) até 18:30 (1110 min)
  const isSaturday = dayOfWeek === 6;
  const isWithinTime = totalMinutes >= 480 && totalMinutes <= 1110;
  
  return isSaturday && isWithinTime;
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email e senha são obrigatórios");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password) {
          throw new Error("Credenciais inválidas");
        }

        if (!user.isActive) {
          throw new Error("Usuário desativado");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          throw new Error("Credenciais inválidas");
        }

        // Restrição de horário para OPTO: apenas sábados 08:00-18:30
        if (user.userGroup === "OPTO" && !isOptoAccessAllowed()) {
          throw new Error("Acesso do Optometrista permitido apenas aos sábados, das 08:00 às 18:30.");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          userGroup: user.userGroup,
          unidadeId: user.unidadeId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userGroup = (user as any).userGroup;
        token.id = user.id;
        token.unidadeId = (user as any).unidadeId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        (session.user as any).userGroup = token.userGroup;
        (session.user as any).id = token.id;
        (session.user as any).unidadeId = token.unidadeId;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
