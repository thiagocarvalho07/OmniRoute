"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Card } from "@/shared/components";
import ProviderIcon from "@/shared/components/ProviderIcon";

export interface ComboStepModel {
  id?: string;
  kind?: string;
  model: string;
  providerId?: string;
  weight?: number;
}

export interface ComboItem {
  id: string;
  name: string;
  strategy?: string;
  models?: ComboStepModel[];
  isActive?: boolean;
}

export interface ComboMetricData {
  totalRequests: number;
  totalSuccesses: number;
  totalFailures: number;
  totalFallbacks: number;
  avgLatencyMs: number;
  successRate: number;
  fallbackRate: number;
  lastUsedAt: string | null;
  strategy?: string;
  byModel?: Record<
    string,
    {
      requests: number;
      successes: number;
      failures: number;
      avgLatencyMs: number;
      successRate: number;
      lastStatus?: "ok" | "error" | null;
      lastUsedAt?: string | null;
    }
  >;
}

const FLEET_COMBOS = [
  "fleet-strategy",
  "fleet-operation",
  "fleet-reasoning",
  "fleet-background",
];

const FLEET_METADATA: Record<
  string,
  { label: string; icon: string; accentColor: string; roleDesc: string }
> = {
  "fleet-strategy": {
    label: "Strategy & Planning",
    icon: "psychology",
    accentColor: "from-indigo-500/20 via-indigo-500/5 to-transparent text-indigo-400 border-indigo-500/30",
    roleDesc: "Decisões estratégicas, orquestração e síntese de alto nível",
  },
  "fleet-operation": {
    label: "Operations & Execution",
    icon: "terminal",
    accentColor: "from-rose-500/20 via-rose-500/5 to-transparent text-rose-400 border-rose-500/30",
    roleDesc: "Execução direta de tarefas, integrações e comandos",
  },
  "fleet-reasoning": {
    label: "Deep Reasoning",
    icon: "smart_toy",
    accentColor: "from-cyan-500/20 via-cyan-500/5 to-transparent text-cyan-400 border-cyan-500/30",
    roleDesc: "Análise profunda de código, depuração e lógica complexa",
  },
  "fleet-background": {
    label: "Background Routine",
    icon: "sync",
    accentColor: "from-emerald-500/20 via-emerald-500/5 to-transparent text-emerald-400 border-emerald-500/30",
    roleDesc: "Manutenção, sincronização de dados e tarefas assíncronas",
  },
};

function parseModelString(raw: string): { providerId: string; modelName: string } {
  if (!raw) return { providerId: "openai", modelName: "unknown" };
  const parts = raw.split("/");
  if (parts.length > 1) {
    return { providerId: parts[0], modelName: parts.slice(1).join("/") };
  }
  return { providerId: "openai", modelName: raw };
}

function formatRelativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "Sem atividade recente";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "Sem atividade recente";
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 60) return "Agora mesmo";
  if (diffSec < 3600) return `há ${Math.floor(diffSec / 60)} min`;
  if (diffSec < 86400) return `há ${Math.floor(diffSec / 3600)} h`;
  return date.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
}

