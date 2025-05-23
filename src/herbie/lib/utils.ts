import * as HerbieContext from '../HerbieContext'


export function nextId(table: { id: number }[]) {
  return [...table].sort((a, b) => a.id - b.id).reduce((acc, curr) => {
    if (acc === curr.id) {
      return acc + 1;
    } else {
      return acc;
    }
  }, 0);
}

export function getGlobals(): HerbieContext.Global<any>[]{
  return Object.keys(HerbieContext).map((key) => {
    if ((HerbieContext as any)[key].isGlobal === true) {
      return (HerbieContext as any)[key];
    }
    return undefined
  }).filter((x) => x !== undefined)
}

export function getReducerGlobals(): HerbieContext.ReducerGlobal<any>[] {
  return Object.keys(HerbieContext).map((key) => {
    if ((HerbieContext as any)[key].isReducerGlobal === true) {
      return (HerbieContext as any)[key];
    }
    return undefined
  }).filter((x) => x !== undefined)
}


type ModuleWithDecorators<T> = {
  [K in keyof T]: T[K] extends (...args: infer Args) => infer Return
    ? (...args: Args) => Promise<Return>
    : T[K];
};

export function applyDecoratorToAllModuleFunctions<T extends {}>(module: T, decorator: any): ModuleWithDecorators<T> {
  const decoratedModule: Partial<ModuleWithDecorators<T>> = {};

  for (const entry of (Object.entries(module))) {
    const [key, value] = entry;
    if (typeof value === 'function') {
      //@ts-ignore  HACK ignore these for now
      decoratedModule[key] = decorator(value);
    } else {
      //@ts-ignore
      decoratedModule[key] = value;
    }
  }

  return decoratedModule as ModuleWithDecorators<T>;
}