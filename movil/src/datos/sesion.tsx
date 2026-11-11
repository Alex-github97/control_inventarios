/**
 * La sesión del teléfono.
 *
 * Al ingresar, el servidor vincula el teléfono y entrega un token de acceso
 * (vive en memoria) y un secreto de renovación de un solo uso (va al almacén
 * cifrado). Cuando una petición recibe 401 se renueva una vez y se reintenta;
 * si el servidor dice que el teléfono ya no tiene acceso (revocado, clave
 * cambiada, 30 días sin uso), se borra todo y se vuelve al ingreso.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Platform } from 'react-native'
import Constants from 'expo-constants'
import { crearCliente, mensajeError, type ClienteApi } from '@compartido/api/cliente'
import type { components } from '@compartido/api/esquema'
import { API_BASE, VERSION_APP } from './config'
import { guardar, leer } from './almacen'

type RespuestaSesion = components['schemas']['SesionMovilResponse']
export type Usuario = RespuestaSesion['user']

const K_EMPRESA = 'tw.empresa'
const K_RENOVACION = 'tw.renovacion'
const K_USUARIO = 'tw.usuario'

interface Estado {
  cargando: boolean
  usuario: Usuario | null
  nombreEmpresa: string | null
  /** Empresa del último ingreso, para no volver a escribirla. */
  empresaRecordada: string | null
}

type Respuesta<T> = { data?: T; error?: unknown; response: Response }

interface ApiSesion extends Estado {
  ingresar: (empresa: string, usuario: string, clave: string) => Promise<void>
  salir: (motivo?: string) => Promise<void>
  /** Corre una llamada a la API; ante 401 renueva una vez y la repite. */
  llamar: <T>(fn: (api: ClienteApi) => Promise<Respuesta<T>>) => Promise<T>
  /** Por qué se cerró la sesión, para mostrarlo en el ingreso. */
  aviso: string | null
}

const Contexto = createContext<ApiSesion | null>(null)

// Una sola sesión por teléfono: el token vive en memoria del módulo (nunca en
// disco) y el cliente de la API lo lee en cada petición.
const credenciales = { token: null as string | null, empresa: null as string | null }
const api: ClienteApi = crearCliente({
  base: API_BASE, token: () => credenciales.token, empresa: () => credenciales.empresa, versionApp: VERSION_APP,
})
let renovando: Promise<boolean> | null = null

function datosDispositivo() {
  const nombre = Constants.deviceName ?? (Platform.OS === 'web' ? 'Navegador' : 'Teléfono Android')
  return { nombre, modelo: `${Platform.OS} ${Platform.Version ?? ''}`.trim(), version_app: VERSION_APP }
}

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Estado>({ cargando: true, usuario: null, nombreEmpresa: null, empresaRecordada: null })
  const [aviso, setAviso] = useState<string | null>(null)

  const aplicar = useCallback(async (r: RespuestaSesion, codigo: string) => {
    credenciales.token = r.access_token
    credenciales.empresa = codigo
    await guardar(K_RENOVACION, r.renovacion)
    await guardar(K_EMPRESA, codigo)
    await guardar(K_USUARIO, JSON.stringify({ user: r.user, empresa: r.empresa }))
    setEstado({ cargando: false, usuario: r.user, nombreEmpresa: r.empresa, empresaRecordada: codigo })
  }, [])

  const salir = useCallback(async (motivo?: string) => {
    credenciales.token = null
    await guardar(K_RENOVACION, null)
    await guardar(K_USUARIO, null)
    setAviso(motivo ?? null)
    setEstado(e => ({ ...e, cargando: false, usuario: null, nombreEmpresa: null }))
  }, [])

  /** true si quedó con un token nuevo. Una sola renovación a la vez. */
  const renovar = useCallback(async (): Promise<boolean> => {
    if (renovando) return renovando
    renovando = (async () => {
      const secreto = await leer(K_RENOVACION)
      const codigo = credenciales.empresa ?? await leer(K_EMPRESA)
      if (!secreto || !codigo) return false
      credenciales.empresa = codigo
      try {
        const { data, error, response } = await api.POST('/api/v1/movil/renovar', { body: { renovacion: secreto } })
        if (data) { await aplicar(data, codigo); return true }
        if (response.status === 401 || response.status === 403) await salir(mensajeError(error, 'Vuelva a ingresar.'))
        return false
      } catch {
        return false   // sin señal: se conserva el secreto para intentarlo después
      }
    })()
    try { return await renovando } finally { renovando = null }
  }, [aplicar, salir])

  // Al abrir: si el teléfono ya estaba vinculado se renueva en silencio. Sin
  // señal se entra con lo guardado y las pantallas avisan que no hay conexión.
  useEffect(() => {
    (async () => {
      // Pase lo que pase, el arranque termina: si algo de lo guardado no se
      // puede leer, se va al ingreso en vez de quedarse con la pantalla vacía.
      let codigo: string | null = null
      try {
        codigo = await leer(K_EMPRESA)
        const guardado = await leer(K_USUARIO)
        credenciales.empresa = codigo
        if (!guardado) { setEstado(e => ({ ...e, cargando: false, empresaRecordada: codigo })); return }
        const previo = JSON.parse(guardado) as { user: Usuario; empresa: string }
        if (!previo?.user) throw new Error('Sesión guardada incompleta')
        setEstado({ cargando: false, usuario: previo.user, nombreEmpresa: previo.empresa, empresaRecordada: codigo })
      } catch {
        await guardar(K_USUARIO, null).catch(() => {})
        await guardar(K_RENOVACION, null).catch(() => {})
        setEstado({ cargando: false, usuario: null, nombreEmpresa: null, empresaRecordada: codigo })
        return
      }
      await renovar().catch(() => false)
    })()
  }, [renovar])

  const ingresar = useCallback(async (codigo: string, usuario: string, clave: string) => {
    const c = codigo.trim().toLowerCase()
    credenciales.empresa = c
    setAviso(null)
    let r: Respuesta<RespuestaSesion>
    try {
      r = await api.POST('/api/v1/movil/sesion', {
        body: { username: usuario.trim(), password: clave, dispositivo: datosDispositivo() },
      })
    } catch {
      throw new Error('Sin conexión con el servidor. Revise la señal e intente de nuevo.')
    }
    if (!r.data) throw new Error(mensajeError(r.error, 'No se pudo ingresar.'))
    await aplicar(r.data, c)
  }, [aplicar])

  const llamar = useCallback(async <T,>(fn: (a: ClienteApi) => Promise<Respuesta<T>>): Promise<T> => {
    let r = await fn(api)
    if (r.response.status === 401 && await renovar()) r = await fn(api)
    if (r.data === undefined) throw new Error(mensajeError(r.error))
    return r.data
  }, [renovar])

  const valor = useMemo<ApiSesion>(() => ({ ...estado, ingresar, salir, llamar, aviso }),
    [estado, ingresar, salir, llamar, aviso])
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export function useSesion(): ApiSesion {
  const s = useContext(Contexto)
  if (!s) throw new Error('useSesion fuera de ProveedorSesion')
  return s
}
