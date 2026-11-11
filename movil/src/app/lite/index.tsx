/**
 * Inicio de TittanLite: buscar el vehículo a inspeccionar, registrar una
 * disposición final y ver qué se envió (y qué espera señal).
 */
import { useMemo, useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import { router } from 'expo-router'
import { CircleSlash, LogOut, RefreshCw, Search, Send, Settings, Truck } from 'lucide-react-native'
import {
  Avatar, AvisoSincronizacion, Boton, Campo, Chip, ESPACIO, Esqueleto, EstadoVacio, Fila, HojaInferior,
  Seccion, Tarjeta, Texto, useTema, type TonoChip,
} from '@/diseno'
import { useSesion } from '@/datos/sesion'
import { useCola, useDatosLite } from '@/datos/lite'
import { VERSION_APP } from '@/datos/config'
import { CabeceraLite } from '@/lite/marca'

const TONO_SYNC: Record<string, TonoChip> = {
  SINCRONIZADA: 'exito', PARCIAL: 'alerta', RECHAZADA: 'peligro', SIN_SEGUIMIENTO: 'neutro', PENDIENTE: 'acento',
}
const TEXTO_SYNC: Record<string, string> = {
  SINCRONIZADA: 'En TittanWare', PARCIAL: 'Parcial', RECHAZADA: 'Solo en Lite', SIN_SEGUIMIENTO: 'Solo en Lite', PENDIENTE: 'Pendiente',
}

export default function InicioLite() {
  const { usuario, nombreEmpresa, salir } = useSesion()
  const { vehiculos, enLinea, cargando, actualizar } = useDatosLite()
  const { cola, hechos, ultima, sincronizar } = useCola()
  const [buscar, setBuscar] = useState('')
  const [perfil, setPerfil] = useState(false)
  const { color } = useTema()

  const lista = useMemo(() => {
    const t = buscar.trim().toLowerCase()
    const todos = vehiculos ?? []
    return (t ? todos.filter(v => [v.placa, v.codigo, v.nombre, v.marca].some(x => (x ?? '').toLowerCase().includes(t))) : todos).slice(0, 40)
  }, [vehiculos, buscar])
  const nombre = usuario ? `${usuario.nombre} ${usuario.apellido}`.trim() : ''
  const conError = cola.filter(c => c.error).length

  const accionCabecera = (Icono: typeof Truck, etiqueta: string, onPress: () => void) => (
    <Pressable accessibilityRole="button" accessibilityLabel={etiqueta} onPress={onPress} hitSlop={8}
      style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: color.velo }}>
      <Icono size={20} color={color.textoSobreAcento} />
    </Pressable>
  )

  return (
    <View style={{ flex: 1, backgroundColor: color.fondo }}>
      <CabeceraLite titulo="TittanLite" subtitulo={nombreEmpresa ?? undefined}
        accion={<View style={{ flexDirection: 'row', gap: ESPACIO.e2, alignItems: 'center' }}>
          {accionCabecera(RefreshCw, 'Actualizar', () => { actualizar(); sincronizar() })}
          {accionCabecera(Settings, 'Ajustes de inspección', () => router.push('/lite/ajustes'))}
          <Avatar nombre={nombre || 'Usuario'} tamano={40} onPress={() => setPerfil(true)} />
        </View>} />
      <ScrollView contentContainerStyle={{ padding: ESPACIO.e4, gap: ESPACIO.e4, paddingBottom: ESPACIO.e8 }} keyboardShouldPersistTaps="handled">
      <AvisoSincronizacion enLinea={enLinea} pendientes={cola.length} rechazados={conError}
        ultima={ultima ?? undefined} onSincronizar={sincronizar} />

      <View style={{ flexDirection: 'row', gap: ESPACIO.e3 }}>
        <View style={{ flex: 1 }}>
          <Boton titulo="Enviar reportes" icono={Send} ancho onPress={() => router.push('/lite/enviar')} />
        </View>
        <View style={{ flex: 1 }}>
          <Boton titulo="Disposición" icono={CircleSlash} variante="secundario" ancho onPress={() => router.push('/lite/disposicion')} />
        </View>
      </View>

      <Seccion titulo="Inspeccionar un vehículo">
        <Campo etiqueta="Buscar placa o código" valor={buscar} onCambio={setBuscar} icono={Search} sinMayusculas />
        <View style={{ marginTop: ESPACIO.e3 }}>
          {cargando && !vehiculos && <Esqueleto alto={180} />}
          {vehiculos && lista.length === 0 && (
            <EstadoVacio icono={Truck} titulo="Ningún vehículo coincide" detalle="Los vehículos se crean en TittanWare." />
          )}
          {lista.length > 0 && (
            <Tarjeta relleno={0}>
              {lista.map((v, i) => {
                const montadas = v.posiciones.filter(p => p.llanta).length
                const ult = v.ultima_inspeccion?.fecha
                return (
                  <Fila key={v.activo_id} icono={Truck} titulo={v.placa || v.codigo}
                    detalle={[v.tipo, v.marca, `${montadas}/${v.posiciones.length} llantas`,
                      ult ? `última ${new Date(ult).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}` : 'sin inspección'].filter(Boolean).join(' · ')}
                    onPress={() => router.push(`/lite/inspeccion/${v.activo_id}`)} ultima={i === lista.length - 1} />
                )
              })}
            </Tarjeta>
          )}
        </View>
      </Seccion>

      {(cola.length > 0 || hechos.length > 0) && (
        <Seccion titulo="Registros">
          <Tarjeta relleno={0}>
            {cola.map(c => (
              <Fila key={c.uuid} titulo={`${c.tipo === 'inspeccion' ? 'Inspección' : 'Disposición'} · ${c.placa}`}
                detalle={c.error ?? 'Esperando señal para enviar'}
                derecha={<Chip texto={c.error ? 'Con error' : 'Por enviar'} tono={c.error ? 'peligro' : 'acento'} />} />
            ))}
            {hechos.slice(0, 15).map((h, i) => (
              <Fila key={h.uuid} titulo={`${h.tipo === 'inspeccion' ? 'Inspección' : 'Disposición'} · ${h.placa}`}
                detalle={`${new Date(h.fecha).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })} · ${h.resumen}`}
                derecha={<Chip texto={TEXTO_SYNC[h.estado] ?? h.estado} tono={TONO_SYNC[h.estado] ?? 'neutro'} />}
                ultima={i === Math.min(hechos.length, 15) - 1} />
            ))}
          </Tarjeta>
          <Texto variante="nota" tono="terciario" style={{ marginTop: ESPACIO.e2 }}>
            «Solo en Lite»: la llanta no está en TittanWare o no pasó sus reglas. El registro queda y sale en el informe.
          </Texto>
        </Seccion>
      )}

      </ScrollView>
      <HojaInferior visible={perfil} onCerrar={() => setPerfil(false)} titulo={nombre}>
        <Texto tono="secundario">{nombreEmpresa} · TittanLite {VERSION_APP}</Texto>
        <View style={{ marginTop: ESPACIO.e4 }}>
          <Boton titulo="Cerrar sesión" icono={LogOut} variante="peligro" ancho onPress={() => { setPerfil(false); salir() }} />
        </View>
      </HojaInferior>
    </View>
  )
}
