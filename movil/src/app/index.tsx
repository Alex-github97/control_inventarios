/** Entrada: con el teléfono vinculado, a sus órdenes; si no, al ingreso. */
import { Redirect } from 'expo-router'
import { useSesion } from '@/datos/sesion'

export default function Inicio() {
  const { cargando, usuario } = useSesion()
  if (cargando) return null
  return <Redirect href={usuario ? '/ordenes' : '/ingreso'} />
}
