import { createEffect, createSignal, createMemo, For } from 'solid-js'
import { createStore, produce, unwrap } from "solid-js/store";

//@ts-ignore
window.unwrap = unwrap
import { render } from 'solid-js/web'
import html from 'solid-js/html'

import expressions from './expressions.json'
import points_json from './points.json'
const specs = {
  1: "(-b + sqrt( (-b^2 - 4ac) ) ) / (2a)"
}

let selection_id_counter = 1
let view_id_counter = 1
let pane_id_counter = 1



class View {
	name: any;
	id: any;
	artifact_type: any;
	selection: any;
	input_selector: any;
	render: any;
	pinned: any;
	actions: any;
	subviews: any;
  constructor({name="View", artifact_type, selection, input_selector, render, actions, subviews, pinned}: any={}) {
    const id = this.id = view_id_counter ++
    this.name = name /* identifies the view to the user */
    this.artifact_type = artifact_type || 'Missing artifact_type'/* Used to determine whether to update the selection for this view when a new artifact is selected. */
    this.selection = selection /* A Selection object. TODO Technically, not all Views have selections--TableViews don't, but Detail and ComparisonViews do. Probably this should be formalized with a SelectionView subclass, but it's not a big deal right now. */
    
    this.input_selector = input_selector || (db => [['db', db]])
      /* This specifies the parts of the state needed for rendering as e.g. ['name', 'selector'] pairs. */
    this.render = render || ((namespace :any) => html`
<style>
.defaultview {
border: 1px solid black;
margin: 1px;
padding: 1px;
}
</style>
<div class="defaultview">
  <div class="name">Name: ${name}</div>
  <div class="id">View ID: ${id}</div>
  <div class="artifactType">Artifact Type: ${artifact_type}</div>
  <div class="selection">Selection: ${selection ? JSON.stringify(selection.data) : 'no selection yet'}</div>
  <div class="namespace">Namespace: ${JSON.stringify(namespace)}</div>
</div>
`)
      /* Function. Receives the fulfilled namespace defined in input_selector, builds a document element output. */

    this.pinned = pinned  /* Whether this view should not change with the user's most recent relevant selection. */
    
    this.actions = actions || []  /* Buttons that should be added to the bottom of the view. */
    this.subviews = subviews || []  /* Subviews that should be added to the bottom of the view. */
  }
}

const selectionForArtifactType = artifact_type => createMemo(() => [...state.tables.Selection].reverse().find(s => [s.artifact_type, s.data.artifact_type, s.data[0]?.artifact_type].includes(artifact_type)))

class TableView extends View {
  constructor({artifact_type, selection, actions, subviews, pinned} :any={}) {
    const input_selector = db => [[artifact_type, db[artifact_type]]] // rename as data_selector?  // for tables, this will just be the data associated with artifact_type  // for now we are using a function that returns key-value pairs rather than a selector string--kind of opaque...
    const render = (namespace) => {
      console.log('table render', Object.keys(namespace))
      const artifacts = namespace[artifact_type]
      let table = html`<div></div>` as HTMLElement
      let last_selected : Selection | null = null;
      if (!artifacts) {
        table = html`<div>Table does not exist</div>` as HTMLElement
      }
      else if (artifacts.length == 0) {
        table = html`<div>empty table</div>` as HTMLElement
      }
      else {
        const keys = Object.keys(artifacts.reduce((acc, o) => ({...o, ...acc}), {}))
        last_selected = selectionForArtifactType(artifact_type)()  //[...state.tables.Selection].reverse().find(s => [s.artifact_type, s.data.artifact_type, s.data[0]?.artifact_type].includes(artifact_type))
        //console.log((mutable state.tables.Selection),last_selected, artifact_type)
        table = html`
          <div>
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
          <div class="table-block">

          <table>
            <tr>
              <${For} each=${() => keys}>
              ${k => html`<th>${k}</th>`}
              <//>
            </tr>
          ${artifacts.map((a, i) => html`<tr class="${last_selected?.data.id == a.id ? 'selected' : ''}">${keys.map(k => html`<td><div>${JSON.stringify(a[k] ? a[k] : 'missing')}</div></td>`)}</tr>`)}
          </table>
          </div>
          </div>
          ` as HTMLElement
      }
      
      table.querySelectorAll('tr').forEach((r,i) => {
        if (i == 0) { return; }
        i = i - 1
        r.onclick = () => {
          console.log('selection', table, artifacts, i)
          setState('tables', 'Selection', [...state.tables.Selection, new Selection({id: artifacts[i].id, artifact_type}, {viewId: this.id})])//produce((draft:any) => { draft.tables.Selection.push()
        }
      })

      let detail_view_button = html`<div>Nothing selected yet</div>` as HTMLElement
      if (last_selected) {
        detail_view_button = html`<button class="openDetailView">See details for the selected item</button>` as HTMLElement
        detail_view_button.onclick = () => {
          const new_pane = new Pane({view: new DetailView({artifact_type, selection: [last_selected], pinned: true})})
          setState(produce((draft:any) => { 
            draft.special.Pane.push(new_pane)   
          }))
          setSelectedPane('value', new_pane)
        }
      }
      return html`
        <style>
        .tableView {
        border: 1px solid black;
        padding: 1px;
        margin: 2px;
        }
        </style>
        <div class="tableView">
        ${table}
          <div></div>
        ${detail_view_button}
        </div>
        `
    }
  //   <!--
  //   <div class="name">Name: ${this.name}</div>
  //   <div class="id">View ID: ${this.id}</div>
  //   <div class="artifactType">Artifact Type: ${artifact_type}</div>
  // -->
    super({name: 'TableView', artifact_type, selection, actions, subviews, input_selector, render, pinned})
  }
  static isTableView(v) {
    return v.constructor.name == TableView.name
  }
}

