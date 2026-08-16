export type Health = "healthy" | "degraded" | "offline" | "checking";

export interface ServiceStatus {
  status: Health;
  checkedAt: string;
  lastSeenAt: string | null;
  latencyMs: number | null;
  message: string;
}

export interface StatusResponse {
  checkedAt: string;
  helper: ServiceStatus;
  server: ServiceStatus;
}

export const STATUS_LABELS: Record<Health, string> = {
  healthy: "Operativo",
  degraded: "Atención",
  offline: "Desconectado",
  checking: "Comprobando",
};

export function formatTimestamp(value: string | null): string {
  if (!value) return "Sin comprobaciones todavía";

  return new Intl.DateTimeFormat("es", {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date(value));
}

export function formatRelative(value: string | null, now = Date.now()): string {
  if (!value) return "nunca";

  const seconds = Math.max(0, Math.round((now - new Date(value).getTime()) / 1000));
  if (seconds < 10) return "hace unos segundos";
  if (seconds < 60) return `hace ${seconds} s`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  return `hace ${hours} h`;
}
