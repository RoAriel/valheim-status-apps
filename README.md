![alt text](./cancel.png)
# Estado privado de Valheim

Panel privado y optimizado para móvil que permite comprobar desde fuera de casa el estado de un servidor dedicado de Valheim y de [Valheim Helper](https://valheim-helper.roariel.workers.dev/).

## Cómo funciona

- La interfaz estática se compila con Vite en `dist/`.
- Una Netlify Function resuelve el dominio DDNS del servidor.
- La Function consulta la API oficial de Steam utilizando el puerto de consulta de Valheim.
- La misma Function comprueba Valheim Helper mediante HTTPS.
- Una Netlify Edge Function protege todo el panel mediante usuario y contraseña.
- No es necesario instalar software en el PC del servidor ni abrir puertos adicionales.

El servidor de Valheim utiliza normalmente:

- `2456/UDP`: conexión del juego;
- `2457/UDP`: consulta y registro en Steam.

## Estados

- **Verde:** el servicio está accesible y Steam registra el servidor Valheim.
- **Amarillo:** una dependencia externa, DNS o Steam no permite confirmar el estado.
- **Rojo:** el servicio no responde o Steam confirma que el servidor no está registrado.

El panel se actualiza al abrirse, al pulsar **Actualizar** y automáticamente cada 60 segundos.

## Desarrollo local

Requisitos: Node.js 22 y pnpm 10.

```bash
pnpm install
pnpm dev
pnpm check
```

`pnpm build` genera la carpeta `dist/`. No es necesario guardar esa carpeta en Git: Netlify la genera en cada despliegue.

## Despliegue desde GitHub

1. En Netlify selecciona **Add new project → Import an existing project → GitHub**.
2. Selecciona este repositorio.
3. Netlify leerá automáticamente `netlify.toml`:
   - comando de compilación: `pnpm build`;
   - directorio de publicación: `dist`;
   - Functions: `netlify/functions`.
4. En **Project configuration → Environment variables**, configura:

| Variable | Contenido | Alcance |
| --- | --- | --- |
| `STATUS_USERNAME` | Usuario privado del panel | Functions |
| `STATUS_PASSWORD` | Contraseña larga, única y aleatoria | Functions |
| `VALHEIM_SERVER_HOST` | Dominio DDNS, sin protocolo ni puerto | Functions |
| `VALHEIM_QUERY_PORT` | Puerto de consulta de Steam, normalmente `2457` | Functions |

5. Ejecuta un nuevo despliegue después de crear o modificar las variables. Las Edge Functions reciben sus variables durante el despliegue.

No escribas contraseñas, tokens ni el dominio personal en el repositorio. `.env.example` contiene únicamente valores de ejemplo.

## Seguridad y privacidad

- La autenticación se ejecuta en el borde antes de servir la interfaz o la API.
- Las credenciales sólo existen como variables protegidas en Netlify.
- El navegador nunca recibe el hostname configurado: la consulta se ejecuta en una Function.
- Se aplican CSP, protección contra iframes, política de permisos, `no-referrer` y `noindex`.
- El panel no almacena jugadores, IP pública, nombre del mundo ni contraseña de Valheim.
- Todas las comprobaciones son salientes; no se añaden reglas al router o al Firewall de Windows.

## Resolución de problemas

- **Panel amarillo:** revisa los logs de la Function `status` en Netlify y comprueba el DDNS.
- **Servidor rojo pero permite jugar:** confirma que el puerto de consulta `2457/UDP` está publicado y que el servidor usa el backend de Steam.
- **Error 503 al abrir el panel:** faltan `STATUS_USERNAME` o `STATUS_PASSWORD`.
- **Cambio de contraseña:** actualiza la variable en Netlify y crea un nuevo despliegue.
