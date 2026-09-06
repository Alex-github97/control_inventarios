/**
 * El formulario de crear y editar que usan los módulos de negocio.
 *
 * POR QUÉ UNO SOLO PARA TODOS
 * Porque la alternativa —un formulario escrito a mano por pantalla— produce
 * quince maneras distintas de decir «este campo es obligatorio», quince formas
 * de mostrar el error del servidor y quince sitios donde arreglar el mismo
 * fallo. Aquí se describe QUÉ campos tiene la entidad y el resto sale igual en
 * todas partes.
 *
 * TRES DECISIONES QUE IMPORTAN
 *
 * · **El error del servidor se muestra donde ocurrió.** FastAPI devuelve en qué
 *   campo falló la validación; ese detalle se lleva al campo en vez de a un
 *   aviso genérico arriba. Un «datos inválidos» sin decir cuál obliga a
 *   adivinar campo por campo.
 *
 * · **No se cierra solo si falla.** Cerrar el diálogo al enviar y mostrar el
 *   error después pierde lo que la persona escribió. Se cierra cuando el
 *   servidor confirma, y no antes.
 *
 * · **Lo que no se tocó no se envía.** Al editar se manda solo lo que cambió.
 *   Enviar el objeto entero pisa con valores viejos lo que otra persona pudo
 *   haber cambiado mientras este formulario estaba abierto.
 */
import { useEffect, useMemo, useState } from 'react'
import {
  Autocomplete, Box, Button, Dialog, DialogActions, DialogContent,
  DialogTitle, FormControlLabel, MenuItem, Stack, Switch, TextField,
  Typography, Alert, CircularProgress,
} from '@mui/material'

export type TipoCampo =
  | 'texto' | 'parrafo' | 'numero' | 'dinero' | 'porcentaje'
  | 'seleccion' | 'fecha' | 'fechahora' | 'interruptor' | 'referencia'

export interface Opcion { valor: string | number; etiqueta: string }

export interface CampoEntidad {
  clave: string
  etiqueta: string
  tipo: TipoCampo
  /** Sin él, el formulario no deja guardar y lo dice en el propio campo. */
  obligatorio?: boolean
  /** Ancho en columnas de 12. Por defecto 6 (media fila). */
  ancho?: number
  opciones?: Opcion[]
  /** Para `referencia`: la lista de la que se escoge. */
  referencias?: Opcion[]
  /** Debajo del campo. Sirve para explicar consecuencias, no para repetir la etiqueta. */
  ayuda?: string
  minimo?: number
  maximo?: number
  /** Se muestra pero no se edita: códigos que asigna el servidor, totales calculados. */
  soloLectura?: boolean
  /** Oculta el campo según lo que ya se escribió. */
  visibleSi?: (valores: Record<string, any>) => boolean
  porDefecto?: any
}

interface Props {
  abierto: boolean
  titulo: string
  subtitulo?: string
  campos: CampoEntidad[]
  /** Al editar, los valores actuales. Vacío o ausente para crear. */
  inicial?: Record<string, any> | null
  guardando?: boolean
  /** Error del servidor, tal cual llega de axios. */
  error?: unknown
  onCerrar: () => void
  onGuardar: (cambios: Record<string, any>) => void
  textoGuardar?: string
}

/** Lo que FastAPI dice que está mal, campo por campo. */
function erroresDelServidor(error: unknown): {
  porCampo: Record<string, string>; general: string | null
} {
  const detalle = (error as any)?.response?.data?.detail
  if (!detalle) {
    return { porCampo: {}, general: error ? 'No se pudo guardar.' : null }
  }
  if (typeof detalle === 'string') return { porCampo: {}, general: detalle }
  if (Array.isArray(detalle)) {
    const porCampo: Record<string, string> = {}
    const sueltos: string[] = []
    for (const d of detalle) {
      // `loc` viene como ["body", "campo"]; el último tramo es el campo.
      const campo = Array.isArray(d?.loc) ? String(d.loc[d.loc.length - 1]) : ''
      if (campo && campo !== 'body') porCampo[campo] = d?.msg ?? 'Valor no válido'
      else sueltos.push(d?.msg ?? 'Valor no válido')
    }
    return { porCampo, general: sueltos.join(' · ') || null }
  }
  return { porCampo: {}, general: 'No se pudo guardar.' }
}

const vacio = (v: any) =>
  v === undefined || v === null || (typeof v === 'string' && !v.trim())

/** Una fecha del servidor puede venir con hora; el campo de fecha quiere solo el día. */
const aValorDeCampo = (v: any, tipo: TipoCampo) => {
  if (v == null) return tipo === 'interruptor' ? false : ''
  if (tipo === 'fecha') return String(v).slice(0, 10)
  if (tipo === 'fechahora') return String(v).slice(0, 16)
  return v
}

