/**
 * La barra de filtros del informe de aceite.
 *
 * POR QUÉ ENCADENADOS Y NO SEIS LISTAS SUELTAS
 * Porque la jerarquía existe: la línea pertenece a una marca y el modelo a una
 * línea. Con seis listas independientes se puede escoger «Freightliner» y
 * «ProStar», que es una combinación que no existe, y la pantalla responde con
 * cero muestras sin explicar por qué. Al encadenar, escoger la marca reduce las
 * líneas a las suyas, y cambiar la marca limpia lo que dejó de ser válido.
 *
 * POR QUÉ CADA OPCIÓN MUESTRA SU CONTEO
 * Para no escoger a ciegas. Una línea con dos muestras no sostiene ninguna
 * conclusión, y verlo antes de filtrar evita la conclusión.
 */
import { useMemo } from 'react'
import {
  Autocomplete, Box, Card, Chip, MenuItem, Stack, TextField, Typography,
} from '@mui/material'
import { FilterAltOff, TuneRounded } from '@mui/icons-material'
import { PALETA } from '@/config/marca'
import type { FiltroFlota, OpcionesFiltro, OpcionFiltro } from '@/api/lubeInterpretacion'

/** Los campos que dependen de otro, y de cuál. */
const HIJOS: Record<string, (keyof FiltroFlota)[]> = {
  marca: ['linea', 'modelo', 'motor'],
  linea: ['modelo'],
}

interface Props {
  valor: FiltroFlota
  onCambio: (f: FiltroFlota) => void
  opciones?: OpcionesFiltro
  cargando?: boolean
  /** Texto de contexto: «170 muestras · 34 equipos». */
  resumen?: string
}

function Selector({ etiqueta, campo, opciones, valor, onEscoger, ancho = 170 }: {
  etiqueta: string
  campo: keyof FiltroFlota
  opciones: OpcionFiltro[]
  valor: FiltroFlota
  onEscoger: (campo: keyof FiltroFlota, v: string | null) => void
  ancho?: number
}) {
  return (
    <TextField
      select size="small" label={etiqueta} sx={{ minWidth: ancho }}
      value={valor[campo] ?? ''}
      onChange={e => onEscoger(campo, e.target.value || null)}
      SelectProps={{ MenuProps: { PaperProps: { sx: { maxHeight: 380 } } } }}
    >
      <MenuItem value="">
        <Typography variant="body2" color="text.secondary">Todas</Typography>
      </MenuItem>
      {opciones.map(o => (
        <MenuItem key={o.valor} value={o.valor}>
          <Stack direction="row" alignItems="center" spacing={1} width="100%">
            <Typography variant="body2" sx={{ flex: 1 }}>{o.etiqueta}</Typography>
            <Typography variant="caption" color="text.secondary">
              {o.muestras}
            </Typography>
          </Stack>
        </MenuItem>
      ))}
    </TextField>
  )
}

