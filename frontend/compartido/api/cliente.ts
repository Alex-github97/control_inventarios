/**
 * Cliente tipado de la API de TittanWare, para el portal y la app móvil.
 *
 * Los tipos salen de `esquema.d.ts`, generado del OpenAPI del servidor
 * (`npm run tipos-api`); no se escriben a mano. Cada llamada queda tipada por
 * ruta y método: si el servidor cambia un campo que se usa, no compila.
 */
import createClient, { type Middleware } from 'openapi-fetch'
import type { paths } from './esquema'

export type RutasApi = paths

export interface OpcionesCliente {
  /** Base de la API, p. ej. https://app.tittanware.com/api/v1 */
  base: string
  /** El token de acceso vigente (o null sin sesión). */
  token: () => string | null | Promise<string | null>
  /** El código de la empresa, para el encabezado X-Cliente. */
  empresa?: () => string | null | Promise<string | null>
  /** Versión de la app móvil: el servidor rechaza con 426 las anteriores a la mínima. */
  versionApp?: string
}

export function crearCliente(o: OpcionesCliente) {
  const cliente = createClient<paths>({ baseUrl: o.base })
  const credenciales: Middleware = {
    async onRequest({ request }) {
      const t = await o.token()
      if (t) request.headers.set('Authorization', `Bearer ${t}`)
      const e = o.empresa ? await o.empresa() : null
      if (e) request.headers.set('X-Cliente', e)
      if (o.versionApp) request.headers.set('X-App-Version', o.versionApp)
      return request
    },
  }
  cliente.use(credenciales)
  return cliente
}

export type ClienteApi = ReturnType<typeof crearCliente>

/** El mensaje que el servidor da en `detail`, o uno por defecto. */
export function mensajeError(error: unknown, porDefecto = 'No se pudo completar la operación'): string {
  const d = (error as { detail?: unknown } | null)?.detail
  return typeof d === 'string' ? d : Array.isArray(d) ? 'Revise los datos enviados' : porDefecto
}
