/**
 * Inicio de TittanLite: buscar el vehículo a inspeccionar, registrar una
 * disposición final y ver qué se envió (y qué espera señal).
 */
import { useMemo, useState } from 'react'
import { View } from 'react-native'
import { router } from 'expo-router'
import { CircleSlash, LogOut, RefreshCw, Search, Send, Truck } from 'lucide-react-native'
import {
  Avatar, AvisoSincronizacion, Boton, BotonIcono, Campo, Chip, ESPACIO, Esqueleto, EstadoVacio, Fila, HojaInferior,
  Pantalla, Seccion, Tarjeta, Texto, type TonoChip,
} from '@/diseno'
import { useSesion } from '@/datos/sesion'
import { useCola, useDatosLite } from '@/datos/lite'
import { VERSION_APP } from '@/datos/config'
import { EnviarInforme } from '@/lite/enviar'

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
  const [enviar, setEnviar] = useState(false)

  const lista = useMemo(() => {
    const t = buscar.trim().toLowerCase()
    const todos = vehiculos ?? []
    return (t ? todos.filter(v => [v.placa, v.codigo, v.nombre, v.marca].some(x => (x ?? '').toLowerCase().includes(t))) : todos).slice(0, 40)
  }, [vehiculos, buscar])
  const nombre = usuario ? `${usuario.nombre} ${usuario.apellido}`.trim() : ''
  const conError = cola.filter(c => c.error).length

  return (
    <Pantalla subtitulo={nombreEmpresa ?? undefined} titulo="TittanLite"
      accion={<View style={{ flexDirection: 'row', gap: ESPACIO.e2 }}>
        <BotonIcono icono={RefreshCw} etiqueta="Actualizar" onPress={() => { actualizar(); sincronizar() }} />
        <Avatar nombre={nombre || 'Usuario'} tamano={48} onPress={() => setPerfil(true)} />
      </View>}>
      <AvisoSincronizacion enLinea={enLinea} pendientes={cola.length} rechazados={conError}
        ultima={ultima ?? undefined} onSincronizar={sincronizar} />

      <Tarjeta style={{ gap: ESPACIO.e3 }}>
        <Texto variante="subtitulo">Disposición final</Texto>
        <Texto tono="secundario">Registre una llanta que se desecha: daño, profundidades y fotos.</Texto>
        <Boton titulo="Registrar disposición" icono={CircleSlash} variante="secundario" ancho
          onPress={() => router.push('/lite/disposicion')} />
      </Tarjeta>

      <Tarjeta style={{ gap: ESPACIO.e3 }}>
        <Texto variante="subtitulo">Informes</Texto>
        <Texto tono="secundario">Mande al cliente el informe de lo inspeccionado o el plan de recambio, por WhatsApp o Telegram.</Texto>
        <Boton titulo="Enviar informe" icono={Send} variante="secundario" ancho onPress={() => setEnviar(true)} />
      </Tarjeta>

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
                return (
                  <Fila key={v.activo_id} icono={Truck} titulo={v.placa || v.codigo}
                    detalle={[v.tipo, v.marca, `${montadas}/${v.posiciones.length} llantas`].filter(Boolean).join(' · ')}
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

      <EnviarInforme visible={enviar} onCerrar={() => setEnviar(false)} />
      <HojaInferior visible={perfil} onCerrar={() => setPerfil(false)} titulo={nombre}>
        <Texto tono="secundario">{nombreEmpresa} · TittanLite {VERSION_APP}</Texto>
        <View style={{ marginTop: ESPACIO.e4 }}>
          <Boton titulo="Cerrar sesión" icono={LogOut} variante="peligro" ancho onPress={() => { setPerfil(false); salir() }} />
        </View>
      </HojaInferior>
    </Pantalla>
  )
}
