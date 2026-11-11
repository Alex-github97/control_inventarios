/**
 * TittanLite: datos de campo que funcionan sin señal.
 *
 *  - Catálogos (marcas, referencias, medidas, daños, novedades) y vehículos de la
 *    cuenta se guardan en el teléfono la última vez que hubo señal.
 *  - Cada inspección o disposición entra a una COLA local con un uuid. Al haber
 *    señal se envía; el servidor usa el uuid para no duplicarla si un envío se
 *    cortó a mitad. Las fotos se suben después, ya con el id que devolvió el
 *    servidor.
 *  - Lo que TittanWare rechaza no es un error de la app: queda registrado en
 *    TittanLite y el informe lo muestra. La cola solo guarda los envíos que el
 *    servidor no recibió.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { kv } from './kv'
import { useSesion } from './sesion'

export interface PosicionLite {
  codigo: string; label: string; eje: number; lado: string
  llanta: { neumatico_id: number; codigo: string; marca?: string | null; referencia?: string | null; medida?: string | null
    reencauches: number; profundidad_actual?: number | null; presion_recomendada?: number | null } | null
}
export interface VehiculoLite {
  activo_id: number; codigo: string; placa?: string | null; nombre?: string | null; tipo?: string | null
  marca?: string | null; linea?: string | null; odometro_actual?: number | null; posiciones: PosicionLite[]
  /** La última inspección TittanLite del vehículo, con sus llantas tal como se tomaron. */
  ultima_inspeccion?: {
    fecha: string; odometro?: number | null; inspector?: string | null
    llantas: Record<string, Partial<LlantaLite> & { novedades: string[] }>
  } | null
}
export interface CatalogosLite {
  marcas: string[]; referencias: { marca: string; referencia: string }[]; medidas: string[]
  danos: { id: number; codigo: string; nombre: string; ubicacion?: string | null; causa?: string | null }[]
  novedades: { clave: string; nombre: string }[]
  umbrales: { profundidad_minima: number; margen_alerta: number; presion_min: number; presion_max: number }
}
export interface FotoPendiente { uri: string; tipo: 'NUMERO' | 'DANO' | 'BANDA' | 'OTRA'; posicion?: string }
export interface LlantaLite {
  posicion: string; codigo?: string; marca?: string; referencia?: string; medida?: string; reencauches?: number | null
  profundidad_interna?: number | null; profundidad_central?: number | null; profundidad_externa?: number | null
  presion?: number | null; novedades: string[]; observacion?: string
}
export type Envio =
  | { uuid: string; tipo: 'inspeccion'; creado: string; placa: string; cuerpo: Record<string, unknown>; fotos: FotoPendiente[]; error?: string }
  | { uuid: string; tipo: 'disposicion'; creado: string; placa: string; cuerpo: Record<string, unknown>; fotos: FotoPendiente[]; error?: string }

const K_CAT = 'lite.catalogos'
const K_VEH = 'lite.vehiculos'
const K_COLA = 'lite.cola'
const K_HECHOS = 'lite.hechos'

export function nuevoUuid(): string {
  const r = () => Math.floor(Math.random() * 0x10000).toString(16).padStart(4, '0')
  return `${r()}${r()}-${r()}-4${r().slice(1)}-${r()}-${r()}${r()}${r()}`
}

async function leerJson<T>(k: string, porDefecto: T): Promise<T> {
  try { const v = await kv.leer(k); return v ? JSON.parse(v) as T : porDefecto } catch { return porDefecto }
}
const escribir = (k: string, v: unknown) => kv.escribir(k, JSON.stringify(v))

/** Catálogos y vehículos: de la red si hay señal, del teléfono si no. */
export function useDatosLite() {
  const { llamar } = useSesion()
  const [catalogos, setCatalogos] = useState<CatalogosLite | null>(null)
  const [vehiculos, setVehiculos] = useState<VehiculoLite[] | null>(null)
  const [enLinea, setEnLinea] = useState(true)
  const [cargando, setCargando] = useState(true)

  // Consultar no toca el estado; lo aplica el `.then` (así el efecto de montaje
  // no provoca renders en cascada).
  const consultar = useCallback(async () => {
    try {
      const [c, v] = await Promise.all([
        llamar(api => api.GET('/api/v1/eam/lite/catalogos')),
        llamar(api => api.GET('/api/v1/eam/lite/vehiculos', { params: { query: { limite: 500 } } })),
      ])
      await escribir(K_CAT, c); await escribir(K_VEH, v)
      return { c: c as CatalogosLite, v: v as VehiculoLite[], enLinea: true }
    } catch {
      return { c: await leerJson<CatalogosLite | null>(K_CAT, null), v: await leerJson<VehiculoLite[] | null>(K_VEH, null), enLinea: false }
    }
  }, [llamar])
  const aplicar = useCallback((p: ReturnType<typeof consultar>) => p.then(r => {
    if (r.c) setCatalogos(r.c)
    if (r.v) setVehiculos(r.v)
    setEnLinea(r.enLinea)
  }).finally(() => setCargando(false)), [])

  useEffect(() => {
    // Lo guardado aparece de inmediato; la red lo reemplaza cuando responde.
    leerJson<CatalogosLite | null>(K_CAT, null).then(c => { if (c) setCatalogos(prev => prev ?? c) })
    leerJson<VehiculoLite[] | null>(K_VEH, null).then(v => { if (v) setVehiculos(prev => prev ?? v) })
    aplicar(consultar())
  }, [aplicar, consultar])
  const actualizar = useCallback(() => { setCargando(true); aplicar(consultar()) }, [aplicar, consultar])
  return { catalogos, vehiculos, enLinea, cargando, actualizar }
}

