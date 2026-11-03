/**
 * Catálogo del sistema de diseño.
 *
 * Una pantalla para validar con el usuario el nivel visual antes de construir
 * las pantallas reales: cada componente en uso, en claro y en oscuro. Los
 * datos son de muestra y así se rotulan; esta pantalla no habla con el servidor.
 */
import { useState } from 'react'
import { View } from 'react-native'
import {
  Bell, ClipboardCheck, Fuel, Gauge, Moon, Search, Sun, Truck, Wrench, AlertTriangle, PackageSearch, CheckCircle2,
} from 'lucide-react-native'
import { ESTADO_OT, PRIORIDAD_OT, etiquetaVida, rangoProfundidad } from '@compartido/index'
import {
  Anillo, Avatar, AvisoSincronizacion, BarrasApiladas, Boton, BotonIcono, Campo, CampoNumerico, Chip, ESPACIO, Escaner,
  EsquemaVehiculo, Esqueleto, EstadoVacio, Fila, HojaInferior, Indicador, Interruptor, Pantalla, Progreso, Seccion,
  Segmentado, Tarjeta, Texto, useTema, type PosicionLlanta, type TonoChip,
} from '@/diseno'

const ORDENES = [
  { numero: 'OT-2026-0418', activo: 'TRK-112 · Kenworth T800', titulo: 'Cambio de pastillas de freno eje 2', estado: 'EN_EJECUCION', prioridad: 'URGENTE', hora: '07:40' },
  { numero: 'OT-2026-0421', activo: 'TRK-087 · Freightliner M2', titulo: 'Preventivo 20.000 km', estado: 'ASIGNADA', prioridad: 'ALTA', hora: '09:00' },
  { numero: 'OT-2026-0399', activo: 'MON-014 · Montacargas Toyota', titulo: 'Fuga hidráulica en mástil', estado: 'EN_ESPERA_REPUESTOS', prioridad: 'MEDIA', hora: 'Ayer' },
] as const

const TONO_ESTADO: Record<string, TonoChip> = { EN_EJECUCION: 'exito', ASIGNADA: 'acento', EN_ESPERA_REPUESTOS: 'alerta', PENDIENTE: 'neutro', COMPLETADA: 'neutro' }

// Tractocamión de tres ejes: [número, eje, lado, dual].
const MONTAJE: [number, number, 'izq' | 'der', ('ext' | 'int')?][] = [
  [1, 1, 'izq'], [2, 1, 'der'],
  [3, 2, 'izq', 'ext'], [4, 2, 'izq', 'int'], [5, 2, 'der', 'int'], [6, 2, 'der', 'ext'],
  [7, 3, 'izq', 'ext'], [8, 3, 'izq', 'int'], [9, 3, 'der', 'int'], [10, 3, 'der', 'ext'],
]
const MEDIDAS_PREVIAS: Record<number, number> = { 1: 11.5, 2: 9, 3: 5.5, 4: 6.5, 5: 7, 6: 2.5, 7: 12, 8: 12.5, 9: 4, 10: 11 }
const ESTADO_RANGO = { critica: ['Crítica', 'peligro'], moderada: ['Moderada', 'moderada'], buena: ['Buen estado', 'exito'] } as const

