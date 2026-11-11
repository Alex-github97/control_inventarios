/**
 * Ajustes del inspector: orden de recorrido de las llantas, orden de los datos
 * de cada llanta, y el medidor de profundidad Bluetooth.
 */
import { Pressable, ScrollView, View } from 'react-native'
import { router } from 'expo-router'
import { ArrowDown, ArrowUp, Bluetooth, CheckCircle2, Circle } from 'lucide-react-native'
import { Boton, ESPACIO, Interruptor, Tarjeta, Texto, useTema } from '@/diseno'
import { CabeceraLite } from '@/lite/marca'
import { abrirBluetooth } from '@/lite/medidor'
import { PASOS, RUTAS, usePreferencias, type Paso } from '@/lite/preferencias'

export default function AjustesLite() {
  const { color } = useTema()
  const { pref, cambiar } = usePreferencias()
  const mover = (i: number, d: -1 | 1) => {
    const p: Paso[] = [...pref.pasos]
    const j = i + d
    if (j < 0 || j >= p.length) return
    ;[p[i], p[j]] = [p[j], p[i]]
    cambiar({ pasos: p })
  }
  return (
    <View style={{ flex: 1, backgroundColor: color.fondo }}>
      <CabeceraLite titulo="Ajustes de inspección" subtitulo="TittanLite" volver={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: ESPACIO.e4, gap: ESPACIO.e4, paddingBottom: ESPACIO.e8 }}>
        <Tarjeta style={{ gap: ESPACIO.e2 }}>
          <Texto variante="subtitulo">Orden de las llantas</Texto>
          <Texto variante="nota" tono="secundario">Cómo recorre el vehículo. La inspección le presenta las llantas en ese orden.</Texto>
          {RUTAS.map(r => {
            const si = pref.ruta === r.valor
            const Icono = si ? CheckCircle2 : Circle
            return (
              <Pressable key={r.valor} accessibilityRole="radio" accessibilityState={{ selected: si }} accessibilityLabel={r.texto}
                onPress={() => cambiar({ ruta: r.valor })} style={{ flexDirection: 'row', gap: ESPACIO.e3, paddingVertical: ESPACIO.e2, alignItems: 'center' }}>
                <Icono size={24} color={si ? color.acento : color.textoTerciario} />
                <View style={{ flex: 1 }}>
                  <Texto variante="cuerpoFuerte">{r.texto}</Texto>
                  <Texto variante="nota" tono="terciario">{r.detalle}</Texto>
                </View>
              </Pressable>
            )
          })}
        </Tarjeta>

        <Tarjeta style={{ gap: ESPACIO.e2 }}>
          <Texto variante="subtitulo">Orden de los datos de cada llanta</Texto>
          <Texto variante="nota" tono="secundario">Lo que primero toma, arriba.</Texto>
          {pref.pasos.map((p, i) => (
            <View key={p} style={{ flexDirection: 'row', alignItems: 'center', gap: ESPACIO.e2, minHeight: 48 }}>
              <Texto variante="cuerpoFuerte" tono="acento" style={{ width: 24 }}>{i + 1}</Texto>
              <Texto style={{ flex: 1 }}>{PASOS[p]}</Texto>
              <Pressable accessibilityRole="button" accessibilityLabel={`Subir ${PASOS[p]}`} disabled={i === 0} onPress={() => mover(i, -1)}
                hitSlop={6} style={{ padding: 8, opacity: i === 0 ? 0.3 : 1 }}>
                <ArrowUp size={22} color={color.texto} />
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={`Bajar ${PASOS[p]}`} disabled={i === pref.pasos.length - 1}
                onPress={() => mover(i, 1)} hitSlop={6} style={{ padding: 8, opacity: i === pref.pasos.length - 1 ? 0.3 : 1 }}>
                <ArrowDown size={22} color={color.texto} />
              </Pressable>
            </View>
          ))}
        </Tarjeta>

        <Tarjeta style={{ gap: ESPACIO.e3 }}>
          <Texto variante="subtitulo">Medidor de profundidad Bluetooth</Texto>
          <Texto variante="nota" tono="secundario">
            Empareje el medidor una vez en el Bluetooth del teléfono (se conecta como teclado). Con el modo activo, cada lectura llena
            el siguiente surco: externo, central e interno.
          </Texto>
          <Boton titulo="Emparejar medidor" icono={Bluetooth} variante="secundario" ancho onPress={abrirBluetooth} />
          <Interruptor etiqueta="Usar el medidor en la inspección" valor={pref.medidor} onCambio={v => cambiar({ medidor: v })} />
          <Interruptor etiqueta="Pasar a la siguiente llanta al completar los 3 surcos" valor={pref.avanceAutomatico}
            onCambio={v => cambiar({ avanceAutomatico: v })} />
        </Tarjeta>
      </ScrollView>
    </View>
  )
}
