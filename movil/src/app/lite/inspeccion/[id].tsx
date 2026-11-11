/**
 * Inspección TittanLite, pensada para el inspector:
 *  1. Inicio: la última inspección del vehículo (con sus profundidades), y la
 *     fecha (hoy) y el odómetro de la nueva → «Iniciar inspección».
 *  2. Llanta por llanta, en la misma pantalla (sin hojas que suban ni rebotes),
 *     en el orden de recorrido que eligió el inspector y con los datos en el
 *     orden que prefiere. Surcos de externo a interno, con medidor Bluetooth si
 *     está activo. Propone lo de la última inspección o lo que TittanWare tiene
 *     montado; todo se puede cambiar.
 *  3. Resumen y guardar (a la cola: se envía apenas haya señal).
 */
import { useMemo, useRef, useState, type ComponentRef } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Bluetooth, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Play, Save } from 'lucide-react-native'
import {
  Boton, Campo, CampoNumerico, Chip, ESPACIO, EsquemaVehiculo, EstadoVacio, Fila, Interruptor, RADIO, Segmentado,
  Tarjeta, Texto, useTema, type PosicionLlanta,
} from '@/diseno'
import { useSesion } from '@/datos/sesion'
import {
  estadoPorProfundidad, nuevoUuid, useCola, useDatosLite, type FotoPendiente, type LlantaLite, type PosicionLite,
} from '@/datos/lite'
import { Marcables, Sugerencias } from '@/lite/componentes'
import { CabeceraLite } from '@/lite/marca'
import { Fotos } from '@/lite/fotos'
import { CapturaMedidor } from '@/lite/medidor'
import { ordenar, usePreferencias, type Paso } from '@/lite/preferencias'

const VIDAS = [{ valor: '0', texto: 'Nueva' }, { valor: '1', texto: 'R1' }, { valor: '2', texto: 'R2' }, { valor: '3', texto: 'R3+' }]
const SURCOS = [
  { clave: 'profundidad_externa', nombre: 'Externo' },
  { clave: 'profundidad_central', nombre: 'Central' },
  { clave: 'profundidad_interna', nombre: 'Interno' },
] as const
type ClaveSurco = typeof SURCOS[number]['clave']
const hoy = () => new Date().toISOString().slice(0, 10)
type RefCampo = ComponentRef<typeof TextInput>
const ayer = () => new Date(Date.now() - 86400000).toISOString().slice(0, 10)

function minimo(l?: Partial<LlantaLite> | null) {
  const v = [l?.profundidad_externa, l?.profundidad_central, l?.profundidad_interna].filter((x): x is number => x != null)
  return v.length ? Math.min(...v) : null
}
const num = (t: string) => { const n = Number(t.replace(',', '.')); return t.trim() === '' || !Number.isFinite(n) ? null : n }

/** Un surco: campo grande, teclado numérico y «siguiente» salta al próximo. */
function Surco({ nombre, valor, antes, onCambio, refInput, onSiguiente, activo }: {
  nombre: string; valor: number | null | undefined; antes?: number | null; onCambio: (v: number | null) => void
  refInput: (r: RefCampo | null) => void; onSiguiente: () => void; activo: boolean
}) {
  const { color } = useTema()
  const [texto, setTexto] = useState(valor == null ? '' : String(valor))
  const [ultimo, setUltimo] = useState(valor)
  if (valor !== ultimo) { setUltimo(valor); setTexto(valor == null ? '' : String(valor)) }
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <Texto variante="mini" tono={activo ? 'acento' : 'secundario'}>{nombre.toUpperCase()}</Texto>
      <TextInput ref={refInput} value={texto} keyboardType="decimal-pad" returnKeyType="next" blurOnSubmit={false}
        accessibilityLabel={`Surco ${nombre}, milímetros`} selectTextOnFocus
        onChangeText={t => { setTexto(t); onCambio(num(t)) }} onSubmitEditing={onSiguiente}
        style={{ minHeight: 64, borderRadius: RADIO.grande, borderWidth: 2, borderColor: activo ? color.acento : color.borde,
          backgroundColor: color.superficie, color: color.texto, fontSize: 28, fontFamily: 'Inter_800ExtraBold', textAlign: 'center' }} />
      <Texto variante="nota" tono="terciario" style={{ textAlign: 'center' }}>{antes != null ? `antes ${antes}` : ' '}</Texto>
    </View>
  )
}

