import { Redirect } from 'expo-router'

// Mientras se construyen el ingreso y las pantallas del CMMS, la app abre el
// catálogo del sistema de diseño para validar el nivel visual.
export default function Inicio() {
  return <Redirect href="/catalogo" />
}
