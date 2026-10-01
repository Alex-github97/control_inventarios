/**
 * Pantallas que son de la PLATAFORMA (de toda la empresa) y no de un módulo:
 * usuarios, roles, configuración general y catálogos compartidos. Muestran el
 * panel de Configuración; antes caían en el de Control de Estibas porque ese
 * era el panel «por defecto» de cualquier ruta que no fuera de un módulo.
 */
export const RUTAS_PLATAFORMA = ['/usuarios', '/configuracion', '/catalogos']

export const esRutaPlataforma = (p: string) =>
  RUTAS_PLATAFORMA.some(r => p === r || p.startsWith(r + '/'))