export default function Catalogo() {
  const { color, oscuro, setPreferencia } = useTema()
  const [vista, setVista] = useState<'mes' | 'semana' | 'dia'>('mes')
  const [medidas, setMedidas] = useState<Record<number, number | null>>(MEDIDAS_PREVIAS)
  const [presion, setPresion] = useState<number | null>(110)
  const [buscar, setBuscar] = useState('')
  const [notificar, setNotificar] = useState(true)
  const [hoja, setHoja] = useState(false)
  const [seleccion, setSeleccion] = useState(6)
  const mm = medidas[seleccion] ?? null
  const rango = rangoProfundidad(mm)
  const ejes = [1, 2, 3].map(eje => ({
    posiciones: MONTAJE.filter(m => m[1] === eje).map(([numero, , lado, dual]): PosicionLlanta =>
      ({ numero, eje, lado, dual, mm: medidas[numero] ?? null, estado: rangoProfundidad(medidas[numero] ?? null) })),
  }))

  const meses = ['jun', 'jul', 'ago', 'sep', 'oct', 'nov']
  const barras = meses.map((m, i) => ({ etiqueta: m, valores: { critica: [9, 7, 8, 6, 7, 5][i]!, moderada: [38, 41, 36, 40, 35, 33][i]!, buena: [120, 118, 126, 122, 130, 134][i]! } }))

  return (
    <Pantalla subtitulo="Lunes 3 de noviembre · Muestra" titulo="Buenos días, Laura"
      accion={<View style={{ flexDirection: 'row', gap: ESPACIO.e2 }}>
        <BotonIcono icono={oscuro ? Sun : Moon} etiqueta="Cambiar modo" onPress={() => setPreferencia(oscuro ? 'claro' : 'oscuro')} />
        <Avatar nombre="Laura Técnica" tamano={48} />
      </View>}>

      <AvisoSincronizacion enLinea={false} pendientes={3} rechazados={0} />

      <View style={{ flexDirection: 'row', gap: ESPACIO.e3 }}>
        <Tarjeta style={{ flex: 1 }}><Indicador etiqueta="Disponibilidad" valor="94,2" unidad="%" tendencia={1.8} serie={[89, 90, 92, 91, 93, 94.2]} /></Tarjeta>
        <Tarjeta style={{ flex: 1 }}><Indicador etiqueta="Backlog" valor="126" unidad="h" tendencia={-6.5} bueno="baja" serie={[160, 150, 141, 138, 131, 126]} /></Tarjeta>
      </View>

      <Seccion titulo="Mis órdenes de hoy" accion="Ver todas">
        <Tarjeta relleno={0} style={{ overflow: 'hidden' }}>
          {ORDENES.map((o, i) => (
            <Fila key={o.numero} titulo={o.titulo} detalle={`${o.numero} · ${o.activo}`} icono={Wrench}
              colorIcono={PRIORIDAD_OT[o.prioridad].color} onPress={() => setHoja(true)} ultima={i === ORDENES.length - 1}
              derecha={<View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Chip texto={ESTADO_OT[o.estado].corto} tono={TONO_ESTADO[o.estado]} />
                <Texto variante="nota" tono="terciario">{o.hora}</Texto>
              </View>} />
          ))}
        </Tarjeta>
      </Seccion>

      <Seccion titulo="Accesos rápidos">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: ESPACIO.e3 }}>
          {[{ i: ClipboardCheck, t: 'Checklist', c: color.acento }, { i: Gauge, t: 'Inspección', c: color.exito },
            { i: Fuel, t: 'Tanqueo', c: color.alerta }, { i: PackageSearch, t: 'Repuestos', c: color.informacion }].map(a => (
            <Tarjeta key={a.t} onPress={() => setHoja(true)} etiqueta={a.t} style={{ width: '47.5%', gap: ESPACIO.e3 }}>
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: color.hundida, alignItems: 'center', justifyContent: 'center' }}>
                <a.i size={22} color={a.c} strokeWidth={2.1} />
              </View>
              <Texto variante="cuerpoFuerte">{a.t}</Texto>
            </Tarjeta>
          ))}
        </View>
      </Seccion>

      <Seccion titulo="Inspección de llantas · TRK-112">
        <Tarjeta style={{ gap: ESPACIO.e5 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ gap: 2 }}>
              <Texto variante="subtitulo">Posición {seleccion}</Texto>
              <Texto variante="nota" tono="secundario">LL-20931 · Michelin X Multi D · {etiquetaVida(1)}</Texto>
            </View>
            {rango ? <Chip texto={ESTADO_RANGO[rango][0]} tono={ESTADO_RANGO[rango][1]} /> : <Chip texto="Sin medir" />}
          </View>
          <EsquemaVehiculo ejes={ejes} seleccion={seleccion} alTocar={p => setSeleccion(p.numero)} />
          <CampoNumerico etiqueta="Profundidad del surco central" key={seleccion} valor={mm} onCambio={v => setMedidas(m => ({ ...m, [seleccion]: v }))} unidad="mm"
            previo={MEDIDAS_PREVIAS[seleccion]} rango={{ min: 0, max: MEDIDAS_PREVIAS[seleccion] }} />
          <CampoNumerico etiqueta="Presión" valor={presion} onCambio={setPresion} paso={5} decimales={0} unidad="psi" rango={{ min: 90, max: 120 }} />
          <Boton titulo={seleccion < 10 ? `Guardar y pasar a la ${seleccion + 1}` : 'Guardar inspección'} icono={CheckCircle2} tamano="grande" ancho
            onPress={() => setSeleccion(s => Math.min(10, s + 1))} />
        </Tarjeta>
      </Seccion>

      <Seccion titulo="Estado de llantas a piso">
        <Tarjeta style={{ gap: ESPACIO.e4 }}>
          <Segmentado valor={vista} onCambio={setVista} opciones={[{ valor: 'dia', texto: 'Día' }, { valor: 'semana', texto: 'Semana' }, { valor: 'mes', texto: 'Mes' }]} />
          <BarrasApiladas datos={barras} series={[
            { clave: 'critica', nombre: 'Crítica ≤ 3 mm', color: color.peligro },
            { clave: 'moderada', nombre: 'Moderada', color: color.moderada },
            { clave: 'buena', nombre: 'Buen estado', color: color.exito },
          ]} />
        </Tarjeta>
      </Seccion>

      <Seccion titulo="Composición por vida">
        <Tarjeta style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.e5 }}>
          <Anillo centro="172" subcentro="montadas" partes={[
            { nombre: 'VN', valor: 104, color: color.serie[0] }, { nombre: 'R1', valor: 46, color: color.serie[1] },
            { nombre: 'R2', valor: 22, color: color.serie[2] },
          ]} />
          <View style={{ flex: 1, gap: ESPACIO.e3 }}>
            {[{ n: 'Vida nueva', v: 104, c: color.serie[0] }, { n: '1 reencauche', v: 46, c: color.serie[1] }, { n: '2 reencauches', v: 22, c: color.serie[2] }].map(x => (
              <View key={x.n} style={{ gap: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Texto variante="nota">{x.n}</Texto><Texto variante="nota" tono="secundario">{Math.round((x.v / 172) * 100)} %</Texto>
                </View>
                <Progreso valor={x.v / 172} colorBarra={x.c} />
              </View>
            ))}
          </View>
        </Tarjeta>
      </Seccion>

      <Seccion titulo="Formularios">
        <Tarjeta style={{ gap: ESPACIO.e4 }}>
          <Campo etiqueta="Buscar activo" valor={buscar} onCambio={setBuscar} icono={Search} placeholder="Placa, código o nombre" />
          <Campo etiqueta="Odómetro" valor="184.220" onCambio={() => {}} teclado="numeric" error="Menor que el último registrado (184.560 km el 2 nov)" />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Texto variante="cuerpoFuerte">Notificar órdenes asignadas</Texto>
              <Texto variante="nota" tono="secundario">Avisos aunque la app esté cerrada</Texto>
            </View>
            <Interruptor valor={notificar} onCambio={setNotificar} etiqueta="Notificar órdenes asignadas" />
          </View>
        </Tarjeta>
      </Seccion>

      <Seccion titulo="Botones y estados">
        <Tarjeta style={{ gap: ESPACIO.e3 }}>
          <Boton titulo="Cerrar orden" icono={CheckCircle2} />
          <View style={{ flexDirection: 'row', gap: ESPACIO.e3 }}>
            <View style={{ flex: 1 }}><Boton titulo="Pausar" variante="secundario" ancho /></View>
            <View style={{ flex: 1 }}><Boton titulo="Rechazar" variante="peligro" icono={AlertTriangle} ancho /></View>
          </View>
          <Boton titulo="Ver historial del activo" variante="fantasma" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: ESPACIO.e2 }}>
            <Chip texto="Urgente" tono="peligro" /><Chip texto="En curso" tono="exito" /><Chip texto="Esp. repuestos" tono="alerta" />
            <Chip texto="Asignada" tono="acento" /><Chip texto="Moderada" tono="moderada" /><Chip texto="Completada" tono="neutro" />
          </View>
        </Tarjeta>
      </Seccion>

      <Seccion titulo="Cargando y vacío">
        <Tarjeta style={{ gap: ESPACIO.e3 }}>
          <View style={{ flexDirection: 'row', gap: ESPACIO.e3, alignItems: 'center' }}>
            <Esqueleto alto={40} ancho={40} radio={12} />
            <View style={{ flex: 1, gap: 8 }}><Esqueleto alto={14} ancho="70%" /><Esqueleto alto={12} ancho="45%" /></View>
          </View>
          <EstadoVacio icono={Bell} titulo="Sin alertas pendientes" detalle="Cuando algo necesite su atención aparecerá aquí." />
        </Tarjeta>
      </Seccion>

      <Seccion titulo="Escáner">
        <Escaner onCodigo={() => setHoja(true)} />
      </Seccion>

      <HojaInferior visible={hoja} onCerrar={() => setHoja(false)} titulo="OT-2026-0418">
        <Fila titulo="TRK-112 · Kenworth T800" detalle="Odómetro 184.560 km" icono={Truck} />
        <Fila titulo="Cambio de pastillas de freno eje 2" detalle="Urgente · asignada a Laura Técnica" icono={Wrench} colorIcono={color.peligro} ultima />
        <Boton titulo="Iniciar orden" tamano="grande" ancho onPress={() => setHoja(false)} />
      </HojaInferior>
    </Pantalla>
  )
}
