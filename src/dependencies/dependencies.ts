import { createEffect, createRenderEffect, createSignal, createResource, createMemo, For, Show, Switch, Match, untrack } from 'solid-js'
import { createStore, produce, unwrap } from "solid-js/store";
import { render } from 'solid-js/web' 
import html from 'solid-js/html'
import * as math from 'mathjs'
import * as math11 from 'mathjs11'
//@ts-ignore
import * as Plot from '@observablehq/plot'
import * as Inputs from '@observablehq/inputs'

import mermaid from 'mermaid';

export {
  createEffect, createRenderEffect, createSignal, createMemo, createResource,
  For, Switch, Match, createStore, produce, unwrap, render, html,
  Show, math, untrack, Plot, Inputs,
  math11, mermaid
}
