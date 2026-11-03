const { defineConfig, globalIgnores } = require('eslint/config')
const expoConfig = require('eslint-config-expo/flat')

// Las pantallas no inventan colores: todo color sale del sistema de diseño
// (src/diseno). Así un cambio de marca o de modo oscuro llega a toda la app.
const SIN_COLORES = {
  'no-restricted-syntax': ['error',
    { selector: "Literal[value=/^#[0-9a-fA-F]{3,8}$/]", message: 'Use un color del sistema de diseño (useTema().color).' },
    { selector: "Literal[value=/^rgba?[(]/]", message: 'Use un color del sistema de diseño (useTema().color).' },
  ],
}

module.exports = defineConfig([
  globalIgnores(['dist/*', '.expo/*', 'node_modules/*']),
  expoConfig,
  { files: ['src/**/*.{ts,tsx}'], ignores: ['src/diseno/**'], rules: SIN_COLORES },
])