export default function InspeccionLite() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { usuario } = useSesion()
  const { vehiculos, catalogos } = useDatosLite()
  const { agregar } = useCola()
  const { pref, cambiar: cambiarPref, memoria, recordar } = usePreferencias()
  const { color } = useTema()
  const vehiculo = useMemo(() => vehiculos?.find(v => String(v.activo_id) === String(id)), [vehiculos, id])
  const [etapa, setEtapa] = useState<'inicio' | 'llantas' | 'resumen'>('inicio')
  const [fechaModo, setFechaModo] = useState<'hoy' | 'ayer' | 'otra'>('hoy')
  const [fechaOtra, setFechaOtra] = useState(hoy())
  const [odometro, setOdometro] = useState('')
  const [indice, setIndice] = useState(0)
  const [llantas, setLlantas] = useState<Record<string, LlantaLite>>({})
  const [fotos, setFotos] = useState<FotoPendiente[]>([])
  const [observaciones, setObservaciones] = useState('')
  const [guardando, setGuardando] = useState(false)
  const surcos = useRef<(RefCampo | null)[]>([])

  const orden = useMemo(() => vehiculo ? ordenar(vehiculo.posiciones, pref.ruta) : [], [vehiculo, pref.ruta])
  const previa = vehiculo?.ultima_inspeccion
  const actual = orden[indice]
  const llanta = actual ? llantas[actual.codigo] : undefined
  const novedadesOrdenadas = useMemo(() => [...(catalogos?.novedades ?? [])].filter(n => n.clave !== 'SIN_LLANTA')
    .sort((a, b) => (memoria.novedades[b.clave] ?? 0) - (memoria.novedades[a.clave] ?? 0)), [catalogos, memoria])

  const esquema = (fuente: (p: PosicionLite) => number | null, sinLlanta?: (p: PosicionLite) => boolean,
    previo?: (p: PosicionLite) => number | null) => {
    if (!vehiculo) return []
    const porEje = new Map<number, PosicionLlanta[]>()
    vehiculo.posiciones.forEach((p, i) => {
      const eje = p.eje > 0 ? p.eje : 99
      const mm = fuente(p)
      porEje.set(eje, [...(porEje.get(eje) ?? []), {
        numero: i + 1, eje, lado: p.lado.toUpperCase().startsWith('I') ? 'izq' : 'der',
        dual: /INT/i.test(p.codigo) ? 'int' : /EXT/i.test(p.codigo) ? 'ext' : undefined,
        mm, mmPrevio: previo?.(p) ?? null, estado: sinLlanta?.(p) ? null : estadoPorProfundidad(mm, catalogos?.umbrales) }])
    })
    return [...porEje.entries()].sort((a, b) => a[0] - b[0]).map(([, posiciones]) => ({ posiciones }))
  }

  if (!vehiculo) {
    return (
      <View style={{ flex: 1, backgroundColor: color.fondo }}>
        <CabeceraLite titulo="Inspección" volver={() => router.back()} />
        <View style={{ padding: ESPACIO.e4 }}>
          <EstadoVacio icono={ChevronLeft} titulo="Vehículo no encontrado" detalle="Actualice la lista con señal." accion="Volver" onAccion={() => router.back()} />
        </View>
      </View>
    )
  }

  const preparar = (p: PosicionLite): LlantaLite => {
    const v = previa?.llantas?.[p.codigo]
    const m = p.llanta
    return {
      posicion: p.codigo, codigo: v?.codigo ?? m?.codigo ?? '', marca: v?.marca ?? m?.marca ?? '',
      referencia: v?.referencia ?? m?.referencia ?? '', medida: v?.medida ?? m?.medida ?? '',
      reencauches: v?.reencauches ?? m?.reencauches ?? 0, profundidad_externa: null, profundidad_central: null,
      profundidad_interna: null, presion: null, novedades: [], observacion: '',
    }
  }
  const ir = (i: number) => {
    const p = orden[i]
    if (p && !llantas[p.codigo]) setLlantas(ls => ({ ...ls, [p.codigo]: preparar(p) }))
    setIndice(i)
    setTimeout(() => surcos.current[0]?.focus(), 60)
  }
  const cambiar = (c: Partial<LlantaLite>) => actual && setLlantas(ls => ({ ...ls, [actual.codigo]: { ...(ls[actual.codigo] ?? preparar(actual)), ...c } }))
  const siguiente = () => { if (indice < orden.length - 1) ir(indice + 1); else setEtapa('resumen') }

  // Medidor Bluetooth: cada lectura llena el siguiente surco vacío, de externo a interno.
  const lectura = (mm: number) => {
    if (!actual) return
    const l = llantas[actual.codigo] ?? preparar(actual)
    const libre = SURCOS.find(s => l[s.clave] == null)
    if (!libre) return
    const nueva = { ...l, [libre.clave]: mm }
    setLlantas(ls => ({ ...ls, [actual.codigo]: nueva }))
    if (SURCOS.every(s => nueva[s.clave] != null) && pref.avanceAutomatico) setTimeout(siguiente, 350)
  }
  const surcoActivo = llanta ? SURCOS.findIndex(s => llanta[s.clave] == null) : 0

  const fecha = fechaModo === 'hoy' ? hoy() : fechaModo === 'ayer' ? ayer() : fechaOtra
  const inspeccionadas = Object.values(llantas).filter(l => minimo(l) != null || l.novedades.length || l.observacion || l.presion != null)

  const guardar = async () => {
    setGuardando(true)
    try {
      for (const l of inspeccionadas) recordar({ novedades: l.novedades, observacion: l.observacion })
      await agregar({
        uuid: nuevoUuid(), tipo: 'inspeccion', creado: new Date().toISOString(), placa: vehiculo.placa || vehiculo.codigo, fotos,
        cuerpo: {
          uuid: nuevoUuid(), activo_id: vehiculo.activo_id, fecha: `${fecha}T${new Date().toTimeString().slice(0, 8)}`,
          odometro: num(odometro), inspector: usuario ? `${usuario.nombre} ${usuario.apellido}`.trim() : null,
          observaciones: observaciones || null,
          llantas: inspeccionadas.map(l => ({ ...l, codigo: l.codigo || null, marca: l.marca || null, referencia: l.referencia || null,
            medida: l.medida || null, observacion: l.observacion || null })),
        },
      })
      router.back()
    } finally { setGuardando(false) }
  }

  /* ── 1. Inicio ───────────────────────────────────────────────────────────── */
  if (etapa === 'inicio') {
    return (
      <View style={{ flex: 1, backgroundColor: color.fondo }}>
        <CabeceraLite titulo={vehiculo.placa || vehiculo.codigo} subtitulo={[vehiculo.tipo, vehiculo.marca, vehiculo.linea].filter(Boolean).join(' · ')}
          volver={() => router.back()} />
        <ScrollView contentContainerStyle={{ padding: ESPACIO.e4, gap: ESPACIO.e4 }} keyboardShouldPersistTaps="handled">
          <Tarjeta style={{ gap: ESPACIO.e3 }}>
            <Texto variante="subtitulo">Última inspección</Texto>
            {previa ? (
              <>
                <Texto tono="secundario">
                  {new Date(previa.fecha).toLocaleDateString('es-CO', { dateStyle: 'medium' })}
                  {previa.odometro ? ` · ${Math.round(previa.odometro).toLocaleString('es-CO')} km` : ''}{previa.inspector ? ` · ${previa.inspector}` : ''}
                </Texto>
                <EsquemaVehiculo profundidades ejes={esquema(p => minimo(previa.llantas?.[p.codigo]),
                  p => (previa.llantas?.[p.codigo]?.novedades ?? []).includes('SIN_LLANTA'))} />
                <Texto variante="nota" tono="terciario">El color es el estado por la profundidad mínima de entonces.</Texto>
                <View>
                  {ordenar(vehiculo.posiciones, 'izq_der').filter(p => previa.llantas?.[p.codigo]).map((p, i, arr) => {
                    const l = previa.llantas[p.codigo]
                    const est = estadoPorProfundidad(minimo(l), catalogos?.umbrales)
                    return (
                      <View key={p.codigo} style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.e2, paddingVertical: ESPACIO.e2,
                        borderBottomWidth: i === arr.length - 1 ? 0 : 1, borderBottomColor: color.borde }}>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Texto variante="cuerpoFuerte" lineas={1}>{p.label}</Texto>
                          <Texto variante="nota" tono="terciario" lineas={1}>{[l.codigo, l.marca, l.presion ? `${l.presion} psi` : null].filter(Boolean).join(' · ') || '—'}</Texto>
                        </View>
                        <Texto variante="cuerpoFuerte" style={{ fontVariant: ['tabular-nums'] }}>
                          {l.novedades?.includes('SIN_LLANTA') ? 'Sin llanta'
                            : [l.profundidad_externa, l.profundidad_central, l.profundidad_interna].map(v => v ?? '—').join(' / ')}
                        </Texto>
                        {est && <View style={{ width: 10, height: 10, borderRadius: 5,
                          backgroundColor: est === 'critica' ? color.peligro : est === 'moderada' ? color.alerta : color.exito }} />}
                      </View>
                    )
                  })}
                  <Texto variante="nota" tono="terciario" style={{ marginTop: 4 }}>Profundidades en mm: externo / central / interno.</Texto>
                </View>
              </>
            ) : <Texto tono="secundario">Este vehículo no tiene inspecciones en TittanLite todavía.</Texto>}
          </Tarjeta>
          <Tarjeta style={{ gap: ESPACIO.e3 }}>
            <Texto variante="subtitulo">Nueva inspección</Texto>
            <Texto variante="nota" tono="secundario">Fecha</Texto>
            <Segmentado opciones={[{ valor: 'hoy', texto: 'Hoy' }, { valor: 'ayer', texto: 'Ayer' }, { valor: 'otra', texto: 'Otra' }]}
              valor={fechaModo} onCambio={v => setFechaModo(v as typeof fechaModo)} />
            {fechaModo === 'otra' && <Campo etiqueta="Fecha (AAAA-MM-DD)" valor={fechaOtra} onCambio={setFechaOtra} teclado="numbers-and-punctuation" />}
            <Campo etiqueta="Odómetro (km)" valor={odometro} onCambio={setOdometro} teclado="numeric"
              ayuda={previa?.odometro ? `Anterior: ${Math.round(previa.odometro).toLocaleString('es-CO')} km` :
                vehiculo.odometro_actual ? `En TittanWare: ${Math.round(vehiculo.odometro_actual).toLocaleString('es-CO')} km` : undefined} />
            <Boton titulo="Iniciar inspección" icono={Play} tamano="grande" ancho deshabilitado={!/^\d{4}-\d{2}-\d{2}$/.test(fecha)}
              onPress={() => { setEtapa('llantas'); ir(0) }} />
          </Tarjeta>
        </ScrollView>
      </View>
    )
  }

  /* ── 3. Resumen ──────────────────────────────────────────────────────────── */
  if (etapa === 'resumen') {
    return (
      <View style={{ flex: 1, backgroundColor: color.fondo }}>
        <CabeceraLite titulo="Resumen" subtitulo={`${vehiculo.placa || vehiculo.codigo} · ${fecha}`} volver={() => setEtapa('llantas')} />
        <ScrollView contentContainerStyle={{ padding: ESPACIO.e4, gap: ESPACIO.e4 }}>
          <Tarjeta><EsquemaVehiculo profundidades ejes={esquema(p => minimo(llantas[p.codigo]), p => !!llantas[p.codigo]?.novedades.includes('SIN_LLANTA'))}
            alTocar={p => { setEtapa('llantas'); ir(orden.findIndex(o => o.codigo === vehiculo.posiciones[p.numero - 1].codigo)) }} /></Tarjeta>
          <Tarjeta relleno={0}>
            {inspeccionadas.map((l, i) => {
              const mm = minimo(l)
              const est = estadoPorProfundidad(mm, catalogos?.umbrales)
              return (
                <Fila key={l.posicion} titulo={`${l.posicion} · ${l.codigo || 'sin código'}`}
                  detalle={[[l.profundidad_externa, l.profundidad_central, l.profundidad_interna].map(v => v ?? '—').join(' / ') + ' mm',
                    l.presion ? `${l.presion} psi` : null, l.novedades.length ? `${l.novedades.length} novedad(es)` : null].filter(Boolean).join(' · ')}
                  derecha={<Chip texto={l.novedades.includes('SIN_LLANTA') ? 'Vacía' : est === 'critica' ? 'Crítica' : est === 'moderada' ? 'Regular' : est ? 'Buena' : 'Sin medir'}
                    tono={est === 'critica' ? 'peligro' : est === 'moderada' ? 'moderada' : est ? 'exito' : 'neutro'} />}
                  onPress={() => { setEtapa('llantas'); ir(orden.findIndex(o => o.codigo === l.posicion)) }} ultima={i === inspeccionadas.length - 1} />
              )
            })}
          </Tarjeta>
          <Campo etiqueta="Observaciones generales" valor={observaciones} onCambio={setObservaciones} multilinea />
          <Texto variante="nota" tono="terciario">{fotos.length} foto(s) · {inspeccionadas.length} de {orden.length} posiciones</Texto>
          <Boton titulo="Guardar inspección" icono={Save} tamano="grande" ancho onPress={guardar} cargando={guardando} deshabilitado={!inspeccionadas.length} />
        </ScrollView>
      </View>
    )
  }

  /* ── 2. Llanta por llanta ────────────────────────────────────────────────── */
  const anterior = previa?.llantas?.[actual?.codigo ?? '']
  const refs = (catalogos?.referencias ?? []).filter(r => !llanta?.marca || r.marca.toLowerCase() === llanta.marca.toLowerCase()).map(r => r.referencia)
  const sinLlanta = !!llanta?.novedades.includes('SIN_LLANTA')
  const bloque = (paso: Paso) => {
    if (!llanta) return null
    if (sinLlanta && paso !== 'llanta') return null
    switch (paso) {
      case 'profundidades':
        return (
          <Tarjeta key={paso} style={{ gap: ESPACIO.e3 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Texto variante="cuerpoFuerte">Profundidades (mm)</Texto>
              {pref.medidor && <Chip texto={surcoActivo >= 0 ? `Medidor: surco ${SURCOS[surcoActivo].nombre.toLowerCase()}` : 'Medidor: completo'} tono="acento" />}
            </View>
            <View style={{ flexDirection: 'row', gap: ESPACIO.e2 }}>
              {SURCOS.map((s, i) => (
                <Surco key={s.clave} nombre={s.nombre} valor={llanta[s.clave as ClaveSurco]} antes={anterior?.[s.clave as ClaveSurco] ?? null}
                  activo={pref.medidor && i === surcoActivo}
                  refInput={r => { surcos.current[i] = r }} onCambio={v => cambiar({ [s.clave]: v } as Partial<LlantaLite>)}
                  onSiguiente={() => (i < 2 ? surcos.current[i + 1]?.focus() : undefined)} />
              ))}
            </View>
          </Tarjeta>
        )
      case 'presion':
        return (
          <Tarjeta key={paso}>
            <CampoNumerico etiqueta="Presión" unidad="psi" paso={5} decimales={0} valor={llanta.presion ?? null}
              onCambio={v => cambiar({ presion: v })} max={250} rango={{ min: catalogos?.umbrales.presion_min, max: catalogos?.umbrales.presion_max }}
              previo={anterior?.presion ?? actual?.llanta?.presion_recomendada ?? null} />
          </Tarjeta>
        )
      case 'novedades':
        return (
          <Tarjeta key={paso} style={{ gap: ESPACIO.e3 }}>
            <Texto variante="cuerpoFuerte">Novedades</Texto>
            <Marcables opciones={novedadesOrdenadas} elegidas={llanta.novedades} onCambio={v => cambiar({ novedades: v })} />
            <Campo etiqueta="Observación" valor={llanta.observacion ?? ''} onCambio={v => cambiar({ observacion: v })} />
            <Sugerencias opciones={memoria.observaciones} texto={llanta.observacion ?? ''} onElegir={v => cambiar({ observacion: v })} />
          </Tarjeta>
        )
      case 'fotos':
        return (
          <Tarjeta key={paso} style={{ gap: ESPACIO.e2 }}>
            <Texto variante="cuerpoFuerte">Fotos</Texto>
            <Fotos posicion={actual.codigo} fotos={fotos.filter(f => f.posicion === actual.codigo)}
              onCambio={fs => setFotos([...fotos.filter(f => f.posicion !== actual.codigo), ...fs])} />
          </Tarjeta>
        )
      case 'llanta':
        return (
          <Tarjeta key={paso} style={{ gap: ESPACIO.e3 }}>
            <Interruptor etiqueta="No hay llanta en esta posición" valor={sinLlanta}
              onCambio={v => cambiar({ novedades: v ? ['SIN_LLANTA'] : llanta.novedades.filter(n => n !== 'SIN_LLANTA') })} />
            {!sinLlanta && (
              <>
                <Campo etiqueta="Código de la llanta" valor={llanta.codigo ?? ''} onCambio={v => cambiar({ codigo: v })} sinMayusculas
                  ayuda={actual.llanta ? `En TittanWare: ${actual.llanta.codigo}` : 'Sin llanta registrada en TittanWare'} />
                <Campo etiqueta="Marca" valor={llanta.marca ?? ''} onCambio={v => cambiar({ marca: v })} />
                <Sugerencias opciones={catalogos?.marcas ?? []} texto={llanta.marca ?? ''} onElegir={v => cambiar({ marca: v })} />
                <Campo etiqueta="Referencia" valor={llanta.referencia ?? ''} onCambio={v => cambiar({ referencia: v })} />
                <Sugerencias opciones={refs} texto={llanta.referencia ?? ''} onElegir={v => cambiar({ referencia: v })} />
                <Campo etiqueta="Dimensión" valor={llanta.medida ?? ''} onCambio={v => cambiar({ medida: v })} sinMayusculas />
                <Sugerencias opciones={catalogos?.medidas ?? []} texto={llanta.medida ?? ''} onElegir={v => cambiar({ medida: v })} />
                <Segmentado opciones={VIDAS} valor={String(Math.min(llanta.reencauches ?? 0, 3))} onCambio={v => cambiar({ reencauches: Number(v) })} />
              </>
            )}
          </Tarjeta>
        )
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: color.fondo }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <CabeceraLite titulo={`${actual?.label ?? ''} · ${llanta?.codigo || 'sin código'}`}
        subtitulo={`${vehiculo.placa || vehiculo.codigo} · llanta ${indice + 1} de ${orden.length}`} volver={() => setEtapa('inicio')}
        accion={pref.medidor ? <Bluetooth size={22} color={color.textoSobreAcento} /> : undefined} />
      <CapturaMedidor activo={pref.medidor} onLectura={lectura} />
      <ScrollView contentContainerStyle={{ padding: ESPACIO.e4, gap: ESPACIO.e3, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        <Tarjeta relleno={pref.esquema ? undefined : ESPACIO.e3} style={{ gap: ESPACIO.e2 }}>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: pref.esquema }}
            accessibilityLabel={pref.esquema ? 'Ocultar esquema del vehículo' : 'Ver esquema del vehículo'}
            onPress={() => cambiarPref({ esquema: !pref.esquema })} hitSlop={8}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 32 }}>
            <Texto variante="cuerpoFuerte">Esquema del vehículo</Texto>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Texto variante="nota" tono="acento">{pref.esquema ? 'Ocultar' : 'Ver'}</Texto>
              {pref.esquema ? <ChevronUp size={18} color={color.acento} /> : <ChevronDown size={18} color={color.acento} />}
            </View>
          </Pressable>
          {pref.esquema && (
            <>
              <EsquemaVehiculo profundidades
                seleccion={actual ? vehiculo.posiciones.findIndex(p => p.codigo === actual.codigo) + 1 : null}
                ejes={esquema(p => minimo(llantas[p.codigo]), p => !!llantas[p.codigo]?.novedades.includes('SIN_LLANTA'),
                  p => minimo(previa?.llantas?.[p.codigo]))}
                alTocar={p => ir(orden.findIndex(o => o.codigo === vehiculo.posiciones[p.numero - 1].codigo))} />
              <Texto variante="nota" tono="terciario" style={{ textAlign: 'center' }}>
                Toque una llanta para ir a ella. En color, lo medido hoy; en gris, la profundidad mínima de la inspección anterior.
              </Texto>
            </>
          )}
        </Tarjeta>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: ESPACIO.e2 }}>
          {orden.map((p, i) => {
            const l = llantas[p.codigo]
            const hecho = !!l && (minimo(l) != null || l.novedades.length > 0)
            return (
              <Pressable key={p.codigo} accessibilityRole="button" accessibilityLabel={`Ir a ${p.label}`} onPress={() => ir(i)}
                style={{ minWidth: 44, height: 36, paddingHorizontal: 10, borderRadius: RADIO.total, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: i === indice ? color.acento : hecho ? color.exitoSuave : color.hundida }}>
                <Texto variante="nota" style={{ color: i === indice ? color.textoSobreAcento : hecho ? color.exito : color.textoSecundario }}>{i + 1}</Texto>
              </Pressable>
            )
          })}
        </ScrollView>
        {pref.pasos.map(bloque)}
      </ScrollView>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: ESPACIO.e3, padding: ESPACIO.e4,
        paddingBottom: ESPACIO.e6, backgroundColor: color.superficie, borderTopWidth: 1, borderTopColor: color.borde }}>
        <View style={{ flex: 1 }}>
          <Boton titulo="Anterior" icono={ChevronLeft} variante="secundario" ancho deshabilitado={indice === 0} onPress={() => ir(indice - 1)} />
        </View>
        <View style={{ flex: 1.4 }}>
          <Boton titulo={indice < orden.length - 1 ? 'Siguiente llanta' : 'Terminar'} icono={ChevronRight} ancho onPress={siguiente} />
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}
