import { resolve4 } from "node:dns/promises";
import type { Config } from "@netlify/functions";
import { findValheimServer, isConclusiveSteamResponse } from "./lib/steam.ts";

const HELPER_URL = "https://valheim-helper.roariel.workers.dev/";

type Health = "healthy" | "degraded" | "offline";

interface ServiceHealth {
  status: Health;
  checkedAt: string;
  lastSeenAt: string | null;
  latencyMs: number | null;
  message: string;
}

async function checkHelper(now: number): Promise<ServiceHealth> {
  const startedAt = performance.now();
  const checkedAt = new Date(now).toISOString();

  try {
    const response = await fetch(HELPER_URL, {
      headers: { Accept: "text/html", "User-Agent": "ValheimStatusMonitor/1.0" },
      signal: AbortSignal.timeout(5_000),
    });
    await response.body?.cancel();
    const latencyMs = Math.round(performance.now() - startedAt);

    if (!response.ok) {
      return {
        status: "offline",
        checkedAt,
        lastSeenAt: null,
        latencyMs,
        message: `El Helper respondió con HTTP ${response.status}`,
      };
    }

    return {
      status: latencyMs > 3_000 ? "degraded" : "healthy",
      checkedAt,
      lastSeenAt: checkedAt,
      latencyMs,
      message: latencyMs > 3_000 ? "Disponible, pero respondió lentamente" : "Aplicación accesible desde Internet",
    };
  } catch {
    return {
      status: "offline",
      checkedAt,
      lastSeenAt: null,
      latencyMs: Math.round(performance.now() - startedAt),
      message: "No fue posible conectar con el Helper",
    };
  }
}

async function checkValheim(now: number): Promise<ServiceHealth> {
  const checkedAt = new Date(now).toISOString();
  const startedAt = performance.now();
  const hostname = process.env.VALHEIM_SERVER_HOST?.trim();
  const configuredPort = Number(process.env.VALHEIM_QUERY_PORT ?? "2457");

  if (!hostname || !Number.isInteger(configuredPort) || configuredPort < 1 || configuredPort > 65_535) {
    return {
      status: "degraded",
      checkedAt,
      lastSeenAt: null,
      latencyMs: null,
      message: "La dirección del servidor no está configurada correctamente",
    };
  }

  try {
    const addresses = await resolve4(hostname);
    if (addresses.length === 0) throw new Error("El dominio no tiene direcciones IPv4");

    let hadConclusiveResponse = false;
    for (const address of addresses) {
      const steamUrl = new URL("https://api.steampowered.com/ISteamApps/GetServersAtAddress/v1/");
      steamUrl.searchParams.set("addr", `${address}:${configuredPort}`);
      const response = await fetch(steamUrl, {
        headers: { Accept: "application/json", "User-Agent": "ValheimStatusMonitor/1.0" },
        signal: AbortSignal.timeout(5_000),
      });
      if (!response.ok) continue;

      const payload: unknown = await response.json();
      hadConclusiveResponse ||= isConclusiveSteamResponse(payload);
      if (findValheimServer(payload, configuredPort)) {
        return {
          status: "healthy",
          checkedAt,
          lastSeenAt: checkedAt,
          latencyMs: Math.round(performance.now() - startedAt),
          message: "Servidor registrado y accesible mediante Steam",
        };
      }
    }

    return {
      status: hadConclusiveResponse ? "offline" : "degraded",
      checkedAt,
      lastSeenAt: null,
      latencyMs: Math.round(performance.now() - startedAt),
      message: hadConclusiveResponse
        ? "Steam no encuentra el servidor en su puerto de consulta"
        : "Steam no pudo confirmar el estado del servidor",
    };
  } catch {
    return {
      status: "degraded",
      checkedAt,
      lastSeenAt: null,
      latencyMs: Math.round(performance.now() - startedAt),
      message: "La comprobación de DNS o Steam no está disponible",
    };
  }
}

export default async (request: Request): Promise<Response> => {
  if (request.method !== "GET") {
    return Response.json({ error: "Método no permitido" }, { status: 405 });
  }

  const now = Date.now();
  const [helper, server] = await Promise.all([checkHelper(now), checkValheim(now)]);

  return Response.json(
    { checkedAt: new Date(now).toISOString(), helper, server },
    {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
        "Content-Type": "application/json; charset=utf-8",
      },
    },
  );
};

export const config: Config = {
  path: "/api/status",
};
