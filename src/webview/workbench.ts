import plugin_configs from './plugin.config.js'

async function import_from_module(module, name) {
  console.debug('importing', name, 'from', module, )
  const {default: myDefault} = await import(`./plugins/${module}.js`)
  if (!myDefault[name]) {
    console.error('Failed to import. Did you export properly?')
  }
  return myDefault[name]
}

async function boot() {
  const platform = plugin_configs.find(o => o.name === 'platform')
  if (!platform) { throw new Error('Impossible') }
  const api = (await import_from_module(platform.name, platform.advanced?.addConfigHandler))(platform, import_from_module)
  return api
}

export { boot }