export default function FormularioEntidad({
  abierto, titulo, subtitulo, campos, inicial, guardando, error,
  onCerrar, onGuardar, textoGuardar,
}: Props) {
  const [valores, setValores] = useState<Record<string, any>>({})
  const [tocados, setTocados] = useState<Record<string, boolean>>({})
  const [intentado, setIntentado] = useState(false)

  // Al abrir se reinicia. Sin esto, el formulario conserva lo que se escribió
  // para OTRO registro y se termina guardando el dato del anterior.
  useEffect(() => {
    if (!abierto) return
    const base: Record<string, any> = {}
    for (const c of campos) {
      base[c.clave] = aValorDeCampo(
        inicial?.[c.clave] ?? c.porDefecto ?? null, c.tipo)
    }
    setValores(base)
    setTocados({})
    setIntentado(false)
  }, [abierto, inicial])

  const { porCampo, general } = useMemo(
    () => erroresDelServidor(error), [error])

  const visibles = campos.filter(c => !c.visibleSi || c.visibleSi(valores))

  const faltantes = visibles.filter(
    c => c.obligatorio && !c.soloLectura && vacio(valores[c.clave]))

  const cambiar = (clave: string, v: any) => {
    setValores(x => ({ ...x, [clave]: v }))
    setTocados(x => ({ ...x, [clave]: true }))
  }

  const enviar = () => {
    setIntentado(true)
    if (faltantes.length) return
    const cambios: Record<string, any> = {}
    for (const c of visibles) {
      if (c.soloLectura) continue
      const actual = valores[c.clave]
      // Al crear va todo lo que tenga valor; al editar, solo lo que cambió.
      if (inicial) {
        const antes = aValorDeCampo(inicial[c.clave] ?? null, c.tipo)
        if (String(actual ?? '') === String(antes ?? '')) continue
      } else if (vacio(actual) && c.tipo !== 'interruptor') {
        continue
      }
      cambios[c.clave] =
        c.tipo === 'numero' || c.tipo === 'dinero' || c.tipo === 'porcentaje'
          ? (vacio(actual) ? null : Number(actual))
          : c.tipo === 'interruptor' ? Boolean(actual)
          : (typeof actual === 'string' ? actual.trim() : actual)
    }
    onGuardar(cambios)
  }

  return (
    <Dialog open={abierto} onClose={guardando ? undefined : onCerrar}
      maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
      <DialogTitle sx={{ fontWeight: 700, pb: subtitulo ? 0.5 : 2 }}>
        {titulo}
        {subtitulo && (
          <Typography sx={{ fontSize: 12.5, color: 'text.secondary', fontWeight: 400, mt: 0.25 }}>
            {subtitulo}
          </Typography>
        )}
      </DialogTitle>

      <DialogContent dividers>
        {general && (
          <Alert severity="error" sx={{ mb: 2, fontSize: 13 }}>{general}</Alert>
        )}

        <Box sx={{
          display: 'grid', gap: 2,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(12, 1fr)' },
        }}>
          {visibles.map(c => {
            const v = valores[c.clave]
            const faltante = c.obligatorio && !c.soloLectura && vacio(v)
            const mostrarFalta = faltante && (intentado || tocados[c.clave])
            const msg = porCampo[c.clave]
              ?? (mostrarFalta ? 'Este dato hace falta' : c.ayuda)
            const malo = !!porCampo[c.clave] || mostrarFalta
            const span = c.tipo === 'parrafo' ? 12 : (c.ancho ?? 6)

            const comun = {
              size: 'small' as const,
              fullWidth: true,
              label: c.etiqueta + (c.obligatorio ? ' *' : ''),
              value: v ?? '',
              error: malo,
              helperText: msg,
              disabled: c.soloLectura || guardando,
              onChange: (e: any) => cambiar(c.clave, e.target.value),
              onBlur: () => setTocados(x => ({ ...x, [c.clave]: true })),
            }

            return (
              <Box key={c.clave} sx={{ gridColumn: { sm: `span ${span}` } }}>
                {c.tipo === 'interruptor' ? (
                  <FormControlLabel
                    control={
                      <Switch checked={!!v} disabled={c.soloLectura || guardando}
                        onChange={e => cambiar(c.clave, e.target.checked)} />
                    }
                    label={
                      <Box>
                        <Typography sx={{ fontSize: 13.5 }}>{c.etiqueta}</Typography>
                        {c.ayuda && (
                          <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
                            {c.ayuda}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                ) : c.tipo === 'seleccion' ? (
                  <TextField {...comun} select>
                    {!c.obligatorio && <MenuItem value=""><em>Sin definir</em></MenuItem>}
                    {(c.opciones ?? []).map(o => (
                      <MenuItem key={o.valor} value={o.valor}>{o.etiqueta}</MenuItem>
                    ))}
                  </TextField>
                ) : c.tipo === 'referencia' ? (
                  // Un desplegable con doscientos clientes es inservible; con
                  // búsqueda encima, no.
                  <Autocomplete
                    size="small" disabled={c.soloLectura || guardando}
                    options={c.referencias ?? []}
                    getOptionLabel={o => o.etiqueta}
                    isOptionEqualToValue={(o, val) => o.valor === val.valor}
                    value={(c.referencias ?? []).find(o => o.valor === v) ?? null}
                    onChange={(_, o) => cambiar(c.clave, o?.valor ?? null)}
                    renderInput={p => (
                      <TextField {...p}
                        label={c.etiqueta + (c.obligatorio ? ' *' : '')}
                        error={malo} helperText={msg} />
                    )}
                  />
                ) : c.tipo === 'parrafo' ? (
                  <TextField {...comun} multiline minRows={3} />
                ) : c.tipo === 'fecha' || c.tipo === 'fechahora' ? (
                  <TextField {...comun}
                    type={c.tipo === 'fecha' ? 'date' : 'datetime-local'}
                    InputLabelProps={{ shrink: true }} />
                ) : c.tipo === 'numero' || c.tipo === 'dinero' || c.tipo === 'porcentaje' ? (
                  <TextField {...comun} type="number"
                    inputProps={{ min: c.minimo, max: c.maximo }}
                    InputProps={{
                      startAdornment: c.tipo === 'dinero'
                        ? <Box component="span" sx={{ mr: 0.5, color: 'text.secondary' }}>$</Box>
                        : undefined,
                      endAdornment: c.tipo === 'porcentaje'
                        ? <Box component="span" sx={{ ml: 0.5, color: 'text.secondary' }}>%</Box>
                        : undefined,
                    }} />
                ) : (
                  <TextField {...comun} />
                )}
              </Box>
            )
          })}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        {!!faltantes.length && intentado && (
          <Typography sx={{ fontSize: 12, color: 'error.main', mr: 'auto' }}>
            Falta{faltantes.length > 1 ? 'n' : ''} {faltantes.length} dato
            {faltantes.length > 1 ? 's' : ''} obligatorio
            {faltantes.length > 1 ? 's' : ''}.
          </Typography>
        )}
        <Button onClick={onCerrar} disabled={guardando} sx={{ textTransform: 'none' }}>
          Cancelar
        </Button>
        <Button variant="contained" onClick={enviar} disabled={guardando}
          startIcon={guardando ? <CircularProgress size={15} color="inherit" /> : undefined}
          sx={{ textTransform: 'none' }}>
          {guardando ? 'Guardando…' : (textoGuardar ?? (inicial ? 'Guardar cambios' : 'Crear'))}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

/**
 * El diálogo de confirmar un borrado.
 *
 * Pide escribir algo cuando lo que se borra arrastra otras cosas. No es un
 * trámite: es la diferencia entre un clic desafortunado y una decisión. Para lo
 * que se puede rehacer en un minuto basta con el botón.
 */
export function ConfirmarBorrado({
  abierto, titulo, detalle, consecuencia, exigeEscribir, borrando,
  onCerrar, onConfirmar,
}: {
  abierto: boolean
  titulo: string
  detalle?: string
  /** Qué más desaparece. Si no se dice, la gente asume que nada. */
  consecuencia?: string
  /** Texto que hay que teclear para habilitar el botón. */
  exigeEscribir?: string
  borrando?: boolean
  onCerrar: () => void
  onConfirmar: () => void
}) {
  const [escrito, setEscrito] = useState('')
  useEffect(() => { if (abierto) setEscrito('') }, [abierto])

  const puede = !exigeEscribir || escrito.trim() === exigeEscribir

  return (
    <Dialog open={abierto} onClose={borrando ? undefined : onCerrar}
      maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
      <DialogTitle sx={{ fontWeight: 700 }}>{titulo}</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5}>
          {detalle && (
            <Typography sx={{ fontSize: 13.5 }}>{detalle}</Typography>
          )}
          {consecuencia && (
            <Alert severity="warning" sx={{ fontSize: 12.5 }}>{consecuencia}</Alert>
          )}
          {exigeEscribir && (
            <TextField size="small" fullWidth autoFocus value={escrito}
              onChange={e => setEscrito(e.target.value)}
              label={`Escriba «${exigeEscribir}» para confirmar`} />
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCerrar} disabled={borrando} sx={{ textTransform: 'none' }}>
          Conservar
        </Button>
        <Button variant="contained" color="error" disabled={!puede || borrando}
          onClick={onConfirmar} sx={{ textTransform: 'none' }}>
          {borrando ? 'Eliminando…' : 'Eliminar'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
