import { type ExtractStoreState, hasLifeCycleMethods } from "@/internal/store";
import { identity } from "@/internal/utils/identity";
import { createContext, useContext, useEffect, useRef } from "react";
import { weld } from "../main";
import { useCompare } from "./compare";
import { useStore } from "./store";

export function createContextFromStore<TName extends keyof typeof weld>(name: TName) {
  type TStore = (typeof weld)[TName];
  type TState = ExtractStoreState<TStore>;
  type TInitialState = TState extends { setInitialState: (values: infer TValues) => void }
    ? TValues
    : never;

  const Context = createContext<TStore | undefined>(undefined);

  function provider({
    children,
  }: React.PropsWithChildren<{
    onUpdateError?(error: unknown): void;
    initialState?: TInitialState;
  }>) {
    const store = useRef(weld[name]);
    useEffect(() => {
      const state = store.current.getState();
      if (hasLifeCycleMethods(state)) {
        state.__init?.();
        return () => {
          state.__cleanup?.();
        };
      }
    }, []);
    return <Context.Provider value={store.current}>{children}</Context.Provider>;
  }

  function hook(): TState;
  function hook<TSlice>(selector: (state: TState) => TSlice): TSlice;
  function hook<TKey extends keyof TState>(key: TKey): TState[TKey];
  function hook<TKeys extends ReadonlyArray<keyof TState>>(
    ...keys: [...TKeys]
  ): { [K in TKeys[number]]: TState[K] };
  function hook(
    selectorOrKey: ((state: TState) => unknown) | keyof TState = identity,
    ...additionalKeys: ReadonlyArray<keyof TState>
  ): unknown {
    let store = useContext(Context);

    if (!store) {
      store = weld[name];
      if (hasLifeCycleMethods(store.getInitialState())) {
        throw new Error(`[WELD] ${name} hook cannot be used without a provider`);
      }
    }

    return useStore(
      store,
      useCompare((state) => {
        if (typeof selectorOrKey === "function") {
          return selectorOrKey(state);
        }
        if (additionalKeys.length === 0) {
          return state[selectorOrKey as keyof TState];
        }
        const res: Record<string, unknown> = {
          [selectorOrKey]: state[selectorOrKey as keyof TState],
        };
        for (const key of additionalKeys) {
          res[key as string] = state[key as keyof TState];
        }
        return res as TState;
      }),
    );
  }

  function storeHook() {
    return useContext(Context);
  }

  return {
    provider,
    hook,
    storeHook,
  };
}
