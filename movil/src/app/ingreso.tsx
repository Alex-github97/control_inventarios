/**
 * Ingreso: empresa (recordada del último ingreso), usuario y clave. Al entrar,
 * el servidor vincula este teléfono por 30 días.
 */
import { useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native'
import { Redirect } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Building2, KeyRound, LogIn, UserRound } from 'lucide-react-native'
import { MARCA } from '@compartido/marca'
import { Boton, Campo, ESPACIO, Tarjeta, Texto, useTema } from '@/diseno'
import { useSesion } from '@/datos/sesion'
import { LogoTW } from '@/lite/marca'
import { ES_LITE, NOMBRE_APP, RUTA_INICIO } from '@/datos/variante'

export default function Ingreso() {
  const { color } = useTema()
  const borde = useSafeAreaInsets()
  const { usuario: actual, empresaRecordada, ingresar, aviso } = useSesion()
  const [empresa, setEmpresa] = useState(empresaRecordada ?? '')
  const [usuario, setUsuario] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  if (actual) return <Redirect href={RUTA_INICIO} />

  const listo = empresa.trim() && usuario.trim() && clave
  const enviar = async () => {
    if (!listo || enviando) return
    setEnviando(true)
    setError(null)
    try {
      await ingresar(empresa, usuario, clave)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo ingresar')
      setClave('')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: color.fondo }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{
        flexGrow: 1, justifyContent: 'center', padding: ESPACIO.e5, paddingTop: borde.top + ESPACIO.e10, paddingBottom: borde.bottom + ESPACIO.e8, gap: ESPACIO.e8,
      }}>
        <View style={{ alignItems: 'center', gap: ESPACIO.e3 }}>
          <LogoTW tamano={76} />
          <Texto variante="titulo" style={{ letterSpacing: 4 }}>{(ES_LITE ? NOMBRE_APP : MARCA.nombre).toUpperCase()}</Texto>
          <Texto tono="secundario" style={{ textAlign: 'center' }}>{ES_LITE ? 'Inspección de llantas en campo' : 'Mantenimiento en campo'}</Texto>
        </View>

        <Tarjeta style={{ gap: ESPACIO.e4 }}>
          {aviso && !error && <Texto variante="nota" tono="alerta">{aviso}</Texto>}
          <Campo etiqueta="Código de la empresa" valor={empresa} onCambio={setEmpresa} icono={Building2} sinMayusculas placeholder="por ejemplo: demo" />
          <Campo etiqueta="Usuario" valor={usuario} onCambio={setUsuario} icono={UserRound} sinMayusculas />
          <Campo etiqueta="Contraseña" valor={clave} onCambio={setClave} icono={KeyRound} secreto alEnviar={enviar} />
          {error && <Texto variante="nota" tono="peligro" accessibilityLiveRegion="polite">{error}</Texto>}
          <Boton titulo="Ingresar" icono={LogIn} tamano="grande" ancho onPress={enviar} cargando={enviando} deshabilitado={!listo} />
        </Tarjeta>

        <Texto variante="nota" tono="terciario" style={{ textAlign: 'center' }}>
          Este teléfono quedará vinculado a su usuario. Su administrador puede retirarle el acceso desde el portal.
        </Texto>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
