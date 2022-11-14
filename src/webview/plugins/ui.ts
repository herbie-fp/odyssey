/* eslint-disable @typescript-eslint/naming-convention */
import { html, For } from "../../dependencies/dependencies.js";

//// Rule helpers





function getPluginViews(plugin_config, api, import_from_module) {
  // const tryImport = function (name) {
  //   try {
  //     return import_from_module(plugin_config.name, name)
  //   } catch (error) {
  //     return null
  //   }
  // }
  // HACK copypasta from platform
  function selectorMatch(selector, tname, item, selectorPlugin, itemPlugin) {
    //console.log(selector, tname, selectorPlugin, itemPlugin)
    if (selector === tname) { return true } // HACK
    const [plugin, name] = tname.split('.').length > 1 ? tname.split('.') 
    : [itemPlugin, tname]
    const [splugin, sname] = selector.split('.').length > 1 ? selector.split('.') 
      : [selectorPlugin, selector]
    return splugin === plugin && sname === name
  }
  function isTableName(tname) {
    const [plugin, name] = tname.split('.').length > 1 ? tname.split('.') 
      : [plugin_config.name, tname]
    //if (plugin_config.tables?.filter(tname1 => tname1 === tname)) { return true }
    return api.tables.find(t => t.plugin === plugin && t.name === name)
  }
  return Promise.all(plugin_config.views?.map(async v => ({
    ...v,
    // TODO If the selector can be resolved as a table name, it's a table check.
    // Else import_from_module(plugin_config.name, v.selector)
    //
    // HACK selectorMatch usage is incorrect (null)
    selector: isTableName(v.selector) ? (obj, table) => selectorMatch(v.selector, table, obj, null, null) : await import_from_module(plugin_config.name, v.selector),
    plugin: plugin_config.name,
    name: v.name ? v.name : v.fn,
    fn: await import_from_module(plugin_config.name, v.fn)
  })) || [])
}

function getPluginPages(plugin_config, api, import_from_module) {
  return Promise.all(plugin_config.pages?.map(async p => ({
    ...p,
    // TODO If the selector can be resolved as a table name, it's a table check.
    // Else import_from_module(plugin_config.name, v.selector)
    //selector: 
    plugin: plugin_config.name,
    name: p.name ? p.name : p.fn,
    fn: await import_from_module(plugin_config.name, p.fn)
  })) || [])
}

function isShowAction(obj, table) {
  return table === 'platform.Actions' && obj.type === 'show'
}

function getPane(showAction) {
  // TODO make a div for the object pointed to by the show action
  return []
}

//// actions

function show(callerPlugin, tname, item, tables, setTables, api, import_from_module) {
  // (do nothing, just write to the ActionLog!)
}

//// API modifications

function render(api) {
  // give back a div object that embeds the current page with a toolbar for
  // e.g. switching between pages/other navigation/special functions
  //<div id="setPane">
  //</div>
  //return html`<div>hello!</div>`
  let pages = undefined as any
  function getCurrentPage() {
    // returns the last selected Page
    // TODO update getLastSelected to take a namespaced table/work out clear selector def.
    pages = pages || api.tables.find(t => t.name === "Pages")
    console.trace('marker', pages)
    //.log(api.getLastSelected((_, t) => t === "Pages")?.selection, api.tables.find(t => t.name === "Pages").items.find(p => p.plugin === 'demo' && p.name === "mainPage"))
    return pages?.selection || pages?.items.find(p => p.plugin === 'demo' && p.name === "mainPage")
  }

  const currentPage = getCurrentPage()
  // TODO figure out how to get the page names/selection working
  // const pageSelect = html`<select onChange=${e => api.action('select', 'Pages', (o) => `${o.plugin}.${o.name}` === e.target.value)}>
  //   <${For} each=${() => api.tables.find(t => t.name === "Pages").items}>${ (page) => 
  //     // HACK value needs to be the page's id
  //     (!page) ? 'no page' :
  //     html`<option value="${() => `${page.plugin}.${page.name}`}">${() => page.name}</option>`}<//>
  //   </select>`
  // <!-- hide toolbar for now
  // <div id="toolbar">
  //   This is the toolbar!
  //   ${pageSelect}
  // </div>
  // -->
  return html`
    
    <div id="currentPage">
      ${() => getCurrentPage()?.fn(api, api.tables.find(t => t.name === "Panes").items).div}
    </div>
    
  `
  
}

function initUI(plugin_config, import_from_module, api) {
  console.log('initUI running!', api)
  // HACK for now, mutate the api
  Object.assign(api, { render })
  return api
}


//// end API modifications

export default {
  initUI,
  isShowAction,
  getPane,
  getPluginViews,
  getPluginPages, 
  show
}