export function HomeFleetStatusSection() {
  const t = useTranslations("home");
  const [combos, setCombos] = useState<ComboItem[]>([]);
  const [metrics, setMetrics] = useState<Record<string, ComboMetricData>>({});
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filterMode, setFilterMode] = useState<"fleet" | "all">("fleet");

  const loadData = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const [combosRes, metricsRes] = await Promise.all([
        fetch("/api/combos?limit=50", { cache: "no-store" }),
        fetch("/api/combos/metrics", { cache: "no-store" }),
      ]);

      if (combosRes.ok) {
        const combosJson = await combosRes.json();
        setCombos(combosJson.combos || []);
      }

      if (metricsRes.ok) {
        const metricsJson = await metricsRes.json();
        setMetrics(metricsJson.metrics || {});
      }

      setLastUpdated(new Date());
    } catch (e) {
      console.error("Failed to load combo metrics:", e);
    } finally {
      setLoading(false);
      if (isManual) setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      // Pause polling if document is hidden to conserve resources
      if (typeof document !== "undefined" && document.hidden) return;
      loadData();
    }, 10000);
    return () => clearInterval(interval);
  }, [loadData]);

  const displayedCombos = useMemo(() => {
    if (filterMode === "fleet") {
      const fleet = combos.filter((c) => FLEET_COMBOS.includes(c.name));
      // Se não houver combos da frota ainda cadastrados, exibe todos para não ficar vazio
      return fleet.length > 0 ? fleet : combos;
    }
    return combos;
  }, [combos, filterMode]);

  return (
    <Card className="flex flex-col gap-5 border-border">
      {/* Header com título, filtros e botão de refresh */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0">
            <span className="material-symbols-outlined text-[22px]">alt_route</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-text-main">
                Frota Hermes · Inteligência & Combos
              </h2>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium tracking-wide uppercase bg-primary/10 text-primary border border-primary/20">
                Live Cascade
              </span>
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Cadeia de resiliência e cascata de fallbacks dos modelos em tempo real
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Alternador de filtro */}
          <div className="inline-flex rounded-lg border border-border bg-bg-subtle p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setFilterMode("fleet")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                filterMode === "fleet"
                  ? "bg-surface text-text-main shadow-xs"
                  : "text-text-muted hover:text-text-main"
              }`}
            >
              Frota Hermes
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("all")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                filterMode === "all"
                  ? "bg-surface text-text-main shadow-xs"
                  : "text-text-muted hover:text-text-main"
              }`}
            >
              Todos ({combos.length})
            </button>
          </div>

          {/* Botão de atualização manual */}
          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={isRefreshing}
            title={lastUpdated ? `Última sincronização: ${lastUpdated.toLocaleTimeString()}` : "Atualizar"}
            className="size-8 rounded-lg border border-border bg-surface flex items-center justify-center text-text-muted hover:text-text-main hover:bg-bg-subtle transition-colors"
          >
            <span
              className={`material-symbols-outlined text-[16px] ${
                isRefreshing ? "animate-spin text-primary" : ""
              }`}
            >
              refresh
            </span>
          </button>

          <Link
            href="/dashboard/combos"
            prefetch={false}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-text-muted hover:text-text-main hover:bg-bg-subtle transition-colors"
          >
            <span>Gerenciar</span>
            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </Link>
        </div>
      </div>

      {/* Grid de Cards dos Combos */}
      {loading && displayedCombos.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-44 rounded-xl border border-border bg-bg-subtle animate-pulse"
            />
          ))}
        </div>
      ) : displayedCombos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <span className="material-symbols-outlined text-text-muted text-[32px]">
            route
          </span>
          <p className="text-sm font-medium text-text-main mt-2">
            Nenhum combo configurado
          </p>
          <p className="text-xs text-text-muted mt-1">
            Crie combos com fallback em cascata para garantir alta disponibilidade.
          </p>
          <Link
            href="/dashboard/combos"
            prefetch={false}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-white mt-4 hover:bg-primary-hover transition-colors"
          >
            <span className="material-symbols-outlined text-[14px]">add</span>
            Criar Primeiro Combo
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedCombos.map((combo) => {
            const metric = metrics[combo.name];
            const meta = FLEET_METADATA[combo.name] || {
              label: combo.name,
              icon: "alt_route",
              accentColor: "from-primary/20 via-primary/5 to-transparent text-primary border-primary/30",
              roleDesc: "Roteamento inteligente de inferência multi-provedor",
            };

            const totalReqs = metric?.totalRequests ?? 0;
            const successRate = metric?.successRate ?? 0;
            const avgLatency = metric?.avgLatencyMs ?? 0;
            const fallbacks = metric?.totalFallbacks ?? 0;

            // Determina status de saúde
            let healthState: "healthy" | "warning" | "critical" | "idle" = "idle";
            if (totalReqs > 0) {
              if (successRate >= 95) healthState = "healthy";
              else if (successRate >= 80) healthState = "warning";
              else healthState = "critical";
            }

            const models = combo.models || [];

            return (
              <div
                key={combo.id || combo.name}
                className="group relative flex flex-col justify-between rounded-xl border border-border bg-surface p-4 transition-all hover:border-primary/40 hover:shadow-sm"
              >
                {/* Faixa superior sutil decorativa */}
                <div
                  className={`absolute inset-x-0 top-0 h-1 rounded-t-xl bg-gradient-to-r ${meta.accentColor}`}
                />

                <div className="flex flex-col gap-3">
                  {/* Cabeçalho do Card */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="size-8 rounded-lg bg-bg-subtle border border-border flex items-center justify-center text-text-main shrink-0">
                        <span className="material-symbols-outlined text-[18px]">
                          {meta.icon}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/dashboard/combos/${combo.id}`}
                            prefetch={false}
                            className="font-semibold text-sm text-text-main hover:text-primary transition-colors truncate"
                          >
                            {combo.name}
                          </Link>
                          {combo.isActive === false && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-bg-subtle text-text-muted border border-border">
                              Inativo
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-text-muted truncate">
                          {meta.roleDesc}
                        </p>
                      </div>
                    </div>

                    {/* Badge de Saúde */}
                    <div className="shrink-0 flex items-center gap-1.5">
                      {healthState === "healthy" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          100% OK
                        </span>
                      )}
                      {healthState === "warning" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <span className="size-1.5 rounded-full bg-amber-400" />
                          Degradado
                        </span>
                      )}
                      {healthState === "critical" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                          <span className="size-1.5 rounded-full bg-red-400" />
                          Falhas
                        </span>
                      )}
                      {healthState === "idle" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-bg-subtle text-text-muted border border-border">
                          <span className="size-1.5 rounded-full bg-text-muted/40" />
                          Aguardando
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Pipeline de Cascata de Modelos */}
                  <div className="rounded-lg border border-border/60 bg-bg-subtle/50 p-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-2 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px]">
                        account_tree
                      </span>
                      Ordem de Prioridade & Fallbacks ({models.length} nós)
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {models.slice(0, 3).map((step, idx) => {
                        const { providerId, modelName } = parseModelString(step.model);
                        const isPrimary = idx === 0;
                        const modelMetric = metric?.byModel?.[step.model];
                        const hasErrors =
                          modelMetric && modelMetric.failures > 0;

                        return (
                          <div
                            key={step.id || `${step.model}-${idx}`}
                            className="flex items-center justify-between text-xs py-1 px-2 rounded-md bg-surface border border-border/40"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={`size-4 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0 ${
                                  isPrimary
                                    ? "bg-primary/20 text-primary"
                                    : "bg-bg-subtle text-text-muted"
                               刺激}`}
                              >
                                {idx + 1}
                              </span>
                              <ProviderIcon providerId={providerId} size={14} type="color" />
                              <span className="font-mono text-[11px] text-text-main truncate">
                                {modelName}
                              </span>
                              <span className="text-[10px] text-text-muted">
                                ({providerId})
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 text-[10px]">
                              {isPrimary && (
                                <span className="text-[9px] uppercase tracking-wide text-primary font-semibold">
                                  Primário
                                </span>
                              )}
                              {!isPrimary && (
                                <span className="text-[9px] uppercase tracking-wide text-text-muted">
                                  Fallback #{idx}
                                </span>
                              )}
                              {hasErrors && (
                                <span
                                  className="text-red-400 flex items-center gap-0.5"
                                  title={`${modelMetric.failures} falhas neste nó`}
                                >
                                  <span className="material-symbols-outlined text-[12px]">
                                    warning
                                  </span>
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {models.length > 3 && (
                        <p className="text-[10px] text-center text-text-muted pt-0.5">
                          + {models.length - 3} modelos na esteira de redundância
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Barra de Métricas Rápidas */}
                  <div className="grid grid-cols-4 gap-2 pt-1 border-t border-border/60">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-text-muted">Requisições</span>
                      <span className="text-xs font-semibold text-text-main font-mono">
                        {totalReqs}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-text-muted">Sucesso</span>
                      <span className="text-xs font-semibold text-emerald-400 font-mono">
                        {totalReqs > 0 ? `${successRate}%` : "—"}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-text-muted">Latência</span>
                      <span className="text-xs font-semibold text-text-main font-mono">
                        {avgLatency > 0 ? `${avgLatency}ms` : "—"}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-text-muted">Fallbacks</span>
                      <span
                        className={`text-xs font-semibold font-mono ${
                          fallbacks > 0 ? "text-amber-400" : "text-text-muted"
                        }`}
                      >
                        {fallbacks}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Rodapé do Card com Ações Rápidas */}
                <div className="flex items-center justify-between pt-3 mt-2 border-t border-border/40 text-[11px]">
                  <span className="text-text-muted">
                    {formatRelativeTime(metric?.lastUsedAt)}
                  </span>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/dashboard/logs?search=${encodeURIComponent(combo.name)}`}
                      prefetch={false}
                      className="text-text-muted hover:text-text-main flex items-center gap-1 hover:underline"
                    >
                      <span className="material-symbols-outlined text-[12px]">
                        receipt_long
                      </span>
                      Logs
                    </Link>
                    <span className="text-border">·</span>
                    <Link
                      href={`/dashboard/combos/${combo.id}`}
                      prefetch={false}
                      className="text-primary hover:text-primary-hover font-medium flex items-center gap-0.5 hover:underline"
                    >
                      Editar
                      <span className="material-symbols-outlined text-[12px]">
                        chevron_right
                      </span>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
