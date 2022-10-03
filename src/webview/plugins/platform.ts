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

function getPluginActions(plugin_config, import_from_module) {
  return Promise.all(plugin_config.actions?.map(async a =>
    typeof a === typeof 'string' ? ({
      plugin: plugin_config.name,
      name: a,
      fn: await import_from_module(plugin_config.name, a)
    })
      : ({
    ...a,
    plugin: plugin_config.name,
    name: a.name ? a.name : a.fn,
    fn: await import_from_module(plugin_config.name, a.fn)
  })))
}

function getPluginTables(plugin_config) {
  return plugin_config.tables.map(t => ({ plugin: plugin_config.name, name: t, items: [] }))
}

function select(callerPlugin, tname, item, tables, setTables) {
  // TODO implement select
}

// TODO refactor
function create(callerPlugin, tname, item, tables, setTables, import_from_module) {
  // TODO better logging--stack trace/whyline-ish features
  function log(tables, setTables, ...values) {
    console.log(...values)
    create('platform', 'Logs', values, tables, setTables, import_from_module)
  }
  
  function selectorMatch(selector, tname, item) {
    return selector === tname // HACK
  }


  const [plugin, name] = tname.split('.').length > 1 ? tname.split('.') 
    : [callerPlugin, tname]
  
  if (name !== 'Logs') {log(setTables, plugin, 'is adding to table', tname, ':', item)}

  if (plugin === 'platform' && name === 'Tables') {
    // special case: we are creating a table
    setTables(produce((tables:any) => tables.push(item)))
  } else {
    setTables(produce((tables:any) => tables.find(t => t.plugin === plugin && t.name === name)?.items.push(item)))
  }
  
  // apply all existing rules to created item
  tables.find(t => t.name === 'Rules')?.items.map(r =>
    selectorMatch(r.selector, tname, item) ? stepRule(callerPlugin, r, item, tname, tables, setTables, import_from_module) : null)

  if (plugin === 'platform' && name === 'Rules') {
    // HACK -- selectors should probably only apply to all items in special cases
    // apply the new rule to all existing items in all tables that match the selector
    const rule = item
    const all_matches = tables.map(t => t.items.filter(v => selectorMatch(rule.selector, t.name, v)).map(v => ([t, v]))).flat()
    all_matches.map(([t, v]) => stepRule(callerPlugin, rule, v, t, tables, setTables, import_from_module))
  }
}

async function stepRule(callerPlugin, rule, item, table: string, tables, setTables, import_from_module) {

  function createAll(callerPlugin, tname, items, tables, setTables, import_from_module) {
    items.map(v => create(callerPlugin, tname, v, tables, setTables, import_from_module))
  }

  if (table !== 'Logs') {log(rule.plugin, ': Generating 0+ items for', rule.table, 'from one in', table, 'using', rule.name, '\nrule', rule, '\nitem', item)}
  const rule_output = await applyRule(rule, item, import_from_module)
  if (!Array.isArray(rule_output)) {
    throw new Error('Rule output must be an array.')
  }
  if (rule_output.length > 0) {
    createAll(rule.plugin, rule.table, rule_output, tables, setTables, import_from_module)
  }
}

async function getAPI(plugin_config, import_from_module, api) {

  const [tables, setTables] = createStore([] as any[])

  const rules = (await getPluginRules(plugin_config, import_from_module))
  console.log('Resolved rules', rules)
  rules.map(r => stepRule('platform', r, plugin_config, 'Plugins', tables, setTables, import_from_module))

  // Add window-level debugging vars.
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
  
  function action(name, callerPlugin, ...args) {
    // NOTE this does the lookup every time
    
    const actions = tables.find(t => t.name === 'Actions')
    // record the action in the action log
    create(callerPlugin, 'ActionLogs', { name, args }, tables, setTables, import_from_module)
    
    // run the action named name with the specified arguments
    actions.items.find(a => a.name === name).fn(callerPlugin, ...args)
  }

  // HACK Since the API is not part of our reactive model, every single plugin 
  // would need to manually update the API for a fluent interface. Instead,
  // we just use the "action" function.

  return {...api, action }
}

function init(plugin_config, import_from_module, api=null) {
  /* goal: return an api */
  return getAPI(plugin_config, import_from_module, api)
}

export default {init, getPluginRules, getPluginTables, getPluginActions, create, select}