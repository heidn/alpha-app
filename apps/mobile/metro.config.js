// Lets the app import shared code from the repo-root `convex/` folder; NativeWind compiles global.css.
const path = require('path')
const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')

const projectRoot = __dirname
const repoRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)
config.watchFolders = [path.join(repoRoot, 'convex')]
// Fallback for imports inside convex/ when the root (web) node_modules isn't installed.
config.resolver.nodeModulesPaths = [path.join(projectRoot, 'node_modules')]

module.exports = withNativeWind(config, { input: './global.css' })
