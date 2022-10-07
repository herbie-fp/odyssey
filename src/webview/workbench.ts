import plugin_configs from './plugin.config.js'

async function import_from_module(module, name) {
  console.debug('importing', name, 'from', module, )
  const { default: myDefault } = await import(`./plugins/${module}.js`)
  if (!myDefault) {
    console.error("Couldn't find a default export. Make sure you used `export default ...`")
  }
  if (!myDefault[name]) {
    console.error(module, name)
    console.error('Failed to import. Did you export properly?')
  }
  return myDefault[name]
}

async function boot() {
  const platform = plugin_configs.find(o => o.name === 'platform')
  if (!platform) { throw new Error('Impossible') }
  let api = await (await import_from_module(platform.name, platform.advanced?.addConfigHandler))(platform, import_from_module)
  // HACK also manually run the ui config handler
  const ui = plugin_configs.find(o => o.name === 'ui')
  if (!ui) { throw new Error('Impossible') }
  api = (await import_from_module(ui.name, ui.advanced?.addConfigHandler))(ui, import_from_module, api)
  // TODO (add the platform to plugin table for uniformity, but don't run anything)
  api.addPlugin(ui)
  api.addPlugin(plugin_configs.find(o => o.name === 'default'))
  api.addPlugin(plugin_configs.find(o => o.name === 'demo'))
  // add api to window for debugging
  //@ts-ignore
  window.api = api
  return api
}

export { boot }