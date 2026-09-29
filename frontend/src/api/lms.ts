/**
 * Plataforma de aprendizaje contra el servidor.
 *
 * Las quince pantallas del módulo eran maqueta. Casi todo lo que usan vive en
 * `lms_aprendizaje.py` (tomar un curso, calificar, catálogos editables,
 * cifras calculadas); de `lms.py` se usan las listas de catálogos.
 */
import { apiClient } from './client'

const g = <T,>(ruta: string, params?: Record<string, unknown>) => apiClient.get<T>(`/lms${ruta}`, { params }).then(r => r.data)
const post = <T,>(ruta: string, d?: unknown) => apiClient.post<T>(`/lms${ruta}`, d).then(r => r.data)
const put = <T,>(ruta: string, d?: unknown) => apiClient.put<T>(`/lms${ruta}`, d).then(r => r.data)
const del = (ruta: string) => apiClient.delete(`/lms${ruta}`)

/** CRUD de catálogo: lista de `lms.py`, escritura en `/lms/admin/...`. */
const catalogo = <T,>(lista: string, admin: string) => ({
  listar: () => g<T[]>(lista),
  crear: (d: Partial<T>) => post<T>(`/admin/${admin}`, d),
  editar: (id: number, d: Partial<T>) => put<T>(`/admin/${admin}/${id}`, d),
  retirar: (id: number) => del(`/admin/${admin}/${id}`),
})

export interface Curso {
  id: number; codigo: string; nombre: string; descripcion?: string | null; instructor_id?: number | null
  modalidad: string; nivel: string; estado: string; duracion_horas: number; categoria?: string | null
  es_obligatorio: boolean; puntaje_aprobacion: number
  instructor?: string | null; total_inscritos?: number; total_completados?: number; total_contenidos?: number
  mi_estado?: string | null
}
export interface Contenido { id: number; modulo_id: number; tipo: string; titulo: string; descripcion?: string | null; url?: string | null; duracion_minutos: number; orden: number; completado?: boolean }
export interface Modulo { id: number; nombre: string; orden: number; duracion_horas: number; contenidos: Contenido[] }
export interface Inscripcion { id: number; usuario_id: number; curso_id: number; estado: string; progreso_pct: number; nota_final: number | null; fecha_inicio?: string | null; fecha_fin?: string | null }
export interface EvaluacionResumen { id: number; codigo: string; nombre: string; tipo: string; intentos_maximos: number; puntaje_aprobacion: number; tiempo_limite_min?: number | null }
export interface CursoDetalle extends Curso { modulos: Modulo[]; evaluaciones: EvaluacionResumen[]; inscripcion: Inscripcion | null }

export interface IntentoAbierto {
  intento_id: number; numero_intento: number; intentos_maximos: number; tiempo_limite_min?: number | null
  inicio: string; puntaje_aprobacion: number; nombre: string
  preguntas: { id: number; tipo: string; enunciado: string; puntaje: number; opciones: { id: number; texto: string }[] }[]
}
export interface ResultadoIntento {
  puntaje: number; aprobado: boolean; puntaje_aprobacion: number; fuera_de_tiempo: boolean
  intentos_restantes: number; detalle: { pregunta_id: number; correcta: boolean }[]
  certificado_emitido: { numero: string; certificacion: string; vence: string } | null
}
export interface MiAprendizaje {
  usuario: { id: number; nombre: string; cargo?: string | null }
  cursos: (Inscripcion & { curso: string; codigo: string; modalidad: string; duracion_horas: number; es_obligatorio: boolean })[]
  certificados: { id: number; numero: string; certificacion: string; emision: string; vence: string | null; estado: string }[]
  insignias: { nombre: string; icono?: string | null; color?: string | null; puntos: number; fecha: string | null }[]
  puntos: number; horas_completadas: number
}

