/**
 * Crear, editar y eliminar, empaquetado.
 *
 * Cada pantalla de negocio necesita lo mismo: abrir un formulario vacío, abrir
 * el mismo formulario con un registro dentro, confirmar un borrado, refrescar la
 * lista y avisar de cómo fue. Escrito a mano son unas ciento cincuenta líneas
 * por pantalla, y con quince pantallas eso son quince sitios donde el mensaje de
 * error se redacta distinto y donde alguien olvida invalidar la consulta.
 *
 * Aquí se declara qué hace cada operación y el resto sale igual en todas partes.
 */
import { ReactNode, useState } from 'react'
import { Box, Button, IconButton, Tooltip } from '@mui/material'
import { Add, EditOutlined, DeleteOutline } from '@mui/icons-material'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import FormularioEntidad, {
  CampoEntidad, ConfirmarBorrado,
} from './FormularioEntidad'

interface Opciones<T> {
  /** Cómo se llama una unidad: «cliente», «ticket». Se usa en los textos. */
  nombre: string
  /** Femenino, para que los mensajes concuerden: «la cotización se eliminó». */
  genero?: 'm' | 'f'
  campos: CampoEntidad[] | ((registro: T | null) => CampoEntidad[])
  crear?: (datos: Record<string, any>) => Promise<unknown>
  editar?: (id: number, datos: Record<string, any>) => Promise<unknown>
  eliminar?: (id: number) => Promise<unknown>
  /** Qué invalidar al terminar. Por defecto, todo lo del módulo. */
  claves?: unknown[]
  /** Cómo se identifica un registro en los avisos y en la confirmación. */
  titulo?: (r: T) => string
  /** Qué más desaparece al borrar. Callarlo hace que la gente asuma que nada. */
  consecuencia?: (r: T) => string | undefined
  /** Para lo que no se puede rehacer: obliga a teclear el nombre. */
  exigeEscribir?: (r: T) => string | undefined
}

export function useCrud<T extends { id: number }>(o: Opciones<T>) {
  const qc = useQueryClient()
  const [editando, setEditando] = useState<T | null>(null)
  const [creando, setCreando] = useState(false)
  const [borrando, setBorrando] = useState<T | null>(null)

  const el = o.genero === 'f' ? 'la' : 'el'
  const un = o.genero === 'f' ? 'una' : 'un'
  const nombrar = (r: T) => o.titulo?.(r) ?? `${o.nombre} #${r.id}`

  const refrescar = () => {
    for (const clave of (o.claves ?? [['crm']]) as unknown[]) {
      qc.invalidateQueries({ queryKey: clave as any })
    }
  }

  const guardar = useMutation({
    mutationFn: async (datos: Record<string, any>) =>
      editando ? o.editar!(editando.id, datos) : o.crear!(datos),
    onSuccess: () => {
      toast.success(editando
        ? `${el.charAt(0).toUpperCase() + el.slice(1)} ${o.nombre} se guardó`
        : `Se creó ${un} ${o.nombre}`)
      setCreando(false)
      setEditando(null)
      refrescar()
    },
    // El error NO cierra el formulario: se muestra dentro, junto al campo que lo
    // causó, para no perder lo que la persona escribió.
  })

  const quitar = useMutation({
    mutationFn: (r: T) => o.eliminar!(r.id),
    onSuccess: (_d, r) => {
      toast.success(`${nombrar(r)} se eliminó`)
      setBorrando(null)
      refrescar()
    },
    onError: (e: any) => {
      // El servidor explica por qué no se pudo —«tiene tres contratos»—, y esa
      // frase es lo único que le dice a la persona qué hacer a continuación.
      toast.error(e?.response?.data?.detail ?? 'No se pudo eliminar', {
        duration: 7000,
      })
      setBorrando(null)
    },
  })

  const campos = typeof o.campos === 'function'
    ? o.campos(editando) : o.campos

  /** El botón de «Nuevo» para la cabecera de la pantalla. */
  const BotonNuevo = ({ etiqueta }: { etiqueta?: string }) =>
    o.crear ? (
      <Button variant="contained" size="small" startIcon={<Add />}
        onClick={() => { guardar.reset(); setCreando(true) }}
        sx={{ textTransform: 'none' }}>
        {etiqueta ?? `Nuevo ${o.nombre}`}
      </Button>
    ) : null

  /**
   * Los iconos de editar y eliminar para el final de cada fila o tarjeta.
   *
   * Cada botón lleva su `aria-label` con el NOMBRE del registro, no solo el de
   * la entidad. Un lector de pantalla que anuncia veinte veces «editar cliente»
   * no dice cuál, y quien no ve la pantalla se queda sin saber sobre qué fila
   * está. De paso, es lo que permite apuntarle a uno concreto desde una prueba.
   */
  const Acciones = ({ registro, extra }: { registro: T; extra?: ReactNode }) => (
    <Box sx={{ display: 'flex', gap: 0.25, justifyContent: 'flex-end' }}
      onClick={e => e.stopPropagation()}>
      {extra}
      {o.editar && (
        <Tooltip title={`Editar ${o.nombre}`}>
          <IconButton size="small" aria-label={`Editar ${nombrar(registro)}`}
            onClick={() => { guardar.reset(); setEditando(registro) }}>
            <EditOutlined sx={{ fontSize: 17 }} />
          </IconButton>
        </Tooltip>
      )}
      {o.eliminar && (
        <Tooltip title={`Eliminar ${o.nombre}`}>
          <IconButton size="small" aria-label={`Eliminar ${nombrar(registro)}`}
            onClick={() => setBorrando(registro)}>
            <DeleteOutline sx={{ fontSize: 17 }} />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  )

  /** Los dos diálogos. Se montan una sola vez al final de la pantalla. */
  const Dialogos = () => (
    <>
      <FormularioEntidad
        abierto={creando || !!editando}
        titulo={editando ? `Editar ${o.nombre}` : `Nuevo ${o.nombre}`}
        subtitulo={editando ? nombrar(editando) : undefined}
        campos={campos}
        inicial={editando as any}
        guardando={guardar.isPending}
        error={guardar.error}
        onCerrar={() => { setCreando(false); setEditando(null) }}
        onGuardar={d => guardar.mutate(d)}
      />
      <ConfirmarBorrado
        abierto={!!borrando}
        titulo={`¿Eliminar ${el} ${o.nombre}?`}
        detalle={borrando ? nombrar(borrando) : undefined}
        consecuencia={borrando ? o.consecuencia?.(borrando) : undefined}
        exigeEscribir={borrando ? o.exigeEscribir?.(borrando) : undefined}
        borrando={quitar.isPending}
        onCerrar={() => setBorrando(null)}
        onConfirmar={() => borrando && quitar.mutate(borrando)}
      />
    </>
  )

  return { BotonNuevo, Acciones, Dialogos, abrirNuevo: () => setCreando(true) }
}
