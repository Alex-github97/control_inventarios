/**
 * Mostrar datos: indicador con tendencia, barras apiladas, anillo, progreso,
 * esqueleto de carga y el esquema de llantas de un vehículo.
 */
import { useEffect } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated'
import Svg, { Circle, Path, Rect } from 'react-native-svg'
import { TrendingDown, TrendingUp } from 'lucide-react-native'
import { useTema } from '../tema'
import { ESPACIO, RADIO } from '../tokens'
import { Texto } from './base'

export function Indicador({ etiqueta, valor, unidad, tendencia, bueno = 'sube', serie, nota }: {
  etiqueta: string; valor: string; unidad?: string; tendencia?: number; bueno?: 'sube' | 'baja'; serie?: number[]; nota?: string
}) {
  const { color } = useTema()
  const mejora = tendencia == null ? null : bueno === 'sube' ? tendencia >= 0 : tendencia <= 0
  const Flecha = (tendencia ?? 0) >= 0 ? TrendingUp : TrendingDown
  return (
    <View accessibilityLabel={`${etiqueta}: ${valor}${unidad ?? ''}`} style={{ gap: 6 }}>
      <Texto variante="nota" tono="secundario" lineas={1}>{etiqueta}</Texto>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
        <Texto variante="cifra">{valor}</Texto>
        {unidad && <Texto variante="cuerpoFuerte" tono="terciario">{unidad}</Texto>}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 18 }}>
        {tendencia != null && (
          <>
            <Flecha size={14} color={mejora ? color.exito : color.peligro} strokeWidth={2.4} />
            <Texto variante="nota" tono={mejora ? 'exito' : 'peligro'}>{tendencia > 0 ? '+' : ''}{tendencia.toLocaleString('es-CO', { maximumFractionDigits: 1 })} %</Texto>
          </>
        )}
        {nota && <Texto variante="nota" tono="terciario" lineas={1}>{nota}</Texto>}
      </View>
      {serie && serie.length > 1 && <Linea serie={serie} colorLinea={mejora === false ? color.peligro : color.acento} />}
    </View>
  )
}

function Linea({ serie, colorLinea, alto = 36 }: { serie: number[]; colorLinea: string; alto?: number }) {
  const ancho = 140
  const min = Math.min(...serie), max = Math.max(...serie), r = max - min || 1
  const pts = serie.map((v, i) => [(i / (serie.length - 1)) * ancho, alto - 3 - ((v - min) / r) * (alto - 6)])
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `${d} L${ancho},${alto} L0,${alto} Z`
  return (
    <Svg width="100%" height={alto} viewBox={`0 0 ${ancho} ${alto}`} preserveAspectRatio="none">
      <Path d={area} fill={colorLinea} opacity={0.12} />
      <Path d={d} stroke={colorLinea} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
    </Svg>
  )
}

export interface SerieApilada { clave: string; nombre: string; color: string }

