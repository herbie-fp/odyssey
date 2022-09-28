/* eslint-disable @typescript-eslint/naming-convention */

import { createStore, produce, unwrap } from "solid-js/store";

function applyRule(rule, item, table, import_from_module) {
  return rule.selector !== table ? []
    : rule.fn(item, import_from_module)
}

function getPluginRules(plugin_config, import_from_module) {
  return Promise.all(plugin_config.rules.map(async r => ({
    ...r,
    fn: await import_from_module(plugin_config.name, r.fn)
  })))
}

function getPluginTables(plugin_config) {
  return plugin_config.tables.map(t => ({ plugin: plugin_config.name, name: t, items: [] }))
}

async function getAPI(plugin_config, import_from_module) {
  // goal: return an api

  const [tables, setTables] = createStore([
    { plugin: 'platform', name: 'Plugins', items: [] as any[] },
    { plugin: 'platform', name: 'Rules', items: [] as any[] }])

  function create(tname, item) {
    const [plugin, name] = tname.split('.')
    const table = tables.find(t => t.plugin === plugin && t.name === name)
    if (plugin === 'platform' && name === 'Tables') {
      // special case: we are creating a table
      setTables(produce(tables => tables.push(item)))
    } else {
      setTables(produce(tables => table?.items.push(item)))
    }
    
    // apply all existing rules to created item
    tables.find(t => t.name === 'Rules')?.items.map(r =>
      stepRule(r, item, table))

    if (plugin === 'platform' && name === 'Rules') {
      // apply the new rule to all existing items in all tables
      const rule = item
      const all_items = tables.map(t => t.items.map(v => ([t, v]))).flat().map(([t, v]) => stepRule(rule, v, t))
    }
  }

  function createAll(tname, items) {
    items.map(v => create(tname, v))
  }

  function stepRule(rule, item, table) {
    const rule_output = applyRule(rule, item, table, import_from_module)
      createAll(rule.table, rule_output)
  }

  (await getPluginRules(plugin_config, import_from_module)).map(r => stepRule(r, plugin_config, 'Plugins'))
}

function init2(plugin_config, import_from_module) {
  // goal: return an api
  return getAPI(plugin_config, import_from_module)
}
function init(plugin_config, import_from_module) {
  console.log('init:', plugin_config)

  // TODO general issue--these tables should behave like other tables.
  // in particular, they should set up any other items that are added to them
  // at any time. ie if I add a plugin to the plugin table, its config should be read
  // and appropriate entries should be added to the other tables.
  // (Ignore deletion rules for now.)
  // 

  // NOTE (Ideally these parts would be split into separate modules)

  const {tables: tableNames, name: pluginName, views: viewFns, actions: actionFns} = plugin_config
  
  // look through the plugin config to get names + other info (just namespaced names for now)
  // HACK ignore tasks for now
  const all_tables = tableNames.map(tname => `${pluginName}.${tname}`)
  // Create the table of Tables

  // Create the actual Tables (empty)
  const [tables, setTables] = createStore(all_tables.map(t => ({name: t, items: []})))
  // HACK ignore the fun question of platform.tables

  // create plugin table
  // create the API object with the plugin names
  //const [api, setAPI] = createStore(Object.fromEntries(plugin_config.map(c => ([c.name, {}]))))

  // HACK just dump the config file
  setTables(produce((draft :any[]) => draft.find(t => t.name === 'platform.Plugin').items.push(plugin_config)))

  // TODO not sure what to do with plugin ids
  // it's not clear if these should be generated or live with the plugin definition

  // create the views 
  const all_views = viewFns.map(v => ({plugin: pluginName, ...v}))
  const [views, setViews] = createStore(all_views)

  // add the views to the API object
  all_views.map( ({plugin, fn}) => setAPI(plugin, fn, import_from_module(plugin, fn)))

  // Fill the actions table
  const all_actions = actionFns.map(v => ({plugin: pluginName, fn: v}))
  const [actions, setActions] = createStore(all_actions)

  // add the actions to the API object
  all_actions.map( ({plugin, fn}) => setAPI(plugin, fn, import_from_module(plugin, fn)))  // TODO pass `tables` into the created functions via an argument here? Is there other stuff that actions will need? Most actions shouldn't need direct access to more than that, though.

  function create(tableName, object) {
    return tables.find(t => t.name === tableName)
  }

  // Run any additional plugin config handlers
  Promise.all(plugin_config.map(async config => config.name !== 'platform' && config.advanced?.addConfigHandler ? (await import_from_module(config.name, config.advanced.addConfigHandler))(plugin_config, import_from_module) : null))

  // Create the Rules table, which does all of the above...

}

export default {init, create}