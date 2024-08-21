import { type EvmStore, createEvmStore } from "@/internal/evm/store";

let store: EvmStore | undefined = undefined;

export const matic = {
  get store() {
    if (!store) {
      store = createEvmStore();
    }
    return store;
  },
};