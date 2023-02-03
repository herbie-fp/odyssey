/* eslint-disable @typescript-eslint/naming-convention */
console.log('Loading platform code...')
import { createStore, produce, unwrap, untrack } from "../../dependencies/dependencies.js";

async function applyRule(rule, item, api, import_from_module) {
  return rule.fn(item, api, import_from_module)
}

function getPluginRules(plugin_config, api, import_from_module) {
  return Promise.all(plugin_config.rules?.map(async r => ({
    ...r,
    plugin: plugin_config.name,
    name: r.name ? r.name : r.fn,
    fn: await import_from_module(plugin_config.name, r.fn)
  })))
}

function getPluginActions(plugin_config, api, import_from_module) {
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
  })) || [])
}

function getPluginTables(plugin_config, api) {
  return plugin_config.tables?.map(t => ({ plugin: plugin_config.name, name: t, items: [] })) || []
}

function select(callerPlugin, tname, item, id, tables, setTables) {
  console.debug(callerPlugin, tname, item, tables, setTables)
  const idx = tables.findIndex(t => t.name === 'Selections')
  setTables(produce((tables: any) => { tables.find(t => t.name === 'Selections').items.push({ selectionId:id, table: tname }) }))
}

function multiselect(callerPlugin, tname, item, ids, tables, setTables) {
  console.debug(callerPlugin, tname, item, tables, setTables)
  const idx = tables.findIndex(t => t.name === 'Selections')
  setTables(/*'tables', idx, 'items', l => [...l, {selection: item, table: tname, multiselection: true}])//*/produce((tables: any) => { tables.find(t => t.name === 'Selections').items.push({ table: tname, selectionIds:ids, multiselection: true }) }))
}

// TODO better logging--stack trace/whyline-ish features
function log(tables, setTables, api, import_from_module, ...values) {
  console.log(...values)
  try {
    JSON.stringify(values)
  } catch (e) {
    console.error(e)
    console.error('There was a circular reference in:', values)
    console.error(`The same object, with circular refs and fns removed:`, JSON.parse(JSON.stringify(values, removeCircularReferences(values))))
    //console.log(e, values, JSON.parse(JSON.stringify(values, removeCircularReferences(values))))
  }
  create('platform', 'Logs', JSON.parse(JSON.stringify(values, removeCircularReferences(values))), tables, setTables, api, import_from_module)
}

function removeCircularReferences(obj) {
  const seen = new WeakSet();
  return (key, value) => {
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) {
        return; // drop the current key-value pair
      } else {
        seen.add(value); // add the current key-value pair to the set
      }
    }
    return value; // return the current key-value pair
  }
}
  
(window as any).removeCircularReferences = removeCircularReferences

// TODO refactor
// TODO make actions awaitable?
// I think actions don't need to be exported -- except for primitive platform
// actions, all actions just write to the ActionLog to trigger rules.
// Even primitive actions could do this (external "create" runs
// wrappedCreate or something like that).
async function create(callerPlugin, tname, item, tables, setTables, api, import_from_module) {

  function selectorMatch(selector, tname, item, selectorPlugin, itemPlugin) {
    //console.log(selector, tname, selectorPlugin, itemPlugin)
    if (selector === tname) { return true } // HACK
    const [plugin, name] = tname.split('.').length > 1 ? tname.split('.') 
    : [itemPlugin, tname]
    const [splugin, sname] = selector.split('.').length > 1 ? selector.split('.') 
      : [selectorPlugin, selector]
    return splugin === plugin && sname === name
  }

  const [plugin, name] = tname.split('.').length > 1 ? tname.split('.') 
    : [callerPlugin, tname]
  
  if (name !== 'Logs') {log(tables, setTables, api, import_from_module, callerPlugin, 'is adding to table', tname, ':', item)}

  if (plugin === 'platform' && name === 'Tables') {
    // special case: we are creating a table
    //console.log('adding table:', item)
    setTables(/*'tables', l => [...l, item])/*/produce((tables:any) => {
      tables.push(item)
    }))
    //console.log('added')
  } else {
    //console.log('adding item', item, plugin, name, unwrap(tables), tables.indexOf(t => t.plugin === plugin && t.name === name))
    // const idx = tables.findIndex(t => t.plugin === plugin && t.name === name)
    // //console.log(idx)
    // if (idx >= 0) {
    //   //console.log('will set')
    //   setTables('tables', idx, 'items', l => [...l, item])
    //   //console.log('done setting')
    // }
    setTables(produce((tables:any) => {
      const table = tables.find(t => t.plugin === plugin && t.name === name)
      if (table) {
        table.items.push(item)
      }
    }))
  }
  
  // apply all existing rules to created item
  const ruleApplications = tables.find(t => t.name === 'Rules')?.items.map(async r =>
    selectorMatch(r.selector, tname, item, r.plugin, plugin) ? await stepRule(callerPlugin, r, item, tname, tables, setTables, api, import_from_module) : null)
  if (ruleApplications) { await Promise.all(ruleApplications) }

  if (plugin === 'platform' && name === 'Rules') {
    // HACK -- selectors should probably only apply to all items in special cases
    // apply the new rule to all existing items in all tables that match the selector
    const rule = item
    // HACK to handle tables
    const table_matches = tables.filter(t => selectorMatch(rule.selector, 'Tables', t, rule.plugin, 'platform')).map(t => ([t, t]))
    const all_matches = [...table_matches, ...tables.map(t => t.items.filter(v => selectorMatch(rule.selector, t.name, v, rule.plugin, t.plugin)).map(v => ([t, v]))).flat()]
    await Promise.all(all_matches.map(async ([t, v]) => await stepRule(callerPlugin, rule, v, t.name, tables, setTables, api, import_from_module)))
  }
}