type SelectionData = {
	id: number
	artifactType: string
}
type SelectionMetadata = {
	id?: number
	date?: Date
	viewId: number
}

class Selection {
	id: number;
	data: any;
	metadata: any;
  constructor (data: SelectionData | Array<SelectionData>, metadata: SelectionMetadata) {
    this.id = selection_id_counter ++
    this.data = data
    // Probably should move artifact type to the top level!
    this.metadata = metadata
  }
}

class Multiselection extends Selection {
  constructor (data: Array<SelectionData>, metadata: SelectionMetadata) {
    if (!Array.isArray(data)) throw Error('Multiselection data must be an array of artifacts.')
    super(data, metadata)
  }
}



class DetailView extends View {
  constructor({artifact_type, selection, actions, subviews, pinned} :any={}) {
    const input_selector = db => [[artifact_type, db[artifact_type]]] // for now we are using a function that returns key-value pairs rather than a selector string--kind of opaque...
    const render = namespace => {
      const artifacts = namespace[artifact_type]
      return html`
        <style>
        .detailView {
        border: 1px solid black;
        padding: 1px;
        margin: 2px;
        }
        </style>
        <div class="detailView">
          <div class="name">Name: ${this.name}</div>
          <div class="id">View ID: ${this.id}</div>
          <div class="artifact-type">Artifact Type: ${artifact_type}</div>
          <div class="last-relevant-selection">Last Relevant Selection: ${"TODO"}</div>
          <div class="corresponding-artifact">Corresponding Artifact: ${"TODO"}</div>
        </div>
        `
    }
    super({name: 'DetailView', artifact_type, selection, actions, subviews, input_selector, render, pinned })
  }
  static isDetailView(v) {
    return v.constructor.name == DetailView.name
  }
}

class Pane {
	id: any;  // NOTE Panes are immutable.
	pinned: any;
	title: any;
	view: any;
  constructor({view, title, pinned, id} : any={}) {
    id = this.id = pane_id_counter ++
    this.pinned = pinned || false
    this.title = title || `Pane ${id}: ${view.name} [${view.artifact_type}] ${view.id}`
    this.view = view || new View()
    Object.freeze(this)  // (immutable)
  }
  static togglePinned(p) {
    return new Pane({...p, pinned: !p.pinned})
  }
}

