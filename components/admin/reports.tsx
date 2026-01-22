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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Loader2, FileText, TrendingUp } from "lucide-react";

const COLORS = ["#60B5FF", "#FF9149", "#FF9898", "#FF90BB", "#FF6363", "#80D8C3", "#A19AD3", "#72BF78"];

export function Reports() {
  const [isLoading, setIsLoading] = useState(false);
  const [optometrists, setOptometrists] = useState<any[]>([]);
  const [reportData, setReportData] = useState<any>(null);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    optometristId: "all",
  });

  useEffect(() => {
    fetchOptometrists();
    // Definir datas padrão (mês atual)
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    setFilters({
      startDate: firstDay.toISOString().split("T")[0],
      endDate: lastDay.toISOString().split("T")[0],
      optometristId: "all",
    });
  }, []);

  const fetchOptometrists = async () => {
    try {
      const response = await fetch("/api/optometrists");
      if (response.ok) {
        const data = await response.json();
        setOptometrists(data);
      }
    } catch (error: any) {
      console.error("Erro ao buscar optometristas:", error);
    }
  };

  const generateReport = async () => {
    if (!filters.startDate || !filters.endDate) {
      toast.error("Selecione o período do relatório");
      return;
    }

    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
      if (filters.optometristId && filters.optometristId !== "all") {
        params.append("optometristId", filters.optometristId);
      }

      const response = await fetch(`/api/reports?${params}`);
      if (!response.ok) {
        throw new Error("Erro ao gerar relatório");
      }

      const data = await response.json();
      setReportData(data);
    } catch (error: any) {
      console.error(error);
      toast.error("Erro ao gerar relatório");
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  // Preparar dados para gráficos
  const attendanceData = reportData
    ? [
        { name: "Agendados", value: reportData.summary.totalAppointments },
        { name: "Compareceram", value: reportData.summary.attended },
        { name: "Não Compareceram", value: reportData.summary.notAttended },
      ]
    : [];

  const aptitudeData = reportData
    ? [
        { name: "Aptos", value: reportData.summary.apt },
        { name: "Não Aptos", value: reportData.summary.notApt },
      ]
    : [];

  const conversionData = reportData
    ? [
        { name: "Vendas", value: reportData.summary.sales },
        { name: "Sem Venda", value: reportData.summary.apt - reportData.summary.sales },
      ]
    : [];

  const notAptReasonsData = reportData
    ? Object.entries(reportData.notAptReasons || {}).map(([reason, count]) => ({
        name: reason,
        value: count,
      }))
    : [];

  const notConvertedReasonsData = reportData
    ? Object.entries(reportData.notConvertedReasons || {}).map(([reason, count]) => ({
        name: reason,
        value: count,
      }))
    : [];

  const optometristPerformanceData = reportData
    ? Object.entries(reportData.optometristPerformance || {}).map(
        ([name, data]: [string, any]) => ({
          name,
          atendimentos: data.totalAppointments,
          comparecimentos: data.attended,
          aptos: data.apt,
          vendas: data.sales,
        })
      )
    : [];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h3 className="text-lg sm:text-xl font-semibold">Relatórios e Análises</h3>
        <p className="text-xs sm:text-sm text-gray-600">
          Visualize estatísticas e indicadores de desempenho
        </p>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Data Inicial *</Label>
              <Input
                id="startDate"
                type="date"
                value={filters.startDate}
                onChange={(e) =>
                  setFilters({ ...filters, startDate: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">Data Final *</Label>
              <Input
                id="endDate"
                type="date"
                value={filters.endDate}
                onChange={(e) =>
                  setFilters({ ...filters, endDate: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="optometrist">Optometrista (Opcional)</Label>
              <Select
                value={filters.optometristId}
                onValueChange={(value) =>
                  setFilters({ ...filters, optometristId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {optometrists
                    .filter((opto) => opto?.id && opto.id.trim() !== "")
                    .map((opto) => (
                      <SelectItem key={opto.id} value={opto.id}>
                        {opto.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end sm:col-span-2 lg:col-span-1">
              <Button onClick={generateReport} disabled={isLoading} className="w-full" size="sm">
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    <span className="hidden sm:inline">Gerando...</span>
                    <span className="sm:hidden">...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Gerar Relatório</span>
                    <span className="sm:hidden">Gerar</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {reportData && (
        <>
          {/* Cards de Resumo */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card>
              <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">
                  Total de Atendimentos
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 sm:px-6">
                <div className="text-xl sm:text-3xl font-bold">
                  {reportData.summary.totalAppointments}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">
                  Taxa de Comparecimento
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 sm:px-6">
                <div className="text-xl sm:text-3xl font-bold text-green-600">
                  {formatPercentage(reportData.summary.attendanceRate)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">
                  Taxa de Conversão
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 sm:px-6">
                <div className="text-xl sm:text-3xl font-bold text-blue-600">
                  {formatPercentage(reportData.summary.conversionRate)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">
                  Faturamento Total
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 sm:px-6">
                <div className="text-xl sm:text-3xl font-bold text-purple-600">
                  {formatCurrency(reportData.summary.totalRevenue)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <Card>
              <CardHeader className="px-3 sm:px-6">
                <CardTitle className="text-base sm:text-lg">Agendados vs Compareceram</CardTitle>
              </CardHeader>
              <CardContent className="px-3 sm:px-6">
                <div className="h-48 sm:h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={attendanceData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis
                        dataKey="name"
                        tickLine={false}
                        tick={{ fontSize: 10 }}
                        label={{ value: "", position: "insideBottom", offset: -15, style: { textAnchor: "middle", fontSize: 11 } }}
                      />
                      <YAxis
                        tickLine={false}
                        tick={{ fontSize: 10 }}
                        label={{ value: "Quantidade", angle: -90, position: "insideLeft", style: { textAnchor: "middle", fontSize: 11 } }}
                      />
                      <Tooltip contentStyle={{ fontSize: 11 }} />
                      <Bar dataKey="value" fill="#60B5FF" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="px-3 sm:px-6">
                <CardTitle className="text-base sm:text-lg">Aptidão dos Clientes</CardTitle>
              </CardHeader>
              <CardContent className="px-3 sm:px-6">
                <div className="h-48 sm:h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={aptitudeData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name}: ${entry.value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {aptitudeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: 11 }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} verticalAlign="top" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Conversão em Vendas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={conversionData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name}: ${entry.value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {conversionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: 11 }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} verticalAlign="top" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Performance por Optometrista</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={optometristPerformanceData} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis
                        dataKey="name"
                        tickLine={false}
                        tick={{ fontSize: 10 }}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis
                        tickLine={false}
                        tick={{ fontSize: 10 }}
                      />
                      <Tooltip contentStyle={{ fontSize: 11 }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} verticalAlign="top" />
                      <Bar dataKey="atendimentos" fill="#60B5FF" name="Atendimentos" />
                      <Bar dataKey="comparecimentos" fill="#80D8C3" name="Compareceu" />
                      <Bar dataKey="aptos" fill="#FF9149" name="Aptos" />
                      <Bar dataKey="vendas" fill="#72BF78" name="Vendas" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabelas de Motivos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {notAptReasonsData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Principais Motivos de Não Aptidão</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {notAptReasonsData.map((item: any, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded"
                      >
                        <span className="text-sm">{item.name}</span>
                        <span className="font-semibold">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {notConvertedReasonsData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Principais Motivos de Não Conversão
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {notConvertedReasonsData.map((item: any, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded"
                      >
                        <span className="text-sm">{item.name}</span>
                        <span className="font-semibold">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Métricas Adicionais */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Métricas Detalhadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded">
                  <div className="text-sm text-gray-600">Total de Vendas</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {reportData.summary.sales}
                  </div>
                </div>
                <div className="p-4 bg-green-50 rounded">
                  <div className="text-sm text-gray-600">Ticket Médio</div>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(reportData.summary.averageTicket)}
                  </div>
                </div>
                <div className="p-4 bg-purple-50 rounded">
                  <div className="text-sm text-gray-600">Clientes Aptos</div>
                  <div className="text-2xl font-bold text-purple-600">
                    {reportData.summary.apt}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!reportData && !isLoading && (
        <div className="text-center py-12">
          <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Selecione o período e gere o relatório</p>
        </div>
      )}
    </div>
  );
}