async function stepRule(callerPlugin, rule, item, table: string, tables, setTables, api, import_from_module) {

  function createAll(callerPlugin, tname, items, tables, setTables, api, import_from_module) {
    items.map(v => create(callerPlugin, tname, v, tables, setTables, api, import_from_module))
  }

  if (table !== 'Logs') {log(tables, setTables, api, import_from_module, rule.plugin, ': Generating 0+ items for', rule.table, 'from one in', table, 'using', rule.name, '\nrule', rule, '\nitem', item)}
  let rule_output = await applyRule(rule, item, api, import_from_module)
  if (rule_output && !Array.isArray(rule_output)) {
    rule_output = [rule_output]  // HACK wrap as array
    // console.error(rule)
    // throw new Error('Rule output must be an array.')
  }
  if (rule_output.length > 0) {
    createAll(rule.plugin, rule.table, rule_output, tables, setTables, api, import_from_module)
  }
}

async function getAPI(plugin_config, import_from_module, api) {

  const [tables, setTables] = createStore([] as any)
  //let [apiGetter, apiSetter] = createStore({})

  async function action(name, callerPlugin, ...args) {
    // NOTE this does the lookup every time
    
    const actions = tables.find(t => t.name === 'Actions')
    // record the action in the action log
    create(callerPlugin, 'platform.ActionLogs', { name, args }, tables, setTables, api, import_from_module)
    
    // run the action named name with the specified arguments
    // NOTE api and import_from_module weren't here before? was that intentional?
    await (actions.items.find(a => a.name === name).fn(callerPlugin, ...args, tables, setTables, api, import_from_module))  
  }

  // HACK for now, when we select something, we just put the whole item in the .selection attribute (should use foreign key)
  // HACK the demo stores selector functions in the selection attribute, so we are just storing and getting
  // functions that need to be called the right way on the appropriate table. ugly, but good enough for now.

  // HACK for now, mutate the api
  Object.assign(api, {
    action, tables, setTables,
    getLastSelected: selector => {
      const ret = o => selection.selectionId === o.id
      const selection = tables.find(t => t.name === "Selections")?.items.findLast(selection => !selection.multiselection && selector(ret, selection.table))
      console.debug('got selection', selector, selection)
      return selection ? ret : undefined
    },
    getLastMultiselected: selector => {
      const ret = o => selection.selectionIds.includes(o.id)
      const selection = tables.find(t => t.name === "Selections")?.items.findLast(selection => selection.multiselection && selector(ret, selection.table))
      console.debug('got multiselection', selector, selection)
      return selection ? ret : undefined
      
    },
    addPlugin: plugin_config => create('platform', 'Plugins', plugin_config, tables, setTables, api, import_from_module)
  })

  const rules = (await getPluginRules(plugin_config, api, import_from_module))
  console.log('Resolved rules', rules)
  rules.map(r => stepRule('platform', r, plugin_config, 'Plugins', tables, setTables, api, import_from_module))

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
  //@ts-ignore
  window.setTables = setTables
  //@ts-ignore
  window.api = api
  //@ts-ignore
  window.import_from_module = import_from_module

  // HACK Since the API is not part of our reactive model, every single plugin 
  // would need to manually update the API for a fluent interface. Instead,
  // we just use the "action" function.

  return api
}

function init(plugin_config, import_from_module, api = null) {
  /* goal: return an api */
  // HACK for now, mutate the api
  return api ? api : getAPI(plugin_config, import_from_module, {})
}

export default {init, getPluginRules, getPluginTables, getPluginActions, create, select, multiselect}