export const VALHEIM_APP_ID = 892970;

export interface SteamServer {
  addr?: unknown;
  appid?: unknown;
  gameport?: unknown;
  secure?: unknown;
}

interface SteamApiResponse {
  response?: {
    success?: unknown;
    servers?: unknown;
  };
}

export function findValheimServer(payload: unknown, queryPort: number): SteamServer | null {
  if (typeof payload !== "object" || payload === null) return null;

  const response = (payload as SteamApiResponse).response;
  if (response?.success !== true || !Array.isArray(response.servers)) return null;

  return response.servers.find((server): server is SteamServer => {
    if (typeof server !== "object" || server === null) return false;
    const candidate = server as SteamServer;
    const addressPort = typeof candidate.addr === "string"
      ? Number(candidate.addr.slice(candidate.addr.lastIndexOf(":") + 1))
      : Number.NaN;

    return candidate.appid === VALHEIM_APP_ID && addressPort === queryPort;
  }) ?? null;
}

export function isConclusiveSteamResponse(payload: unknown): boolean {
  if (typeof payload !== "object" || payload === null) return false;
  const response = (payload as SteamApiResponse).response;
  return response?.success === true && Array.isArray(response.servers);
}