export interface Facultad { id: number; nombre: string; descripcion?: string | null; color?: string | null }
export interface Escuela { id: number; facultad_id: number; nombre: string; descripcion?: string | null; facultad?: string }
export interface Programa { id: number; escuela_id: number; codigo: string; nombre: string; descripcion?: string | null; tipo: string; duracion_horas: number }
export interface Instructor { id: number; nombre: string; email?: string | null; especialidad?: string | null; tipo: string }
export interface Competencia { id: number; codigo: string; nombre: string; descripcion?: string | null; categoria?: string | null }
export interface FilaMatriz { id: number; cargo: string; area?: string | null; competencia_id: number; competencia: string | null; nivel_requerido: string; nivel_actual: string | null; brecha: number }
export interface Ruta { id: number; codigo: string; nombre: string; descripcion?: string | null; cargo_objetivo?: string | null; area_objetivo?: string | null; duracion_total_horas: number; cursos: { id: number; codigo: string; nombre: string; duracion_horas: number; estado: string }[] }
export interface Pregunta { id: number; codigo: string; tipo: string; enunciado: string; nivel_dificultad: string; categoria?: string | null; puntaje: number; opciones: { id?: number; texto: string; es_correcta: boolean }[]; en_evaluaciones: number }
export interface Evaluacion {
  id: number; codigo: string; curso_id: number | null; curso: string | null; nombre: string; tipo: string; descripcion?: string | null
  tiempo_limite_min: number | null; intentos_maximos: number; puntaje_aprobacion: number; aleatorizar_preguntas: boolean; activo: boolean
  pregunta_ids: number[]; intentos: number; promedio: number | null; aprobados: number
}
export interface Certificacion { id: number; codigo: string; nombre: string; descripcion?: string | null; curso_id?: number | null; programa_id?: number | null; vigencia_meses: number; entidad_emisora?: string | null }
export interface CertificadoEmitido { id: number; numero: string; certificacion_id: number; certificacion: string; usuario_id: number; usuario: string; emision: string; vence: string | null; dias_restantes: number | null; estado: string }
export interface Insignia { id: number; nombre: string; descripcion?: string | null; icono?: string | null; color?: string | null; tipo?: string | null; criterio?: string | null; puntos_otorgados: number; total_otorgadas?: number }
export interface PersonaLMS { id: number; nombre: string; cargo?: string | null }

