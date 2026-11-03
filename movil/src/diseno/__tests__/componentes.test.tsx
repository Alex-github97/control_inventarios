/**
 * Los componentes base hacen lo que prometen a quien no ve la pantalla:
 * responden al toque, se anuncian con su etiqueta y respetan los rangos.
 */
import type { ReactNode } from 'react'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { Wrench } from 'lucide-react-native'
import { ProveedorTema } from '../tema'
import { AvisoSincronizacion, Boton, CampoNumerico, Chip, Fila, Interruptor, Segmentado, TACTIL } from '..'

const conTema = (n: ReactNode) => render(<ProveedorTema>{n}</ProveedorTema>)

describe('Boton', () => {
  it('llama onPress y se anuncia como botón', async () => {
    const tocar = jest.fn()
    await conTema(<Boton titulo="Cerrar orden" onPress={tocar} />)
    await fireEvent.press(screen.getByRole('button', { name: 'Cerrar orden' }))
    expect(tocar).toHaveBeenCalledTimes(1)
  })

  it('no responde mientras carga', async () => {
    const tocar = jest.fn()
    await conTema(<Boton titulo="Guardar" onPress={tocar} cargando />)
    await fireEvent.press(screen.getByRole('button'))
    expect(tocar).not.toHaveBeenCalled()
  })

  it('el objetivo táctil mide al menos 48 dp', () => {
    expect(TACTIL).toBeGreaterThanOrEqual(48)
  })
})

describe('CampoNumerico', () => {
  it('suma y resta el paso desde el valor actual', async () => {
    const cambio = jest.fn()
    await conTema(<CampoNumerico etiqueta="Profundidad" valor={6} onCambio={cambio} paso={0.5} unidad="mm" />)
    await fireEvent.press(screen.getByRole('button', { name: 'Sumar 0.5' }))
    expect(cambio).toHaveBeenLastCalledWith(6.5)
    await fireEvent.press(screen.getByRole('button', { name: 'Restar 0.5' }))
    expect(cambio).toHaveBeenLastCalledWith(5.5)
  })

  it('parte del valor anterior cuando está vacío y no baja del mínimo', async () => {
    const cambio = jest.fn()
    await conTema(<CampoNumerico etiqueta="Profundidad" valor={null} onCambio={cambio} previo={0.2} paso={0.5} />)
    await fireEvent.press(screen.getByRole('button', { name: 'Restar 0.5' }))
    expect(cambio).toHaveBeenLastCalledWith(0)
  })

  it('avisa cuando el valor sale del rango', async () => {
    await conTema(<CampoNumerico etiqueta="Presión" valor={130} onCambio={() => {}} unidad="psi" rango={{ min: 90, max: 120 }} />)
    expect(screen.getByText(/Fuera de rango/)).toBeTruthy()
  })

  it('acepta coma decimal al escribir', async () => {
    const cambio = jest.fn()
    await conTema(<CampoNumerico etiqueta="Profundidad" valor={null} onCambio={cambio} />)
    await fireEvent.changeText(screen.getByLabelText('Profundidad'), '4,5')
    expect(cambio).toHaveBeenLastCalledWith(4.5)
  })
})

describe('Segmentado e Interruptor', () => {
  it('Segmentado cambia de opción y marca la elegida', async () => {
    const cambio = jest.fn()
    await conTema(<Segmentado valor="mes" onCambio={cambio} opciones={[{ valor: 'dia', texto: 'Día' }, { valor: 'mes', texto: 'Mes' }]} />)
    expect(screen.getByRole('tab', { name: 'Mes' }).props.accessibilityState.selected).toBe(true)
    await fireEvent.press(screen.getByRole('tab', { name: 'Día' }))
    expect(cambio).toHaveBeenCalledWith('dia')
  })

  it('Interruptor invierte su valor', async () => {
    const cambio = jest.fn()
    await conTema(<Interruptor valor={false} onCambio={cambio} etiqueta="Notificar" />)
    await fireEvent.press(screen.getByRole('switch', { name: 'Notificar' }))
    expect(cambio).toHaveBeenCalledWith(true)
  })
})

describe('Fila, Chip y aviso de sincronización', () => {
  it('Fila se anuncia con título y detalle', async () => {
    await conTema(<Fila titulo="Preventivo 20.000 km" detalle="OT-0421" icono={Wrench} onPress={() => {}} />)
    expect(screen.getByRole('button', { name: 'Preventivo 20.000 km, OT-0421' })).toBeTruthy()
  })

  it('Chip se lee por su texto, no por su color', async () => {
    await conTema(<Chip texto="Urgente" tono="peligro" />)
    expect(screen.getByLabelText('Urgente')).toBeTruthy()
  })

  it.each([
    [{ enLinea: false, pendientes: 3, rechazados: 0 }, 'Sin señal · 3 por enviar'],
    [{ enLinea: true, pendientes: 2, rechazados: 0 }, 'Enviando 2…'],
    [{ enLinea: true, pendientes: 0, rechazados: 1 }, '1 registro necesita atención'],
    [{ enLinea: true, pendientes: 0, rechazados: 0, ultima: 'hace 1 min' }, 'Sincronizado · hace 1 min'],
  ])('AvisoSincronizacion %j', async (p, texto) => {
    await conTema(<AvisoSincronizacion {...p} />)
    expect(screen.getByText(texto)).toBeTruthy()
  })
})