export interface Hecho { uuid: string; tipo: Envio['tipo']; placa: string; fecha: string; estado: string; resumen: string }

/** La cola de envíos y lo último enviado. */
export function useCola() {
  const { llamar } = useSesion()
  const [cola, setCola] = useState<Envio[]>([])
  const [hechos, setHechos] = useState<Hecho[]>([])
  const [enviando, setEnviando] = useState(false)
  const [ultima, setUltima] = useState<string | null>(null)
  const ocupado = useRef(false)

  const cargar = useCallback(() => {
    leerJson<Envio[]>(K_COLA, []).then(setCola)
    leerJson<Hecho[]>(K_HECHOS, []).then(setHechos)
  }, [])
  useEffect(() => {
    leerJson<Envio[]>(K_COLA, []).then(setCola)
    leerJson<Hecho[]>(K_HECHOS, []).then(setHechos)
  }, [])

  const subirFoto = useCallback(async (f: FotoPendiente, destino: { inspeccion_llanta_id?: number; disposicion_id?: number }) => {
    const form = new FormData()
    // En Android, FormData acepta el archivo como { uri, name, type }.
    form.append('archivo', { uri: f.uri, name: 'foto.jpg', type: 'image/jpeg' } as unknown as Blob)
    form.append('tipo', f.tipo)
    if (destino.inspeccion_llanta_id) form.append('inspeccion_llanta_id', String(destino.inspeccion_llanta_id))
    if (destino.disposicion_id) form.append('disposicion_id', String(destino.disposicion_id))
    await llamar(api => api.POST('/api/v1/eam/lite/fotos', { body: form as never, bodySerializer: (b: unknown) => b as FormData }))
  }, [llamar])

  /** Envía todo lo pendiente, uno por uno. Lo que no salga se queda para la próxima. */
  const sincronizar = useCallback(async () => {
    if (ocupado.current) return
    ocupado.current = true
    setEnviando(true)
    try {
      const pendientes = await leerJson<Envio[]>(K_COLA, [])
      const quedan: Envio[] = []
      const nuevos: Hecho[] = []
      for (const e of pendientes) {
        try {
          if (e.tipo === 'inspeccion') {
            const r = await llamar(api => api.POST('/api/v1/eam/lite/inspecciones', { body: e.cuerpo as never })) as {
              estado_sync: string; llantas: { id: number; posicion: string; sync_estado: string }[] }
            for (const f of e.fotos) {
              const linea = r.llantas.find(l => l.posicion === f.posicion)
              if (linea) await subirFoto(f, { inspeccion_llanta_id: linea.id }).catch(() => {})
            }
            const sinc = r.llantas.filter(l => l.sync_estado === 'SINCRONIZADA').length
            nuevos.push({ uuid: e.uuid, tipo: e.tipo, placa: e.placa, fecha: new Date().toISOString(), estado: r.estado_sync,
              resumen: `${r.llantas.length} llantas · ${sinc} en TittanWare` })
          } else {
            const r = await llamar(api => api.POST('/api/v1/eam/lite/disposiciones', { body: e.cuerpo as never })) as {
              id: number; sync_estado: string; sync_motivo?: string | null }
            for (const f of e.fotos) await subirFoto(f, { disposicion_id: r.id }).catch(() => {})
            nuevos.push({ uuid: e.uuid, tipo: e.tipo, placa: e.placa, fecha: new Date().toISOString(), estado: r.sync_estado,
              resumen: r.sync_motivo ?? 'Disposición registrada' })
          }
        } catch (err) {
          const mensaje = err instanceof Error ? err.message : 'Sin conexión'
          quedan.push({ ...e, error: /conexi|network|fetch/i.test(mensaje) ? undefined : mensaje })
        }
      }
      await escribir(K_COLA, quedan)
      const todos = [...nuevos, ...await leerJson<Hecho[]>(K_HECHOS, [])].slice(0, 50)
      await escribir(K_HECHOS, todos)
      setCola(quedan); setHechos(todos)
      if (!quedan.length) setUltima(new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }))
    } finally {
      ocupado.current = false
      setEnviando(false)
    }
  }, [llamar, subirFoto])

  const agregar = useCallback(async (e: Envio) => {
    const actual = await leerJson<Envio[]>(K_COLA, [])
    await escribir(K_COLA, [...actual, e])
    setCola([...actual, e])
    sincronizar()
  }, [sincronizar])

  return { cola, hechos, enviando, ultima, agregar, sincronizar, recargar: cargar }
}

/** Estado de una llanta por su profundidad mínima, con los umbrales de la cuenta. */
export function estadoPorProfundidad(mm: number | null | undefined, u?: CatalogosLite['umbrales'] | null): 'critica' | 'moderada' | 'buena' | null {
  if (mm == null) return null
  const minimo = u?.profundidad_minima ?? 3
  if (mm <= minimo) return 'critica'
  return mm <= minimo + (u?.margen_alerta ?? 2) ? 'moderada' : 'buena'
}
