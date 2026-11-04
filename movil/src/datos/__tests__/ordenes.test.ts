/** Qué órdenes son «mías»: el técnico se guarda como texto en la OT. */
import { esMia, nombreActivo, type Activo, type Orden } from '../ordenes'
import type { Usuario } from '../sesion'

const andres = { username: 'asanchez', nombre: 'Andrés', apellido: 'Sánchez' } as Usuario
const ot = (tecnico: string | null) => ({ tecnico_asignado: tecnico }) as Orden

describe('esMia', () => {
  it.each([
    ['Andrés Sánchez', true],
    ['andrés sánchez', true],
    ['  Andrés Sánchez ', true],
    ['asanchez', true],
    ['Andrés Sánchez (turno noche)', true],
    ['Andrés', false],
    ['Andrea Sánchez', false],
    ['', false],
    [null, false],
  ])('técnico %p → %p', (tecnico, esperado) => {
    expect(esMia(ot(tecnico), andres)).toBe(esperado)
  })

  it('sin usuario no hay órdenes propias', () => {
    expect(esMia(ot('Andrés Sánchez'), null)).toBe(false)
  })
})

describe('nombreActivo', () => {
  it('prefiere placa y nombre, y cae en marca y modelo', () => {
    expect(nombreActivo({ placa: 'TAC320', nombre: 'Tractocamión' } as Activo)).toBe('TAC320 · Tractocamión')
    expect(nombreActivo({ codigo: 'MON-14', marca: 'Toyota', modelo: '8FG' } as Activo)).toBe('MON-14 · Toyota 8FG')
    expect(nombreActivo(null)).toBe('Activo')
  })
})
