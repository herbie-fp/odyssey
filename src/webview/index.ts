/* eslint-disable @typescript-eslint/naming-convention */
// import { createEffect, createSignal, createMemo, For } from 'solid-js'
// import { createStore, produce, unwrap } from "solid-js/store";
import { render } from 'solid-js/web'
import { boot } from './workbench'

const api = await boot()
render(api.render(api), document.getElementById('app') as HTMLElement)