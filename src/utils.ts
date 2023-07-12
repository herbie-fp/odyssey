import { Expression } from './HerbieTypes';
import * as types from './HerbieTypes';
import * as contexts from './HerbieContext'


function nextId(table: { id: number }[]) {
  return table.sort((a, b) => a.id - b.id).reduce((acc, curr) => {
    if (acc === curr.id) {
      return acc + 1;
    } else {
      return acc;
    }
  }, 0);
}

export function getGlobals(): contexts.Global<any>[]{
  return Object.keys(contexts).map((key) => {
    if ((contexts as any)[key].isGlobal === true) {
      return (contexts as any)[key];
    }
    return undefined
  }).filter((x) => x !== undefined)
}


export { nextId }