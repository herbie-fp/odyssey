/* eslint-disable @typescript-eslint/naming-convention */
// import { createEffect, createSignal, createMemo, For } from 'solid-js'
// import { createStore, produce, unwrap } from "solid-js/store";
import { render } from "../dependencies/dependencies.js";
import { boot } from './workbench.js'

const api = await boot()
render(() => api.render(api), document.body as HTMLElement)