export const lmsApi = {
  catalogo: () => g<Curso[]>('/catalogo'),
  curso: (id: number) => g<CursoDetalle>(`/cursos/${id}/detalle`),
  crearCurso: (d: Partial<Curso>) => post<Curso>('/cursos/nuevo', d),
  editarCurso: (id: number, d: Partial<Curso>) => put<Curso>(`/cursos/${id}`, d),
  archivarCurso: (id: number) => del(`/cursos/${id}`),
  competenciasCurso: (id: number) => g<number[]>(`/cursos/${id}/competencias`),
  fijarCompetencias: (id: number, competencia_ids: number[]) => put(`/cursos/${id}/competencias`, { competencia_ids }),
  crearModulo: (cursoId: number, d: Partial<Modulo>) => post(`/cursos/${cursoId}/modulos`, d),
  editarModulo: (id: number, d: Partial<Modulo>) => put(`/modulos/${id}`, d),
  borrarModulo: (id: number) => del(`/modulos/${id}`),
  crearContenido: (d: Partial<Contenido>) => post('/contenidos', d),
  editarContenido: (id: number, d: Partial<Contenido>) => put(`/contenidos/${id}`, d),
  borrarContenido: (id: number) => del(`/contenidos/${id}`),

  inscribirme: (cursoId: number) => post<Inscripcion>(`/cursos/${cursoId}/inscribirme`),
  inscribirVarios: (curso_id: number, usuario_ids: number[]) => post<{ inscritos: number; ya_estaban: number }>('/inscripciones/masiva', { curso_id, usuario_ids }),
  completar: (contenidoId: number, minutos = 0) =>
    apiClient.post<{ inscripcion: Inscripcion; certificado_emitido: ResultadoIntento['certificado_emitido'] }>(`/lms/contenidos/${contenidoId}/completar`, null, { params: { minutos } }).then(r => r.data),
  iniciarEvaluacion: (id: number) => post<IntentoAbierto>(`/evaluaciones/${id}/iniciar`),
  entregar: (intentoId: number, respuestas: { pregunta_id: number; opcion_id: number | null }[]) =>
    post<ResultadoIntento>(`/intentos/${intentoId}/entregar`, { respuestas }),
  miAprendizaje: () => g<MiAprendizaje>('/mi-aprendizaje'),

  facultades: catalogo<Facultad>('/facultades', 'facultades'),
  escuelas: catalogo<Escuela>('/escuelas', 'escuelas'),
  programas: catalogo<Programa>('/programas', 'programas'),
  instructores: catalogo<Instructor>('/instructores', 'instructores'),
  competencias: catalogo<Competencia>('/competencias', 'competencias'),
  certificaciones: catalogo<Certificacion>('/certificaciones', 'certificaciones'),
  insignias: {
    ...catalogo<Insignia>('/insignias', 'insignias'),
    otorgar: (id: number, usuario_id: number) => post(`/admin/insignias/${id}/otorgar`, { usuario_id }),
  },
  matriz: {
    listar: () => g<FilaMatriz[]>('/admin/matriz'),
    crear: (d: Partial<FilaMatriz>) => post<FilaMatriz>('/admin/matriz', d),
    editar: (id: number, d: Partial<FilaMatriz>) => put<FilaMatriz>(`/admin/matriz/${id}`, d),
    retirar: (id: number) => del(`/admin/matriz/${id}`),
  },
  rutas: {
    listar: () => g<Ruta[]>('/admin/rutas'),
    crear: (d: Partial<Ruta> & { curso_ids?: number[] }) => post<Ruta>('/admin/rutas', d),
    editar: (id: number, d: Partial<Ruta> & { curso_ids?: number[] }) => put<Ruta>(`/admin/rutas/${id}`, d),
    retirar: (id: number) => del(`/admin/rutas/${id}`),
  },
  preguntas: {
    listar: () => g<Pregunta[]>('/admin/preguntas'),
    crear: (d: Partial<Pregunta>) => post<Pregunta>('/admin/preguntas', d),
    editar: (id: number, d: Partial<Pregunta>) => put<Pregunta>(`/admin/preguntas/${id}`, d),
    retirar: (id: number) => del(`/admin/preguntas/${id}`),
  },
  evaluaciones: {
    listar: () => g<Evaluacion[]>('/admin/evaluaciones'),
    crear: (d: Partial<Evaluacion>) => post<Evaluacion>('/admin/evaluaciones', d),
    editar: (id: number, d: Partial<Evaluacion>) => put<Evaluacion>(`/admin/evaluaciones/${id}`, d),
    retirar: (id: number) => del(`/admin/evaluaciones/${id}`),
  },
  certificados: () => g<CertificadoEmitido[]>('/admin/certificados'),
  tablero: () => g<Record<string, number | null>>('/tablero'),
  reportes: () => g<{
    top_cursos: { curso: string; codigo: string; inscritos: number; completados: number; nota_promedio: number | null; tasa: number | null }[]
    horas_por_mes: { mes: string; horas: number }[]; obligatorios: string[]
    cumplimiento_por_cargo: { cargo: string; personas: number; cursos: { curso: string; completaron: number }[] }[]
  }>('/reportes/resumen'),
  onboarding: () => g<{
    obligatorios: { id: number; nombre: string; duracion_horas: number }[]
    personas: { usuario_id: number; nombre: string; cargo?: string | null; ingreso: string | null; completados: number; total: number; avance_pct: number | null; cursos: { curso_id: number; curso: string; estado: string; progreso_pct: number }[] }[]
  }>('/onboarding/avance'),
  ranking: () => g<{ posicion: number; usuario_id: number; nombre: string; puntos: number; insignias: number; cursos_completados: number }[]>('/ranking'),
  biblioteca: () => g<(Contenido & { modulo: string; curso_id: number; curso: string; categoria?: string | null })[]>('/biblioteca'),
  recomendaciones: (usuario_id?: number) => g<{ usuario: PersonaLMS; cursos: (Curso & { razones: string[] })[] }>('/recomendaciones', usuario_id ? { usuario_id } : undefined),
  personas: () => g<PersonaLMS[]>('/usuarios'),
}