/** Barras apiladas, con el total encima y la etiqueta debajo. */
export function BarrasApiladas({ datos, series, alto = 180, alTocar }: {
  datos: { etiqueta: string; valores: Record<string, number> }[]; series: SerieApilada[]; alto?: number; alTocar?: (i: number) => void
}) {
  const { color } = useTema()
  const total = (d: { valores: Record<string, number> }) => series.reduce((s, x) => s + (d.valores[x.clave] ?? 0), 0)
  const max = Math.max(1, ...datos.map(total))
  return (
    <View style={{ gap: ESPACIO.e3 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: alto, gap: 6 }}>
        {datos.map((d, i) => (
          <Pressable key={d.etiqueta} accessibilityLabel={`${d.etiqueta}: ${series.map(s => `${s.nombre} ${d.valores[s.clave] ?? 0}`).join(', ')}`}
            onPress={alTocar ? () => alTocar(i) : undefined} style={{ flex: 1, alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
            <Texto variante="mini" tono="terciario" style={{ letterSpacing: 0 }}>{total(d)}</Texto>
            <View style={{ width: '78%', height: `${(total(d) / max) * 82}%`, borderRadius: 6, overflow: 'hidden', justifyContent: 'flex-end' }}>
              {[...series].reverse().map(s => (
                <View key={s.clave} style={{ flex: d.valores[s.clave] ?? 0, backgroundColor: s.color, borderTopWidth: 1.5, borderTopColor: color.superficie }} />
              ))}
            </View>
          </Pressable>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {datos.map(d => <Texto key={d.etiqueta} variante="mini" tono="terciario" style={{ flex: 1, textAlign: 'center', letterSpacing: 0 }}>{d.etiqueta}</Texto>)}
      </View>
      <View style={{ flexDirection: 'row', gap: ESPACIO.e4, flexWrap: 'wrap' }}>
        {series.map(s => (
          <View key={s.clave} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: s.color }} />
            <Texto variante="nota" tono="secundario">{s.nombre}</Texto>
          </View>
        ))}
      </View>
    </View>
  )
}

/** Anillo de composición con el total al centro. */
export function Anillo({ partes, tamano = 150, grosor = 18, centro, subcentro }: {
  partes: { nombre: string; valor: number; color: string }[]; tamano?: number; grosor?: number; centro?: string; subcentro?: string
}) {
  const { color } = useTema()
  const total = partes.reduce((s, p) => s + p.valor, 0) || 1
  const r = (tamano - grosor) / 2, c = 2 * Math.PI * r
  const largos = partes.map(p => (p.valor / total) * c)
  const inicios = largos.map((_, i) => largos.slice(0, i).reduce((s, l) => s + l, 0))
  return (
    <View style={{ width: tamano, height: tamano, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={tamano} height={tamano} style={StyleSheet.absoluteFill}>
        <Circle cx={tamano / 2} cy={tamano / 2} r={r} stroke={color.hundida} strokeWidth={grosor} fill="none" />
        {partes.map((p, i) => (
          <Circle key={p.nombre} cx={tamano / 2} cy={tamano / 2} r={r} stroke={p.color} strokeWidth={grosor} fill="none"
            strokeDasharray={`${Math.max(0, largos[i]! - 3)} ${c}`} strokeDashoffset={-inicios[i]!} strokeLinecap="round"
            transform={`rotate(-90 ${tamano / 2} ${tamano / 2})`} />
        ))}
      </Svg>
      {centro && <Texto variante="titulo">{centro}</Texto>}
      {subcentro && <Texto variante="nota" tono="terciario">{subcentro}</Texto>}
    </View>
  )
}

export function Progreso({ valor, colorBarra }: { valor: number; colorBarra?: string }) {
  const { color } = useTema()
  const ancho = useSharedValue(0)
  useEffect(() => { ancho.set(withTiming(Math.max(0, Math.min(1, valor)), { duration: 600, easing: Easing.out(Easing.cubic) })) }, [valor, ancho])
  const estilo = useAnimatedStyle(() => ({ width: `${ancho.get() * 100}%` }))
  return (
    <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(valor * 100) }}
      style={{ height: 8, borderRadius: 4, backgroundColor: color.hundida, overflow: 'hidden' }}>
      <Animated.View style={[{ height: '100%', borderRadius: 4, backgroundColor: colorBarra ?? color.acento }, estilo]} />
    </View>
  )
}

/** Mientras carga: formas suaves que respiran, nunca una pantalla en blanco. */
export function Esqueleto({ alto = 16, ancho = '100%', radio = RADIO.chico }: { alto?: number; ancho?: number | `${number}%`; radio?: number }) {
  const { color } = useTema()
  const o = useSharedValue(0.55)
  useEffect(() => { o.set(withRepeat(withTiming(1, { duration: 850, easing: Easing.inOut(Easing.quad) }), -1, true)) }, [o])
  const estilo = useAnimatedStyle(() => ({ opacity: o.get() }))
  return <Animated.View accessibilityElementsHidden style={[{ height: alto, width: ancho, borderRadius: radio, backgroundColor: color.hundida }, estilo]} />
}

export interface PosicionLlanta {
  numero: number; eje: number; lado: 'izq' | 'der'; dual?: 'ext' | 'int'; mm: number | null; estado: 'critica' | 'moderada' | 'buena' | null
  /** Lo de la medición anterior, para mostrarlo tenue mientras no se mide de nuevo. */
  mmPrevio?: number | null
}

/** El esquema de un vehículo visto desde arriba, con cada llanta en el color de su rango. */
export function EsquemaVehiculo({ ejes, alTocar, seleccion, profundidades = false }: {
  ejes: { posiciones: PosicionLlanta[] }[]; alTocar?: (p: PosicionLlanta) => void; seleccion?: number | null
  /** Muestra en cada llanta su profundidad (mm) debajo del número. */
  profundidades?: boolean
}) {
  const { color } = useTema()
  const tono = (e: PosicionLlanta['estado']) => e === 'critica' ? color.peligro : e === 'moderada' ? color.moderada : e === 'buena' ? color.exito : color.bordeFuerte
  const ancho = 240, altoEje = 78, alto = ejes.length * altoEje + 40
  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={ancho} height={alto}>
        <Rect x={ancho / 2 - 34} y={8} width={68} height={alto - 16} rx={18} fill={color.hundida} stroke={color.borde} />
        <Rect x={ancho / 2 - 26} y={16} width={52} height={36} rx={10} fill={color.superficie} stroke={color.borde} />
        {ejes.map((_, i) => (
          <Rect key={i} x={40} y={40 + i * altoEje + altoEje / 2 - 2} width={ancho - 80} height={4} rx={2} fill={color.bordeFuerte} />
        ))}
      </Svg>
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center' }]} pointerEvents="box-none">
        <View style={{ width: ancho, height: alto }}>
          {ejes.flatMap((eje, i) => eje.posiciones.map(p => {
            const dual = eje.posiciones.filter(x => x.lado === p.lado).length > 1
            const x = p.lado === 'izq' ? (dual && p.dual === 'int' ? 34 : 4) : (dual && p.dual === 'int' ? ancho - 34 - 28 : ancho - 4 - 28)
            const sel = seleccion === p.numero
            const mm = p.mm ?? p.mmPrevio ?? null
            return (
              <Pressable key={p.numero} accessibilityRole="button"
                accessibilityLabel={`Posición ${p.numero}${p.mm != null ? `, ${p.mm} milímetros` : ', sin medir'}`}
                onPress={alTocar ? () => alTocar(p) : undefined}
                style={{ position: 'absolute', left: x, top: 40 + i * altoEje + altoEje / 2 - 26, width: 28, height: 52, borderRadius: 8,
                  backgroundColor: tono(p.estado), borderWidth: sel ? 3 : 0, borderColor: color.texto, alignItems: 'center', justifyContent: 'center' }}>
                <Texto variante="mini" tono="sobreAcento" style={{ letterSpacing: 0, color: color.superficie, opacity: profundidades ? 0.8 : 1 }}>{p.numero}</Texto>
                {profundidades && (
                  <Texto variante="mini" style={{ letterSpacing: -0.3, fontSize: 10, color: color.superficie, fontFamily: 'Inter_800ExtraBold',
                    opacity: p.mm == null ? 0.75 : 1 }}>{mm == null ? '—' : String(Math.round(mm * 10) / 10)}</Texto>
                )}
              </Pressable>
            )
          }))}
        </View>
      </View>
    </View>
  )
}