const render_pane = (pane) => {
  console.log('rendering pane', pane)
  const {id, title, pinned, view} = pane
  const {name, artifact_type, selection, input_selector, render, actions, subviews} = view
  console.log('more info on rendered pane', id, view.id, input_selector)

	const close = html`<button>Close</button>` as HTMLElement

  close.onclick = () => {
    console.log('clicked close')
    setState(produce((draft:any) => {draft.special.Pane = draft.special.Pane.filter(p => p.id != id)}))
    setSelectedPane('value', selected_pane.value.id == id ? state.special.Pane.filter(p => !TableView.isTableView(p.view))[0] : selected_pane)
    console.log('post-update state', unwrap(state), unwrap(selected_pane))
  }
  return html`
    <style>
    .pane {
      border: 1px solid black;
      margin: 2px;
    }
    </style>
    <div id="pane${id}" class="pane ${pinned ? 'pinned' : 'unpinned'}">
      <div class="pane-title">
        ${title} ${pinned ? '(pinned)' : ''}
      </div>
      ${() => {
        console.log('rerender')
        return render(Object.fromEntries(input_selector(state.tables)))
      }}
      <div class="pane-close">
        ${TableView.isTableView(view) ? '' : close}
      </div>
    </div>
    `
}

const render_ui = () => {
  console.log(selected_pane)

  const out = html`
  <div>
<div id="tables">
Tables (always/initially visible?): 
${state.special.Pane.filter(p => TableView.isTableView(p.view)).map(p => render_pane(p)/*p.view.render(Object.fromEntries(p.view.input_selector(db)))*/)}
</div>
<br>

<div id="dropdown_that_shows_what_is_visible">
  Available panes: 
  <select>
    <${For} each=${() => state.special.Pane.filter(p => !TableView.isTableView(p.view))}>
      ${ p => html`<option attr:selected="${() => p.id == selected_pane.value.id ? 'selected' : null}" value="${p.id}" > 
                      ${p.title} ${p.view.pinned ? '(pinned)' : ''}
                    </option>`
       }
    <//>
  </select>
</div>
<br>
<div id="selected_view">
  ${() => selected_pane.value ? render_pane(selected_pane.value) : 'No selected pane'}
</div>
</div>
` as HTMLElement
  const select = out.querySelector('#dropdown_that_shows_what_is_visible select') as HTMLInputElement
  select.oninput = event => {
    console.log(`setting selected pane to ${select.value}`)
    setSelectedPane('value', state.special.Pane.find(p => p.id == select.value))
  }
  return out
}

const init_state = (() => {
  const initial :any = ({
    special: {
      // (Potentially there should be a separate View table and Panes should point to Views via an ID)
      Pane: [
        new Pane({view: new DetailView({title: "title 1", artifact_type: "Expression"})}),
        new Pane({view: new DetailView({title: "title 2", artifact_type: "Sample", pinned: true})}),
        //new Pane({view: new PluginView({title: "myView", artifact_type: "Sample", render: ({db}) => html`${db.Sample[0].data}`})}),
      ]
    },
    tables: {
      Expression: expressions.map(e => ({id: e.id, fpcore: e.fpcore, spec_id: e.spec_id, sample_id: e.sample_id})),
      Spec: [{id: 1, fpcore: specs[1]}],
      Sample: [
        { data: points_json.points, spec: 1, seed: 1, id: 1}
      ],
      Analysis: [  // (computed)
        { data: expressions[0].error, sample: 1, expression: 1, id: 2001},
        { data: expressions[1].error, sample: 1, expression: 2, id: 2002},
        { data: expressions[2].error, sample: 1, expression: 3, id: 2003}
      ],
      Selection: [],
      Plugins: [
        {
          id: 1, 
          name: 'herbie', 
          tables: {
            Spec: [
              // TODO view configuration here? but users will want to put JS in JS files etc.
            ],
            Sample: [
              
            ],
            Expression: [
              
            ],
            Analysis: [
              
            ]
          }
        }
      ]
    }
  })

  return produce((draft :any ) => { 
    Object.keys(draft.tables).map(TableName => /* TableName != "Selection" && */ draft.special.Pane.push(new Pane({view: new TableView({artifact_type: TableName})})))
    draft.tables.Selection = [ 
      new Selection({id: draft.tables.Expression[0].id, artifactType: "Expression"}, 
                    {viewId: draft.special.Pane.find(p => TableView.isTableView(p.view) && p.view.artifact_type == 'Expression').view.id }) ]
  })(initial)
})()

const [state, setState] = createStore(init_state)
const [selected_pane, setSelectedPane] = createStore({value: state.special.Pane.filter(p => !TableView.isTableView(p.view))[0]})
//@ts-ignore
window.state = state
//@ts-ignore
window.selected_pane = selected_pane
render(render_ui, document.body)