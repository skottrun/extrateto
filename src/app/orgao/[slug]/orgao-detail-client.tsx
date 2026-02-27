"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2, Users, TrendingUp, BarChart3, Info, MapPin } from "lucide-react";
import { ShareButtons } from "@/components/share-buttons";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { Member } from "@/data/mock-data";
import { getStatsByOrgao } from "@/lib/aggregations";
import { TETO_CONSTITUCIONAL } from "@/lib/constants";
import { formatCurrency, formatCurrencyFull, formatNumber, formatPercent } from "@/lib/utils";
import { SalaryComparison } from "@/components/salary-comparison";
import { Footer } from "@/components/footer";

interface OrgaoDetailClientProps {
  members: Member[];
  availableYears: { value: string; label: string }[];
  currentYear: string;
}

export function OrgaoDetailClient({ members, availableYears, currentYear }: OrgaoDetailClientProps) {
  const params = useParams();
  const router = useRouter();
  const slug = decodeURIComponent(params.slug as string);

  const orgaoStats = useMemo(() => {
    const allStats = getStatsByOrgao(members);
    return allStats.get(slug);
  }, [members, slug]);

  if (!orgaoStats) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="mx-auto max-w-md text-center">
          <Info className="mx-auto mb-4 h-10 w-10 text-amber-500" />
          <h1 className="font-serif text-2xl font-bold text-navy">
            Dados indisponíveis para {slug} em {currentYear}
          </h1>
          <p className="mt-3 text-sm text-gray-500">
            O <a href="https://dadosjusbr.org" target="_blank" rel="noopener noreferrer" className="font-medium text-navy underline hover:text-red-primary">DadosJusBr</a> não
            possui dados deste órgão para o ano selecionado. Tente outro ano ou volte à lista de órgãos.
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            <Link
              href={`/orgao?ano=${currentYear}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-navy shadow-sm hover:bg-surface"
            >
              <ArrowLeft className="h-4 w-4" />
              Todos os órgãos
            </Link>
            {availableYears.length > 1 && (
              <select
                value={currentYear}
                onChange={(e) => router.push(`/orgao/${encodeURIComponent(slug)}?ano=${e.target.value}`)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-navy shadow-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
              >
                {availableYears.map((y) => (
                  <option key={y.value} value={y.value}>{y.label}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>
    );
  }

  const topMembers = orgaoStats.membros.slice(0, 10);
  const chartData = orgaoStats.membros.slice(0, 15).map((m) => ({
    nome: m.nome.split(" ").slice(0, 2).join(" "),
    total: m.remuneracaoTotal,
    base: m.remuneracaoBase,
    extras: m.remuneracaoTotal - m.remuneracaoBase,
  }));

  // Monthly average of highest earner for salary comparison
  const maiorRemuneracaoMensal = orgaoStats.maiorRemuneracao / 12;

  // State breakdown for federal MP organs
  const isFederalMP = ["MPF", "MPT", "MPM", "MPDFT"].includes(orgaoStats.orgao);
  const stateBreakdown = useMemo(() => {
    if (!isFederalMP) return [];
    const byState = new Map<string, { estado: string; membros: number; acimaTeto: number; totalAcima: number }>();
    for (const m of orgaoStats.membros) {
      let s = byState.get(m.estado);
      if (!s) {
        s = { estado: m.estado, membros: 0, acimaTeto: 0, totalAcima: 0 };
        byState.set(m.estado, s);
      }
      s.membros++;
      if (m.acimaTeto > 0) {
        s.acimaTeto++;
        s.totalAcima += m.acimaTeto;
      }
    }
    return Array.from(byState.values()).sort((a, b) => b.totalAcima - a.totalAcima);
  }, [orgaoStats.membros, isFederalMP]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href={`/orgao?ano=${currentYear}`}
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-navy"
        >
          <ArrowLeft className="h-4 w-4" />
          Todos os órgãos
        </Link>

        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="h-7 w-7 text-navy" />
            <div>
              <h1 className="font-serif text-2xl font-bold text-navy sm:text-3xl">
                {orgaoStats.orgao}
              </h1>
              <p className="text-sm text-gray-500">{orgaoStats.estado}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500">Ano:</span>
              <select
                value={currentYear}
                onChange={(e) => router.push(`/orgao/${encodeURIComponent(slug)}?ano=${e.target.value}`)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-navy shadow-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
              >
                {availableYears.map((y) => (
                  <option key={y.value} value={y.value}>
                    {y.label}
                  </option>
                ))}
              </select>
            </div>
            <ShareButtons
              title={`ExtraTeto — ${orgaoStats.orgao}`}
              text={`${orgaoStats.orgao}: ${orgaoStats.membrosAcimaTeto} membros acima do teto constitucional`}
            />
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
            <div className="mb-1 flex items-center gap-1.5">
              <Users className="h-4 w-4 text-blue-500" />
              <span className="text-[11px] text-gray-400">Total Membros</span>
            </div>
            <p className="text-xl font-bold text-navy">
              {formatNumber(orgaoStats.totalMembros)}
            </p>
          </div>
          <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
            <div className="mb-1 flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-red-500" />
              <span className="text-[11px] text-gray-400">Acima do Teto</span>
            </div>
            <p className="text-xl font-bold text-red-primary">
              {formatNumber(orgaoStats.membrosAcimaTeto)}
            </p>
            <p className="text-[11px] text-gray-400">
              {formatPercent(orgaoStats.percentualAcimaTeto)}
            </p>
          </div>
          <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
            <div className="mb-1 flex items-center gap-1.5">
              <BarChart3 className="h-4 w-4 text-amber" />
              <span className="text-[11px] text-gray-400">Total Acima do Teto (ano)</span>
            </div>
            <p className="text-xl font-bold text-red-primary">
              {formatCurrency(orgaoStats.totalAcimaTeto)}
            </p>
          </div>
          <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
            <div className="mb-1 flex items-center gap-1.5">
              <BarChart3 className="h-4 w-4 text-navy" />
              <span className="text-[11px] text-gray-400">Média Acima (ano)</span>
            </div>
            <p className="text-xl font-bold text-navy">
              {formatCurrency(orgaoStats.mediaAcimaTeto)}
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
            <h2 className="mb-3 font-serif text-base font-bold text-navy">
              Top 15 Remunerações
              <span className="ml-2 text-xs font-normal text-gray-400">(acumulado {currentYear})</span>
            </h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10, fill: "#94A3B8" }}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <YAxis
                    type="category"
                    dataKey="nome"
                    tick={{ fontSize: 10, fill: "#94A3B8" }}
                    width={90}
                  />
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value))}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <ReferenceLine
                    x={TETO_CONSTITUCIONAL * 12}
                    stroke="#DC2626"
                    strokeDasharray="6 3"
                    strokeWidth={1.5}
                    label={{ value: "Teto anual", fontSize: 10, fill: "#DC2626" }}
                  />
                  <Bar dataKey="base" stackId="a" fill="#3B82F6" name="Base" />
                  <Bar dataKey="extras" stackId="a" fill="#DC2626" name="Extras" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <SalaryComparison
            remuneracao={maiorRemuneracaoMensal}
            nome={`membro mais bem pago do ${orgaoStats.orgao} (média mensal)`}
          />
        </div>

        {isFederalMP && stateBreakdown.length > 1 && (
          <div className="mt-6 rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
            <h2 className="mb-3 font-serif text-base font-bold text-navy">
              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-red-primary" />
                Distribuição por Estado
                <span className="text-xs font-normal text-gray-400">(baseado na lotação)</span>
              </span>
            </h2>
            <div className="h-[28rem]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stateBreakdown.slice(0, 20)}
                  layout="vertical"
                  margin={{ left: 5, right: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10, fill: "#94A3B8" }}
                    tickFormatter={(v) => formatCurrency(v)}
                  />
                  <YAxis
                    type="category"
                    dataKey="estado"
                    tick={{ fontSize: 11, fill: "#1e293b", fontWeight: 600 }}
                    width={35}
                  />
                  <Tooltip
                    formatter={(value) => (value == null ? "-" : formatCurrency(value as number))}
                    labelFormatter={(label) => `Estado: ${label}`}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="totalAcima" fill="#DC2626" name="Total acima do teto" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-[11px] uppercase tracking-wider text-gray-400">
                    <th className="pb-2 pr-4">UF</th>
                    <th className="pb-2 pr-4 text-right">Membros</th>
                    <th className="pb-2 pr-4 text-right">Acima do teto</th>
                    <th className="pb-2 text-right">Total acima (ano)</th>
                  </tr>
                </thead>
                <tbody>
                  {stateBreakdown.map((s) => (
                    <tr key={s.estado} className="border-b border-gray-50">
                      <td className="py-1.5 pr-4 font-semibold text-navy">{s.estado}</td>
                      <td className="py-1.5 pr-4 text-right text-xs text-gray-500">{formatNumber(s.membros)}</td>
                      <td className="py-1.5 pr-4 text-right text-xs text-gray-500">
                        {formatNumber(s.acimaTeto)} ({formatPercent((s.acimaTeto / s.membros) * 100)})
                      </td>
                      <td className="py-1.5 text-right text-xs font-semibold text-red-primary">
                        {formatCurrency(s.totalAcima)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-6 rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-serif text-base font-bold text-navy">
              Membros do {orgaoStats.orgao}
              <span className="ml-2 text-xs font-normal text-gray-400">(acumulado {currentYear})</span>
            </h2>
            <Link
              href={`/?orgao=${encodeURIComponent(orgaoStats.orgao)}`}
              className="text-xs font-medium text-navy hover:underline"
            >
              Ver no ranking completo
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-[11px] uppercase tracking-wider text-gray-400">
                  <th className="pb-2 pr-4">#</th>
                  <th className="pb-2 pr-4">Nome</th>
                  <th className="pb-2 pr-4">Cargo</th>
                  {isFederalMP && <th className="pb-2 pr-4">UF</th>}
                  <th className="pb-2 pr-4 text-right">Base (ano)</th>
                  <th className="pb-2 pr-4 text-right">Total (ano)</th>
                  <th className="pb-2 text-right">Acima do Teto (ano)</th>
                </tr>
              </thead>
              <tbody>
                {topMembers.map((m, i) => (
                  <tr key={m.id} className="border-b border-gray-50">
                    <td className="py-2 pr-4 text-xs text-gray-400">{i + 1}</td>
                    <td className="py-2 pr-4 font-medium text-navy">
                      <span className="flex items-center gap-1.5">
                        {m.nome}
                        {m.remuneracaoBase === 0 && (
                          <span
                            title="Remuneração base informada como R$ 0,00 no DadosJusBr"
                            className="inline-flex items-center gap-0.5 rounded bg-amber-100 px-1 py-0.5 text-[9px] font-semibold text-amber-700"
                          >
                            Base R$ 0
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-xs text-gray-500">{m.cargo}</td>
                    {isFederalMP && <td className="py-2 pr-4 text-xs font-medium text-gray-500">{m.estado}</td>}
                    <td className="py-2 pr-4 text-right text-xs">
                      {formatCurrencyFull(m.remuneracaoBase)}
                    </td>
                    <td className="py-2 pr-4 text-right text-xs font-semibold text-navy">
                      {formatCurrencyFull(m.remuneracaoTotal)}
                    </td>
                    <td className="py-2 text-right text-xs font-semibold text-red-primary">
                      {m.acimaTeto > 0
                        ? `+${formatCurrencyFull(m.acimaTeto)}`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
