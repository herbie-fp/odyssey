/* eslint-disable @typescript-eslint/naming-convention */
// import { createEffect, createSignal, createMemo, For } from 'solid-js'
// import { createStore, produce, unwrap } from "solid-js/store";

import plugin_configs from './plugin.config.js'

async function import_from_module(module, name) {
  console.debug('importing', name, 'from', module, )
  const {default: myDefault} = await import(`./plugins/${module}.js`)
  if (!myDefault[name]) {
    console.error('Failed to import. Did you export properly?')
  }
  return myDefault[name]
}
async function read_plugin_config() {
  Promise.all(plugin_configs.map(async config => config.advanced?.addConfigHandler ? (await import_from_module(config.name, config.advanced.addConfigHandler))(plugin_configs, import_from_module) : null))

}

async function boot() {
  const platform = plugin_configs[0]
  const api = (await import_from_module(platform.name, platform.advanced?.addConfigHandler))(platform, import_from_module)
  // then add each other plugin in the plugin_config list to the Plugins table
  
}

await boot()