// Lets the app import shared code from the repo-root `convex/` folder.
const path = require('path')
const { getDefaultConfig } = require('expo/metro-config')

const projectRoot = __dirname
const repoRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)
config.watchFolders = [path.join(repoRoot, 'convex')]
// Fallback for imports inside convex/ when the root (web) node_modules isn't installed.
config.resolver.nodeModulesPaths = [path.join(projectRoot, 'node_modules')]

module.exports = config
