import { type WeldStorage, defaultStorage } from "./persistence";

export type WalletConfig = {
  overwriteExistingConnection: boolean;
  pollInterval: number | false;
  updateOnWindowFocus: boolean;
  allowMultipleConnections: boolean;
};

export type PersistenceConfig = {
  enabled: boolean;
  storage: WeldStorage;
};

export type WeldConfig = {
  ignoreUnsafeUsageError: boolean;
  wallet: WalletConfig;
  persistence: PersistenceConfig;
};

export const defaults: WeldConfig = {
  ignoreUnsafeUsageError: false,
  wallet: {
    overwriteExistingConnection: false,
    pollInterval: 2000,
    updateOnWindowFocus: true,
    allowMultipleConnections: false,
  },
  persistence: {
    enabled: true,
    storage: defaultStorage,
  },
};
