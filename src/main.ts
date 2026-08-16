import "./styles.css";
import {
  formatRelative,
  formatTimestamp,
  STATUS_LABELS,
  type Health,
  type ServiceStatus,
  type StatusResponse,
} from "./status.ts";

function getAppRoot(): HTMLDivElement {
  const root = document.querySelector<HTMLDivElement>("#app");
  if (!root) throw new Error("No se encontró el contenedor principal");
  return root;
}

const app = getAppRoot();

const initialService = (message: string): ServiceStatus => ({
  status: "checking",
  checkedAt: new Date().toISOString(),
  lastSeenAt: null,
  latencyMs: null,
  message,
});

let current: StatusResponse = {
  checkedAt: new Date().toISOString(),
  helper: initialService("Consultando el servicio público"),
  server: initialService("Esperando el último latido"),
};

function iconFor(status: Health): string {
  if (status === "healthy") return "✓";
  if (status === "degraded") return "!";
  if (status === "offline") return "×";
  return "…";
}

function serviceCard(id: string, title: string, subtitle: string, service: ServiceStatus): string {
  const detail = service.latencyMs === null ? service.message : `${service.message} · ${service.latencyMs} ms`;
  return `
    <article class="status-card" aria-labelledby="${id}-title">
      <div class="service-heading">
        <div>
          <p class="eyebrow">${subtitle}</p>
          <h2 id="${id}-title">${title}</h2>
        </div>
        <div class="signal signal--${service.status}" role="img" aria-label="${STATUS_LABELS[service.status]}">
          <span>${iconFor(service.status)}</span>
        </div>
      </div>
      <div class="state-line">
        <span class="state-dot state-dot--${service.status}" aria-hidden="true"></span>
        <strong>${STATUS_LABELS[service.status]}</strong>
      </div>
      <p class="detail">${detail}</p>
      <dl>
        <div>
          <dt>Último check</dt>
          <dd title="${formatTimestamp(service.checkedAt)}">${formatRelative(service.checkedAt)}</dd>
        </div>
        <div>
          <dt>Última conexión</dt>
          <dd title="${formatTimestamp(service.lastSeenAt)}">${formatRelative(service.lastSeenAt)}</dd>
        </div>
      </dl>
    </article>`;
}

function render(isRefreshing = false): void {
  app.innerHTML = `
    <main>
      <header class="hero">
        <div>
          <p class="brand"><span aria-hidden="true">ᚢ</span> VALHEIM</p>
          <h1>Estado del servidor</h1>
          <p class="intro">Una vista rápida de tus servicios, estés donde estés.</p>
        </div>
        <button id="refresh" type="button" ${isRefreshing ? "disabled" : ""}>
          <span aria-hidden="true" class="refresh-icon ${isRefreshing ? "is-spinning" : ""}">↻</span>
          ${isRefreshing ? "Comprobando" : "Actualizar"}
        </button>
      </header>

      <section class="status-grid" aria-live="polite" aria-busy="${isRefreshing}">
        ${serviceCard("server", "Servidor Valheim", "Mundo dedicado", current.server)}
        ${serviceCard("helper", "Valheim Helper", "Herramienta web", current.helper)}
      </section>

      <footer>
        <span class="privacy"><span aria-hidden="true">◆</span> Panel privado</span>
        <span>Actualización automática cada 60 segundos</span>
      </footer>
    </main>`;

  document.querySelector<HTMLButtonElement>("#refresh")?.addEventListener("click", () => void refresh());
}

async function refresh(): Promise<void> {
  render(true);
  try {
    const response = await fetch("/api/status", {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    current = (await response.json()) as StatusResponse;
  } catch {
    const checkedAt = new Date().toISOString();
    current = {
      checkedAt,
      helper: { ...initialService("No se pudo consultar el panel"), status: "offline", checkedAt },
      server: { ...initialService("No se pudo consultar el panel"), status: "offline", checkedAt },
    };
  }
  render(false);
}

render();
void refresh();
window.setInterval(() => void refresh(), 60_000);
