/**
 * Disposición final en campo: la llanta que se desecha, su daño (del catálogo
 * de la cuenta), profundidades y fotos del número, del daño y de la banda.
 */
import { useState } from 'react'
import { Pressable, View } from 'react-native'
import { router } from 'expo-router'
import { ArrowLeft, Camera, Save } from 'lucide-react-native'
import {
  Boton, BotonIcono, Campo, CampoNumerico, ESPACIO, Fila, HojaInferior, Pantalla, Seccion, Segmentado, Tarjeta, Texto, useTema,
} from '@/diseno'
import { useSesion } from '@/datos/sesion'
import { nuevoUuid, useCola, useDatosLite, type FotoPendiente } from '@/datos/lite'
import { FilaFotos, Sugerencias, TomarFoto } from '@/lite/componentes'

const VIDAS = [{ valor: '0', texto: 'Nueva' }, { valor: '1', texto: 'R1' }, { valor: '2', texto: 'R2' }, { valor: '3', texto: 'R3+' }]

export default function DisposicionLite() {
  const { color } = useTema()
  const { usuario } = useSesion()
  const { catalogos } = useDatosLite()
  const { agregar } = useCola()
  const [codigo, setCodigo] = useState('')
  const [dano, setDano] = useState<number | null>(null)
  const [elegirDano, setElegirDano] = useState(false)
  const [filtroDano, setFiltroDano] = useState('')
  const [marca, setMarca] = useState('')
  const [referencia, setReferencia] = useState('')
  const [medida, setMedida] = useState('')
  const [vida, setVida] = useState('0')
  const [pi, setPi] = useState<number | null>(null)
  const [pc, setPc] = useState<number | null>(null)
  const [pe, setPe] = useState<number | null>(null)
  const [reparaciones, setReparaciones] = useState<number | null>(null)
  const [ubicacion, setUbicacion] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [fotos, setFotos] = useState<FotoPendiente[]>([])
  const [camara, setCamara] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const danoElegido = catalogos?.danos.find(d => d.id === dano)
  const danos = (catalogos?.danos ?? []).filter(d => !filtroDano.trim()
    || `${d.codigo} ${d.nombre} ${d.ubicacion ?? ''}`.toLowerCase().includes(filtroDano.trim().toLowerCase()))
  const refs = (catalogos?.referencias ?? []).filter(r => !marca || r.marca.toLowerCase() === marca.toLowerCase()).map(r => r.referencia)

  const guardar = async () => {
    setGuardando(true)
    try {
      await agregar({
        uuid: nuevoUuid(), tipo: 'disposicion', creado: new Date().toISOString(), placa: `Llanta ${codigo.trim()}`, fotos,
        cuerpo: {
          uuid: nuevoUuid(), fecha: new Date().toISOString(), codigo: codigo.trim(), dano_id: dano,
          marca: marca || null, referencia: referencia || null, medida: medida || null, reencauches: Number(vida),
          profundidad_interna: pi, profundidad_central: pc, profundidad_externa: pe, reparaciones,
          ubicacion_actual: ubicacion || null, observaciones: observaciones || null,
          inspector: usuario ? `${usuario.nombre} ${usuario.apellido}`.trim() : null,
        },
      })
      router.back()
    } finally { setGuardando(false) }
  }

  return (
    <Pantalla subtitulo="TittanLite" titulo="Disposición final"
      accion={<BotonIcono icono={ArrowLeft} etiqueta="Volver" onPress={() => router.back()} />}>
      <Tarjeta style={{ gap: ESPACIO.e3 }}>
        <Campo etiqueta="Código de la llanta" valor={codigo} onCambio={setCodigo} sinMayusculas />
        <Pressable accessibilityRole="button" onPress={() => setElegirDano(true)}
          style={{ borderRadius: 16, padding: ESPACIO.e4, backgroundColor: color.hundida }}>
          <Texto variante="nota" tono="secundario">Daño</Texto>
          <Texto>{danoElegido ? `${danoElegido.codigo} · ${danoElegido.nombre}` : 'Elegir del catálogo'}</Texto>
          {danoElegido?.ubicacion && <Texto variante="nota" tono="terciario">{danoElegido.ubicacion} · {danoElegido.causa}</Texto>}
        </Pressable>
      </Tarjeta>

      <Seccion titulo="La llanta">
        <Tarjeta style={{ gap: ESPACIO.e3 }}>
          <Campo etiqueta="Marca" valor={marca} onCambio={setMarca} />
          <Sugerencias opciones={catalogos?.marcas ?? []} texto={marca} onElegir={setMarca} />
          <Campo etiqueta="Referencia" valor={referencia} onCambio={setReferencia} />
          <Sugerencias opciones={refs} texto={referencia} onElegir={setReferencia} />
          <Campo etiqueta="Dimensión" valor={medida} onCambio={setMedida} sinMayusculas />
          <Sugerencias opciones={catalogos?.medidas ?? []} texto={medida} onElegir={setMedida} />
          <Texto variante="nota" tono="secundario">Vida</Texto>
          <Segmentado opciones={VIDAS} valor={vida} onCambio={setVida} />
        </Tarjeta>
      </Seccion>

      <Seccion titulo="Lo que se encontró">
        <Tarjeta style={{ gap: ESPACIO.e3 }}>
          <CampoNumerico etiqueta="Profundidad interna" unidad="mm" valor={pi} onCambio={setPi} max={40} />
          <CampoNumerico etiqueta="Profundidad central" unidad="mm" valor={pc} onCambio={setPc} max={40} />
          <CampoNumerico etiqueta="Profundidad externa" unidad="mm" valor={pe} onCambio={setPe} max={40} />
          <CampoNumerico etiqueta="Reparaciones" paso={1} decimales={0} valor={reparaciones} onCambio={setReparaciones} max={30} />
          <Campo etiqueta="Dónde queda la carcasa" valor={ubicacion} onCambio={setUbicacion} />
          <Campo etiqueta="Observaciones" valor={observaciones} onCambio={setObservaciones} multilinea />
        </Tarjeta>
      </Seccion>

      <Seccion titulo="Fotos">
        <View style={{ gap: ESPACIO.e3 }}>
          <FilaFotos fotos={fotos} onQuitar={i => setFotos(fotos.filter((_, j) => j !== i))} />
          <Boton titulo="Tomar foto" icono={Camera} variante="secundario" ancho onPress={() => setCamara(true)} />
        </View>
      </Seccion>

      <Boton titulo="Guardar disposición" icono={Save} tamano="grande" ancho onPress={guardar} cargando={guardando}
        deshabilitado={!codigo.trim() || !dano} />

      <HojaInferior visible={elegirDano} onCerrar={() => setElegirDano(false)} titulo="Código de daño">
        <Campo etiqueta="Buscar" valor={filtroDano} onCambio={setFiltroDano} sinMayusculas />
        <Tarjeta relleno={0} style={{ marginTop: ESPACIO.e3 }}>
          {danos.slice(0, 40).map((d, i) => (
            <Fila key={d.id} titulo={`${d.codigo} · ${d.nombre}`} detalle={[d.ubicacion, d.causa].filter(Boolean).join(' · ')}
              onPress={() => { setDano(d.id); setElegirDano(false) }} ultima={i === Math.min(danos.length, 40) - 1} />
          ))}
        </Tarjeta>
      </HojaInferior>
      <TomarFoto visible={camara} onCerrar={() => setCamara(false)} tipos={['NUMERO', 'DANO', 'BANDA', 'OTRA']}
        onFoto={f => setFotos(fs => [...fs, f])} />
    </Pantalla>
  )
}
