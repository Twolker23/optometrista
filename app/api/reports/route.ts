import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).userGroup !== "ADMIN") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const optometristId = searchParams.get("optometristId");

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Data inicial e final são obrigatórias" },
        { status: 400 }
      );
    }

    const whereClause: any = {
      attendedAt: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    };

    if (optometristId) {
      whereClause.optometristId = optometristId;
    }

    // Buscar todos os agendamentos no período
    const appointments = await prisma.appointment.findMany({
      where: whereClause,
      include: {
        client: true,
        optometrist: true,
        sale: true,
      },
    });

    // Calcular estatísticas
    const totalAppointments = appointments.length;
    const attended = appointments.filter((a: any) => a.attended === true).length;
    const notAttended = appointments.filter((a: any) => a.attended === false).length;
    const apt = appointments.filter((a: any) => a.isApt === true).length;
    const notApt = appointments.filter((a: any) => a.isApt === false).length;
    const sales = appointments.filter((a: any) => a.sale).length;
    
    const totalRevenue = appointments
      .filter((a: any) => a.sale)
      .reduce((sum: number, a: any) => sum + (a.sale?.value || 0), 0);

    const averageTicket = sales > 0 ? totalRevenue / sales : 0;

    // Taxa de comparecimento
    const attendanceRate = totalAppointments > 0 ? (attended / totalAppointments) * 100 : 0;

    // Taxa de conversão em vendas
    const conversionRate = apt > 0 ? (sales / apt) * 100 : 0;

    // Motivos de não aptidão
    const notAptReasons = appointments
      .filter((a: any) => a.isApt === false && a.aptJustification)
      .reduce((acc: any, a: any) => {
        const reason = a.aptJustification || "Sem justificativa";
        acc[reason] = (acc[reason] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    // Motivos de não conversão
    const notConvertedReasons: Record<string, number> = {};
    
    // Buscar históricos de repescagem por falta de conversão
    const repescagemHistories = await prisma.queueHistory.findMany({
      where: {
        toStatus: "REPESCAGEM",
        fromStatus: "RETORNO_LOJA",
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
    });

    repescagemHistories.forEach((h: any) => {
      const reason = h.justification || "Sem justificativa";
      notConvertedReasons[reason] = (notConvertedReasons[reason] || 0) + 1;
    });

    // Performance por optometrista
    const optometristPerformance: Record<string, any> = {};
    
    appointments.forEach((a: any) => {
      const optName = a.optometrist?.name || "Desconhecido";
      if (!optometristPerformance[optName]) {
        optometristPerformance[optName] = {
          totalAppointments: 0,
          attended: 0,
          apt: 0,
          sales: 0,
          revenue: 0,
        };
      }
      optometristPerformance[optName].totalAppointments++;
      if (a.attended) optometristPerformance[optName].attended++;
      if (a.isApt) optometristPerformance[optName].apt++;
      if (a.sale) {
        optometristPerformance[optName].sales++;
        optometristPerformance[optName].revenue += a.sale.value;
      }
    });

    return NextResponse.json({
      summary: {
        totalAppointments,
        attended,
        notAttended,
        apt,
        notApt,
        sales,
        totalRevenue,
        averageTicket,
        attendanceRate,
        conversionRate,
      },
      notAptReasons,
      notConvertedReasons,
      optometristPerformance,
    });
  } catch (error: any) {
    console.error("Erro ao gerar relatórios:", error);
    return NextResponse.json(
      { error: "Erro ao gerar relatórios" },
      { status: 500 }
    );
  }
}
