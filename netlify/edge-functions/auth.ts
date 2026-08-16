import type { Config, Context } from "@netlify/edge-functions";

function safeEqual(left: string, right: string): boolean {
  const encoder = new TextEncoder();
  const a = encoder.encode(left);
  const b = encoder.encode(right);
  if (a.length !== b.length) return false;

  let difference = 0;
  for (let index = 0; index < a.length; index += 1) {
    difference |= (a[index] ?? 0) ^ (b[index] ?? 0);
  }
  return difference === 0;
}

function decodeBasicCredentials(value: string): string {
  const bytes = Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function protectedResponse(context: Context): Promise<Response> {
  const response = await context.next();
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", headers.get("Cache-Control") ?? "no-store");
  headers.set("Content-Security-Policy", "default-src 'self'; connect-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export default async (request: Request, context: Context): Promise<Response | undefined> => {
  const username = Netlify.env.get("STATUS_USERNAME");
  const password = Netlify.env.get("STATUS_PASSWORD");
  if (!username || !password) {
    return new Response("La autenticación del panel no está configurada.", { status: 503 });
  }

  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Basic ")) {
    try {
      const decoded = decodeBasicCredentials(authorization.slice(6));
      const separator = decoded.indexOf(":");
      const suppliedUsername = separator >= 0 ? decoded.slice(0, separator) : "";
      const suppliedPassword = separator >= 0 ? decoded.slice(separator + 1) : "";
      if (safeEqual(suppliedUsername, username) && safeEqual(suppliedPassword, password)) {
        return protectedResponse(context);
      }
    } catch {
      // A malformed authorization header is handled as an authentication failure.
    }
  }

  return new Response("Autenticación necesaria", {
    status: 401,
    headers: {
      "Cache-Control": "no-store",
      "WWW-Authenticate": 'Basic realm="Estado de Valheim", charset="UTF-8"',
    },
  });
};

export const config: Config = {
  path: "/*",
};
