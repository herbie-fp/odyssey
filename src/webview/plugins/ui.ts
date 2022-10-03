/* eslint-disable @typescript-eslint/naming-convention */

//// Rule helpers

function getPluginViews(plugin_config, import_from_module) {
  return Promise.all(plugin_config.views?.map(async v => ({
    ...v,
    // TODO If the selector can be resolved as a table name, it's a table check.
    // Else import_from_module(plugin_config.name, v.selector)
    //selector: 
    plugin: plugin_config.name,
    name: v.name ? v.name : v.fn,
    fn: await import_from_module(plugin_config.name, v.fn)
  })))
}

function getPluginPages(plugin_config, import_from_module) {
  return Promise.all(plugin_config.pages?.map(async p => ({
    ...p,
    // TODO If the selector can be resolved as a table name, it's a table check.
    // Else import_from_module(plugin_config.name, v.selector)
    //selector: 
    plugin: plugin_config.name,
    name: p.name ? p.name : p.fn,
    fn: await import_from_module(plugin_config.name, p.fn)
  })))
}

function isShowAction(obj, table) {
  return table === 'platform.Actions' && obj.type === 'show'
}

function getPane(showAction) {
  // TODO make a div for the object pointed to by the show action
  return []
}


//// API modifications

function render(api) {
  // give back a div object that embeds the current page with a toolbar for
  // e.g. switching between pages/other navigation/special functions

}

function initUI(plugin_config, import_from_module, api) {
  return { ...api, render }
}


//// end API modifications

export {
  initUI,
  isShowAction,
  getPane,
  getPluginViews,
  getPluginPages
}