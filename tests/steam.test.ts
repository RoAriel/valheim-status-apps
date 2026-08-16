import { describe, expect, it } from "vitest";
import { findValheimServer, isConclusiveSteamResponse } from "../netlify/functions/lib/steam.ts";

const activeResponse = {
  response: {
    success: true,
    servers: [
      {
        addr: "203.0.113.10:2457",
        appid: 892970,
        gameport: 2456,
        secure: false,
      },
    ],
  },
};

describe("Steam server response", () => {
  it("reconoce un servidor Valheim en el puerto de consulta", () => {
    expect(findValheimServer(activeResponse, 2457)).toMatchObject({ appid: 892970, gameport: 2456 });
  });

  it("rechaza otro puerto", () => {
    expect(findValheimServer(activeResponse, 2456)).toBeNull();
  });

  it("rechaza otra aplicación", () => {
    const payload = structuredClone(activeResponse);
    payload.response.servers[0]!.appid = 123;
    expect(findValheimServer(payload, 2457)).toBeNull();
  });

  it("distingue una respuesta concluyente sin servidores", () => {
    expect(isConclusiveSteamResponse({ response: { success: true, servers: [] } })).toBe(true);
  });

  it("rechaza respuestas incompletas", () => {
    expect(isConclusiveSteamResponse({ response: { success: false } })).toBe(false);
    expect(findValheimServer(null, 2457)).toBeNull();
  });
});
