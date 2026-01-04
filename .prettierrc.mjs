import oclifPrettier from '@oclif/prettier-config'

import pkg from './package.json' with {type: 'json'}

const prettierPlugins = [...new Set([...Object.keys(pkg.dependencies), ...Object.keys(pkg.devDependencies)])].filter(
  (name) => name.startsWith('prettier-plugin'),
)

/** @type {import("prettier").Config} */
const config = {
  ...oclifPrettier,
  plugins: prettierPlugins,
}

export default config
