/**
 * Inspección TittanLite de un vehículo. El esquema muestra cada posición con su
 * color por profundidad; al tocarla se edita la llanta: lo que TittanWare tiene
 * montado viene propuesto, pero todo se puede cambiar. Sin restricciones: lo que
 * TittanWare no acepte queda registrado en TittanLite con su motivo.
 */
import { useMemo, useState } from 'react'
import { View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { ArrowLeft, Camera, Save } from 'lucide-react-native'
import {
  Boton, BotonIcono, Campo, CampoNumerico, Chip, ESPACIO, EsquemaVehiculo, EstadoVacio, Fila, HojaInferior, Interruptor,
  Pantalla, Seccion, Segmentado, Tarjeta, Texto, type PosicionLlanta,
} from '@/diseno'
import { useSesion } from '@/datos/sesion'
import {
  estadoPorProfundidad, nuevoUuid, useCola, useDatosLite, type FotoPendiente, type LlantaLite, type PosicionLite,
} from '@/datos/lite'
import { FilaFotos, Marcables, Sugerencias, TomarFoto } from '@/lite/componentes'

const VIDAS = [{ valor: '0', texto: 'Nueva' }, { valor: '1', texto: 'R1' }, { valor: '2', texto: 'R2' }, { valor: '3', texto: 'R3+' }]

function minimo(l?: LlantaLite) {
  const v = [l?.profundidad_interna, l?.profundidad_central, l?.profundidad_externa].filter((x): x is number => x != null)
  return v.length ? Math.min(...v) : null
}

export default function InspeccionLite() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { usuario } = useSesion()
  const { vehiculos, catalogos } = useDatosLite()
  const { agregar } = useCola()
  const vehiculo = useMemo(() => vehiculos?.find(v => String(v.activo_id) === String(id)), [vehiculos, id])
  const [llantas, setLlantas] = useState<Record<string, LlantaLite>>({})
  const [fotos, setFotos] = useState<FotoPendiente[]>([])
  const [odometro, setOdometro] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [abierta, setAbierta] = useState<PosicionLite | null>(null)
  const [camara, setCamara] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const ejes = useMemo(() => {
    if (!vehiculo) return []
    const porEje = new Map<number, PosicionLlanta[]>()
    vehiculo.posiciones.forEach((p, i) => {
      const eje = p.eje > 0 ? p.eje : 99
      const l = llantas[p.codigo]
      const mm = minimo(l) ?? null
      const pos: PosicionLlanta = {
        numero: i + 1, eje, lado: p.lado.toUpperCase().startsWith('I') ? 'izq' : 'der',
        dual: /INT/i.test(p.codigo) ? 'int' : /EXT/i.test(p.codigo) ? 'ext' : undefined,
        mm, estado: l?.novedades.includes('SIN_LLANTA') ? null : estadoPorProfundidad(mm, catalogos?.umbrales),
      }
      porEje.set(eje, [...(porEje.get(eje) ?? []), pos])
    })
    return [...porEje.entries()].sort((a, b) => a[0] - b[0]).map(([, posiciones]) => ({ posiciones }))
  }, [vehiculo, llantas, catalogos])

  if (!vehiculo) {
    return (
      <Pantalla titulo="Inspección">
        <EstadoVacio icono={ArrowLeft} titulo="Vehículo no encontrado" detalle="Actualice la lista con señal." accion="Volver" onAccion={() => router.back()} />
      </Pantalla>
    )
  }

  const abrir = (p: PosicionLite) => {
    if (!llantas[p.codigo]) {
      const m = p.llanta
      setLlantas(ls => ({ ...ls, [p.codigo]: {
        posicion: p.codigo, codigo: m?.codigo ?? '', marca: m?.marca ?? '', referencia: m?.referencia ?? '', medida: m?.medida ?? '',
        reencauches: m?.reencauches ?? 0, profundidad_interna: null, profundidad_central: null, profundidad_externa: null,
        presion: null, novedades: [], observacion: '' } }))
    }
    setAbierta(p)
  }
  const actual = abierta ? llantas[abierta.codigo] : undefined
  const cambiar = (c: Partial<LlantaLite>) => abierta && setLlantas(ls => ({ ...ls, [abierta.codigo]: { ...ls[abierta.codigo], ...c } }))
  const inspeccionadas = Object.values(llantas).filter(l => minimo(l) != null || l.novedades.length || l.observacion)
  const refs = (catalogos?.referencias ?? []).filter(r => !actual?.marca || r.marca.toLowerCase() === actual.marca.toLowerCase()).map(r => r.referencia)

  const guardar = async () => {
    setGuardando(true)
    try {
      await agregar({
        uuid: nuevoUuid(), tipo: 'inspeccion', creado: new Date().toISOString(), placa: vehiculo.placa || vehiculo.codigo, fotos,
        cuerpo: {
          uuid: nuevoUuid(), activo_id: vehiculo.activo_id, fecha: new Date().toISOString(),
          odometro: odometro ? Number(odometro.replace(',', '.')) : null,
          inspector: usuario ? `${usuario.nombre} ${usuario.apellido}`.trim() : null, observaciones: observaciones || null,
          llantas: inspeccionadas.map(l => ({ ...l, codigo: l.codigo || null, marca: l.marca || null, referencia: l.referencia || null,
            medida: l.medida || null, observacion: l.observacion || null })),
        },
      })
      router.back()
    } finally { setGuardando(false) }
  }

  return (
    <Pantalla subtitulo={[vehiculo.tipo, vehiculo.marca, vehiculo.linea].filter(Boolean).join(' · ')} titulo={vehiculo.placa || vehiculo.codigo}
      accion={<BotonIcono icono={ArrowLeft} etiqueta="Volver" onPress={() => router.back()} />}>
      <Tarjeta style={{ gap: ESPACIO.e3 }}>
        <Campo etiqueta="Odómetro (km)" valor={odometro} onCambio={setOdometro} teclado="numeric"
          ayuda={vehiculo.odometro_actual ? `Último en TittanWare: ${Math.round(vehiculo.odometro_actual).toLocaleString('es-CO')} km` : undefined} />
      </Tarjeta>

      <Seccion titulo="Toque cada llanta">
        <Tarjeta><EsquemaVehiculo ejes={ejes} alTocar={p => abrir(vehiculo.posiciones[p.numero - 1])} /></Tarjeta>
        <Texto variante="nota" tono="terciario" style={{ marginTop: ESPACIO.e2 }}>
          {inspeccionadas.length} de {vehiculo.posiciones.length} posiciones registradas
        </Texto>
      </Seccion>

      {inspeccionadas.length > 0 && (
        <Tarjeta relleno={0}>
          {inspeccionadas.map((l, i) => {
            const mm = minimo(l)
            const est = estadoPorProfundidad(mm, catalogos?.umbrales)
            return (
              <Fila key={l.posicion} titulo={`${l.posicion} · ${l.codigo || 'sin código'}`}
                detalle={[l.marca, l.referencia, mm != null ? `${mm} mm` : null, l.presion ? `${l.presion} psi` : null].filter(Boolean).join(' · ')}
                derecha={<Chip texto={l.novedades.includes('SIN_LLANTA') ? 'Vacía' : est === 'critica' ? 'Crítica' : est === 'moderada' ? 'Regular' : est ? 'Buena' : 'Sin medir'}
                  tono={est === 'critica' ? 'peligro' : est === 'moderada' ? 'moderada' : est ? 'exito' : 'neutro'} />}
                onPress={() => abrir(vehiculo.posiciones.find(p => p.codigo === l.posicion)!)} ultima={i === inspeccionadas.length - 1} />
            )
          })}
        </Tarjeta>
      )}

      <Campo etiqueta="Observaciones generales" valor={observaciones} onCambio={setObservaciones} multilinea />
      <Boton titulo="Guardar inspección" icono={Save} tamano="grande" ancho onPress={guardar} cargando={guardando}
        deshabilitado={!inspeccionadas.length} />

      <HojaInferior visible={!!abierta} onCerrar={() => setAbierta(null)} titulo={abierta ? `Posición ${abierta.label}` : ''}>
        {actual && (
          <View style={{ gap: ESPACIO.e3 }}>
            <Interruptor etiqueta="No hay llanta en esta posición" valor={actual.novedades.includes('SIN_LLANTA')}
              onCambio={v => cambiar({ novedades: v ? ['SIN_LLANTA'] : actual.novedades.filter(n => n !== 'SIN_LLANTA') })} />
            {!actual.novedades.includes('SIN_LLANTA') && (
              <>
                <Campo etiqueta="Código de la llanta" valor={actual.codigo ?? ''} onCambio={v => cambiar({ codigo: v })} sinMayusculas
                  ayuda={abierta?.llanta ? `En TittanWare: ${abierta.llanta.codigo}` : 'Sin llanta registrada en TittanWare'} />
                <Campo etiqueta="Marca" valor={actual.marca ?? ''} onCambio={v => cambiar({ marca: v })} />
                <Sugerencias opciones={catalogos?.marcas ?? []} texto={actual.marca ?? ''} onElegir={v => cambiar({ marca: v })} />
                <Campo etiqueta="Referencia" valor={actual.referencia ?? ''} onCambio={v => cambiar({ referencia: v })} />
                <Sugerencias opciones={refs} texto={actual.referencia ?? ''} onElegir={v => cambiar({ referencia: v })} />
                <Campo etiqueta="Dimensión" valor={actual.medida ?? ''} onCambio={v => cambiar({ medida: v })} sinMayusculas />
                <Sugerencias opciones={catalogos?.medidas ?? []} texto={actual.medida ?? ''} onElegir={v => cambiar({ medida: v })} />
                <Texto variante="nota" tono="secundario">Vida</Texto>
                <Segmentado opciones={VIDAS} valor={String(Math.min(actual.reencauches ?? 0, 3))}
                  onCambio={v => cambiar({ reencauches: Number(v) })} />
                <CampoNumerico etiqueta="Profundidad interna" unidad="mm" valor={actual.profundidad_interna ?? null}
                  onCambio={v => cambiar({ profundidad_interna: v })} max={40} previo={abierta?.llanta?.profundidad_actual ?? null} />
                <CampoNumerico etiqueta="Profundidad central" unidad="mm" valor={actual.profundidad_central ?? null}
                  onCambio={v => cambiar({ profundidad_central: v })} max={40} />
                <CampoNumerico etiqueta="Profundidad externa" unidad="mm" valor={actual.profundidad_externa ?? null}
                  onCambio={v => cambiar({ profundidad_externa: v })} max={40} />
                <CampoNumerico etiqueta="Presión" unidad="psi" paso={5} decimales={0} valor={actual.presion ?? null}
                  onCambio={v => cambiar({ presion: v })} max={250}
                  rango={{ min: catalogos?.umbrales.presion_min, max: catalogos?.umbrales.presion_max }}
                  previo={abierta?.llanta?.presion_recomendada ?? null} />
                <Texto variante="nota" tono="secundario">Novedades</Texto>
                <Marcables opciones={(catalogos?.novedades ?? []).filter(n => n.clave !== 'SIN_LLANTA')} elegidas={actual.novedades}
                  onCambio={v => cambiar({ novedades: v })} />
              </>
            )}
            <Campo etiqueta="Observación" valor={actual.observacion ?? ''} onCambio={v => cambiar({ observacion: v })} multilinea />
            <FilaFotos fotos={fotos.filter(f => f.posicion === abierta?.codigo)}
              onQuitar={i => { const propias = fotos.filter(f => f.posicion === abierta?.codigo); setFotos(fotos.filter(f => f !== propias[i])) }} />
            <Boton titulo="Tomar foto" icono={Camera} variante="secundario" ancho onPress={() => setCamara(true)} />
            <Boton titulo="Listo" ancho onPress={() => setAbierta(null)} />
          </View>
        )}
      </HojaInferior>
      <TomarFoto visible={camara} onCerrar={() => setCamara(false)}
        onFoto={f => setFotos(fs => [...fs, { ...f, posicion: abierta?.codigo }])} />
    </Pantalla>
  )
}
