import { html, For } from "../../dependencies/dependencies.js";

//// Rules

function isMultiSelection() {
  // TODO
  return false
}

function isSelection(obj) {
  return true
}

function isShowAction(obj, table) {
  return table === 'ActionLogs' && obj.name === 'show'
}

function getPane(obj, api, import_from_module) {
  return 'hello'
}

function getTableViewPane(table, api, import_from_module) {
  // HACK make this general later
  console.debug(api.tables.find(t => t.plugin === 'ui' && t.name === 'Views').items)
  return {
    view: {
      // HACK hard coding
      name: 'TableView',
      selector: (obj, tname) => tname === table.name,
      table: table.name,  // should only point to the table
    },
    div: TableView(table, api, import_from_module)
  }
}

//// Views

function TableView(table, api, import_from_module) {
  console.debug('tableview', table)
  // TODO clicking a row needs to select
  const isSelected = item => api.getLastSelected((_, tname) => table.name === tname) === item
  const tryStringify = function (o) {
    try {
      return JSON.stringify(o)
    } catch (error) {
      return 'No stringify :('
    }
  }
  return html`<div class="tableView">
  <style>
  .tableView .selected {
    background-color: cyan;
  }
  
  /* Premature UI code -- limit size of tables and make them scrollable */
  .tableView .table-block {
    max-height: 200px;
    max-width: 500px;
    display: inline-block;
    overflow: auto;
    padding-right: 20px;
  }
  
  .tableView td>div {
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    word-wrap: break-word;
    max-height: 2.5ex;
  }
  
  </style>

  <h3>${() => `${table.plugin}.${table.name}`}</h3>
  <table class="table-block">
    <${For} each=${() => {
      const keys = Object.keys(table.items.reduce((acc, o) => ({ ...o, ...acc }), {}))
      return keys
    }
    }> ${ k => html`<th>${k}</th>` } <//>
    <${For} each=${() => table.items}>${(item) => {
    const keys = Object.keys(table.items.reduce((acc, o) => ({ ...o, ...acc }), {}))
    // HACK default, api.tables/setTables shouldn't have to be passed
    return html`<tr onClick=${() => api.action('select', 'default', `${table.plugin}.${table.name}`, item, api.tables, api.setTables)} class="${isSelected(item) ? 'selected' : ''}">${keys.map(k => html`<td><div>${tryStringify(item[k] ? item[k] : '-')}</div></td>`)}</tr>`
    }}<//>
  </table>
  </div>`
}

function DetailView(obj) {
  // TODO implement
  return JSON.stringify(obj)
}

function ComparisonView(multiselection) {
  // TODO implement
  return JSON.stringify(multiselection)
}


//// Pages

function ExplorePage(api, panes) {
  const showSelectedButton = pane =>
  html`<button onClick=${() => api.action('show', 'ui', api.getLastSelected((obj, table) => pane.view.selector(obj, table)))}>Show selected</button>`
  const div = html`
  <div id="allTables">
  <${For} each=${() => api.tables.find(t => t.name === 'Panes')?.items.filter(p => p.view.name === 'TableView')}>${(pane) => {
    console.debug('Rendering', pane)  
    return html`${() => pane.div}${showSelectedButton(pane)}`
  }
  }<//>
  </div>
  <div id="showPane">
  ${() => { api.getLastSelected((_, table) => table === 'Panes')?.div }}
  </div>
  `

  return {
    div
  }
}

export default {
  TableView,
  DetailView,
  ComparisonView,
  ExplorePage,
  getTableViewPane,
  isMultiSelection,
  isSelection,
  getPane,
  isShowAction
}