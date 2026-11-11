/** Entrada: con el teléfono vinculado, a su inicio (órdenes o TittanLite); si no, al ingreso. */
import { Redirect } from 'expo-router'
import { useSesion } from '@/datos/sesion'
import { RUTA_INICIO } from '@/datos/variante'

export default function Inicio() {
  const { cargando, usuario } = useSesion()
  if (cargando) return null
  return <Redirect href={usuario ? RUTA_INICIO : '/ingreso'} />
}
