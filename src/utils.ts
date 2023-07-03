import { Expression } from './HerbieTypes';

function nextId(table: { id: number }[]) {
  return table.sort((a, b) => a.id - b.id).reduce((acc, curr) => {
    if (acc === curr.id) {
      return acc + 1;
    } else {
      return acc;
    }
  }, 0);
}


export { nextId }