/* eslint-disable @typescript-eslint/naming-convention */
console.log('Loading platform code...')
import { createStore, produce, unwrap } from "../../dependencies/dependencies.js";

async function applyRule(rule, item, import_from_module) {
  return rule.fn(item, import_from_module)
}

function getPluginRules(plugin_config, import_from_module) {
  return Promise.all(plugin_config.rules?.map(async r => ({
    ...r,
    plugin: plugin_config.name,
    name: r.name ? r.name : r.fn,
    fn: await import_from_module(plugin_config.name, r.fn)
  })))
}

function getPluginViews(plugin_config, import_from_module) {
  // TODO
  return []
}

function getPluginActions(plugin_config, import_from_module) {
  // TODO
  return []
}

function getPluginTables(plugin_config) {
  return plugin_config.tables.map(t => ({ plugin: plugin_config.name, name: t, items: [] }))
}

async function getAPI(plugin_config, import_from_module) {
  // goal: return an api

  const [tables, setTables] = createStore([] as any[])

  // TODO better logging--stack trace/whyline-ish features
  function log(...values) {
    console.log(...values)
    create('platform', 'Logs', values)
  }

  function create(callerPlugin, tname, item) {
    const [plugin, name] = tname.split('.').length > 1 ? tname.split('.') 
      : [callerPlugin, tname]
    
    if (name !== 'Logs') {log(plugin, 'is adding to table', tname, ':', item)}

    if (plugin === 'platform' && name === 'Tables') {
      // special case: we are creating a table
      setTables(produce(tables => tables.push(item)))
    } else {
      setTables(produce(tables => tables.find(t => t.plugin === plugin && t.name === name)?.items.push(item)))
    }
    
    // apply all existing rules to created item
    tables.find(t => t.name === 'Rules')?.items.map(r =>
      selectorMatch(r.selector, tname, item) ? stepRule(callerPlugin, r, item, tname) : null)

    if (plugin === 'platform' && name === 'Rules') {
      // HACK -- selectors should probably only apply to all items in special cases
      // apply the new rule to all existing items in all tables that match the selector
      const rule = item
      const all_matches = tables.map(t => t.items.filter(v => selectorMatch(rule.selector, t.name, v)).map(v => ([t, v]))).flat()
      all_matches.map(([t, v]) => stepRule(callerPlugin, rule, v, t))
    }
  }

  function selectorMatch(selector, tname, item) {
    return selector === tname // HACK
  }

  function createAll(callerPlugin, tname, items) {
    items.map(v => create(callerPlugin, tname, v))
  }

  async function stepRule(callerPlugin, rule, item, table: string) {
    if (table !== 'Logs') {log(rule.plugin, ': Generating 0+ items for', rule.table, 'from one in', table, 'using', rule.name, '\nrule', rule, '\nitem', item)}
    const rule_output = await applyRule(rule, item, import_from_module)
    if (!Array.isArray(rule_output)) {
      throw new Error('Rule output must be an array.')
    }
    if (rule_output.length > 0) {
      createAll(rule.plugin, rule.table, rule_output)
    }
  }

  const rules = (await getPluginRules(plugin_config, import_from_module))
  console.log('Resolved rules', rules)
  rules.map(r => stepRule('platform', r, plugin_config, 'Plugins'))

  //@ts-ignore
  window.tables = tables
  //@ts-ignore
  window.create = create
  //@ts-ignore
  window.unwrap = unwrap
  //@ts-ignore
  window.createStore = createStore
  //@ts-ignore
  window.produce = produce
  
  return {createAll}
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
  //all_views.map( ({plugin, fn}) => setAPI(plugin, fn, import_from_module(plugin, fn)))

  // Fill the actions table
  const all_actions = actionFns.map(v => ({plugin: pluginName, fn: v}))
  const [actions, setActions] = createStore(all_actions)

  // add the actions to the API object
  //all_actions.map( ({plugin, fn}) => setAPI(plugin, fn, import_from_module(plugin, fn)))  // TODO pass `tables` into the created functions via an argument here? Is there other stuff that actions will need? Most actions shouldn't need direct access to more than that, though.

  function create(tableName, object) {
    return tables.find(t => t.name === tableName)
  }

  // Run any additional plugin config handlers
  Promise.all(plugin_config.map(async config => config.name !== 'platform' && config.advanced?.addConfigHandler ? (await import_from_module(config.name, config.advanced.addConfigHandler))(plugin_config, import_from_module) : null))

  // Create the Rules table, which does all of the above...

}

export default {init2, getPluginRules, getPluginTables, getPluginViews, getPluginActions}