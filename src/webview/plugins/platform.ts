/* eslint-disable @typescript-eslint/naming-convention */

// class Table {
//   name : string
//   array : Array<any>
//   _includeSelf : boolean
//   constructor(name, array : any[] = [], _includeSelf=false) {
//     this.name = name
//     this.array = _includeSelf ? [this, ...array] : array
//     this._includeSelf = _includeSelf
//     Object.freeze(this)
//   }
//   add()
// }

import { createStore, produce, unwrap } from "solid-js/store";

function init(plugin_config, import_from_module) {
  console.log('init:', plugin_config)

  // TODO general issue--these tables should behave like other tables.
  // in particular, they should set up any other items that are added to them
  // at any time. ie if I add a plugin to the plugin table, its config should be read
  // and appropriate entries should be added to the other tables.
  // (Ignore deletion rules for now.)
  // 

  // NOTE (Ideally these parts would be split into separate modules)

  
  // look through the plugin config to get names + other info (just namespaced names for now)
  // HACK ignore tasks for now
  const all_tables = plugin_config.map(c => c.tables.map(t => `${c.name}.${t}`)).flat()
  // Create the table of Tables

  // Create the actual Tables (empty)
  const [tables, setTables] = createStore(all_tables.map(t => ({name: t, items: []})))
  // HACK ignore the fun question of platform.tables

  // create plugin table
  // create the API object with the plugin names
  const [api, setAPI] = createStore(Object.fromEntries(plugin_config.map(c => ([c.name, {}]))))

  // HACK just dump the config file
  setTables(produce((draft :any[]) => draft.find(t => t.name == 'platform.Plugin').items = plugin_config))

  // TODO not sure what to do with plugin ids
  // it's not clear if these should be generated or live with the plugin definition

  // create the views 
  const all_views = plugin_config.map(c => c.views.map(v => ({module: c.name, ...v}))).flat()
  const [views, setViews] = createStore(all_views)

  // add the views to the API object
  all_views.map( ({module, fn}) => setAPI(module, fn, import_from_module(module, fn)))

  // Fill the actions table
  const all_actions = plugin_config.map(c => c.actions.map(v => ({module: c.name, fn: v}))).flat()
  const [actions, setActions] = createStore(all_actions)

  // add the actions to the API object
  all_actions.map( ({module, fn}) => setAPI(module, fn, import_from_module(module, fn)))  // TODO pass `tables` into the created functions via an argument here? Is there other stuff that actions will need? Most actions shouldn't need direct access to more than that, though.

  function create(tableName, object) {
    return tables.find(t => t.name === tableName)
  }

  

  Promise.all(plugin_config.map(async config => null))


  // Run any additional plugin config handlers
  Promise.all(plugin_config.map(async config => config.name !== 'platform' && config.advanced?.addConfigHandler ? (await import_from_module(config.name, config.advanced.addConfigHandler))(plugin_config, import_from_module) : null))

}

export default {init, create}