// El código común (marca, textos, tipos de la API) vive en ../frontend/compartido,
// fuera de la app. Metro lo resuelve por el alias de tsconfig y busca sus
// dependencias (openapi-fetch) en los node_modules de la app, no en los del portal.
const path = require('path')
const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)
config.watchFolders = [path.resolve(__dirname, '../frontend/compartido')]
config.resolver.nodeModulesPaths = [path.resolve(__dirname, 'node_modules')]
module.exports = config