export function FiltrosFlota({ valor, onCambio, opciones, cargando, resumen }: Props) {
  /** Escoger un padre limpia los hijos que dejaron de tener sentido. */
  const escoger = (campo: keyof FiltroFlota, v: string | null) => {
    const siguiente: FiltroFlota = { ...valor, [campo]: v }
    for (const hijo of HIJOS[campo] ?? []) siguiente[hijo] = null
    onCambio(siguiente)
  }

  /**
   * Las opciones de un nivel, acotadas por su padre y sin repetidos.
   *
   * El servidor manda una entrada por combinación hijo–padre, porque es lo que
   * permite encadenar. Cuando el padre no está escogido eso se ve como
   * duplicados: el modelo «2018» aparece cuatro veces, una por cada línea que
   * lo tiene. Se colapsan sumando los conteos, que es la lectura correcta —el
   * total de muestras de ese modelo— y no la primera de las cuatro.
   */
  const nivel = (todas: OpcionFiltro[] | undefined, padre?: string | null) => {
    const vistas = (todas ?? []).filter(o => !padre || o.padre === padre)
    if (padre) return vistas
    const unicas = new Map<string, OpcionFiltro>()
    for (const o of vistas) {
      const y = unicas.get(o.valor)
      unicas.set(o.valor, y ? { ...y, muestras: y.muestras + o.muestras } : o)
    }
    return [...unicas.values()].sort(
      (a, b) => b.muestras - a.muestras || a.etiqueta.localeCompare(b.etiqueta))
  }

  const lineas = useMemo(
    () => nivel(opciones?.lineas, valor.marca), [opciones, valor.marca])
  const modelos = useMemo(
    () => nivel(opciones?.modelos, valor.linea), [opciones, valor.linea])
  const motores = useMemo(
    () => nivel(opciones?.motores, valor.marca), [opciones, valor.marca])
  const placas = useMemo(() => (opciones?.placas ?? []).filter(o =>
    (!valor.marca || o.marca === valor.marca)
    && (!valor.linea || o.linea === valor.linea)
    && (!valor.modelo || o.modelo === valor.modelo)), [opciones, valor])

  const puestos = Object.entries(valor).filter(([, v]) => v) as [string, string][]

  return (
    <Card sx={{ borderRadius: 3, p: 2, mb: 2 }}>
      <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
        <TuneRounded sx={{ fontSize: 17, color: PALETA.acero }} />
        <Typography variant="caption" sx={{ fontWeight: 800, letterSpacing: .4 }}>
          SEGMENTO DE FLOTA
        </Typography>
        {resumen && (
          <Typography variant="caption" color="text.secondary">· {resumen}</Typography>
        )}
        <Box sx={{ flex: 1 }} />
        {puestos.length > 0 && (
          <Chip size="small" icon={<FilterAltOff sx={{ fontSize: 15 }} />}
            label="Quitar filtros" onClick={() => onCambio({})}
            sx={{ height: 24, fontSize: 11, fontWeight: 700 }} />
        )}
      </Stack>

      <Stack direction="row" spacing={1.25} flexWrap="wrap" useFlexGap>
        <Selector etiqueta="Tipo de vehículo" campo="tipo" ancho={185}
          opciones={opciones?.tipos ?? []} valor={valor} onEscoger={escoger} />
        <Selector etiqueta="Marca" campo="marca"
          opciones={opciones?.marcas ?? []} valor={valor} onEscoger={escoger} />
        <Selector etiqueta="Línea" campo="linea"
          opciones={lineas} valor={valor} onEscoger={escoger} />
        <Selector etiqueta="Modelo" campo="modelo" ancho={140}
          opciones={modelos} valor={valor} onEscoger={escoger} />
        <Selector etiqueta="Motor" campo="motor" ancho={195}
          opciones={motores} valor={valor} onEscoger={escoger} />
        <Selector etiqueta="Compartimento" campo="compartimento" ancho={165}
          opciones={opciones?.compartimentos ?? []} valor={valor}
          onEscoger={escoger} />

        {/* La placa va como buscador y no como lista: con doscientos equipos
            desplegar una lista y bajar hasta el que se busca es más lento que
            escribirlo. */}
        <Autocomplete
          size="small" sx={{ minWidth: 215 }}
          options={placas} loading={cargando}
          getOptionLabel={o => o.etiqueta}
          isOptionEqualToValue={(a, b) => a.valor === b.valor}
          value={placas.find(p => p.valor === valor.placa) ?? null}
          onChange={(_, o) => escoger('placa', o?.valor ?? null)}
          renderOption={(props, o) => (
            <li {...props} key={o.valor}>
              <Stack width="100%">
                <Stack direction="row" spacing={1}>
                  <Typography variant="body2" sx={{ flex: 1, fontWeight: 700 }}>
                    {o.etiqueta}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {o.muestras}
                  </Typography>
                </Stack>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {o.detalle}
                </Typography>
              </Stack>
            </li>
          )}
          renderInput={p => <TextField {...p} label="Placa" />}
        />
      </Stack>
    </Card>
  )
}
