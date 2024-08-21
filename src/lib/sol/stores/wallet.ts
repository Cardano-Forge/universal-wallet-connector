import { LifeCycleManager } from "@/internal/lifecycle";
import { type Store, type StoreLifeCycleMethods, createStoreFactory } from "@/internal/store";

import { setupAutoUpdate } from "@/internal/update";
import type { PartialWithDiscriminant } from "@/internal/utils/types";
import {
  WalletConnectionAbortedError,
  WalletConnectionError,
  WalletDisconnectAccountError,
} from "@/lib/main";
import type { WalletConfig } from "@/lib/main/stores/config";
import { STORAGE_KEYS } from "@/lib/server";
import type { SolExtensionInfo, SolExtensionKey, SolHandler } from "../types";
import { weldSol } from ".";

export type SolWalletProps = SolExtensionInfo & {
  isConnected: boolean;
  isConnecting: boolean;
  isConnectingTo: SolExtensionKey | undefined;
  handler: SolHandler;
};

export type ConnectedSolWalletState = Extract<SolWalletState, { isConnected: true }>;
export type DiconnectedSolWalletState = Extract<SolWalletState, { isConnected: false }>;

function newInitialSolState(): PartialWithDiscriminant<SolWalletProps, "isConnected"> {
  return {
    key: undefined,
    displayName: undefined,
    isConnected: false,
    isConnecting: false,
    isConnectingTo: undefined,
    handler: undefined,
  };
}

export type ConnectSolWalletCallbacks = {
  onSuccess(wallet: ConnectedSolWalletState): void;
  onError(error: unknown): void;
};

export type SolWalletApi = {
  connect(key: SolExtensionKey, config?: Partial<WalletConfig & ConnectSolWalletCallbacks>): void;
  connectAsync: (
    key: SolExtensionKey,
    config?: Partial<WalletConfig>,
  ) => Promise<ConnectedSolWalletState>;
  disconnect(): void;
} & StoreLifeCycleMethods;

export type SolWalletState = PartialWithDiscriminant<SolWalletProps, "isConnected"> & SolWalletApi;

export type ExtendedSolWalletState = SolWalletState & {
  __persist(isConnectingTo?: string): void;
};

export type SolWalletStore = Store<SolWalletState>;

export const createSolWalletStore = createStoreFactory<SolWalletState>((setState, getState) => {
  const lifecycle = new LifeCycleManager();

  const handleUpdateError = (error: unknown) => {
    weldSol.config.getState().onUpdateError?.("wallet", error);
    weldSol.config.getState().wallet.onUpdateError?.(error);
  };

  const disconnect: SolWalletApi["disconnect"] = () => {
    lifecycle.subscriptions.clearAll();
    setState(newInitialSolState());
    if (weldSol.config.getState().enablePersistence) {
      weldSol.config.getState().storage.remove(STORAGE_KEYS.connectedSolWallet);
    }
  };

  const connectAsync: SolWalletApi["connectAsync"] = async (key, configOverrides) => {
    const signal = lifecycle.inFlight.add();

    try {
      lifecycle.subscriptions.clearAll();

      setState({ isConnectingTo: key, isConnecting: true });

      let abortTimeout: NodeJS.Timeout | undefined = undefined;

      const connectTimeout =
        configOverrides?.connectTimeout ?? weldSol.config.getState().wallet?.connectTimeout;

      if (connectTimeout) {
        abortTimeout = setTimeout(() => {
          signal.aborted = true;
          setState({ isConnectingTo: undefined, isConnecting: false });
        }, connectTimeout);
      }

      const extension = weldSol.extensions.getState().installedMap.get(key);

      if (!extension?.handler) {
        throw new WalletConnectionError(`The ${key} extension is not installed`);
      }

      if (signal.aborted) {
        throw new WalletConnectionAbortedError();
      }

      const updateState = async () => {
        const newState: Partial<ConnectedSolWalletState> = {
          key: extension.key,
          displayName: extension.displayName,
          isConnected: true,
          isConnecting: false,
          isConnectingTo: undefined,
          handler: extension.handler,
        };

        setState(newState);
      };

      const safeUpdateState = async () => {
        try {
          return await updateState();
        } catch (error) {
          handleUpdateError(error);
          disconnect();
        }
      };

      await updateState();

      const newState = getState();
      if (!newState.isConnected) {
        throw new Error("Connection failed");
      }

      if (signal.aborted) {
        throw new WalletConnectionAbortedError();
      }

      setupAutoUpdate(safeUpdateState, lifecycle, "wallet", configOverrides);

      if (weldSol.config.getState().enablePersistence) {
        weldSol.config.getState().storage.set(STORAGE_KEYS.connectedWallet, newState.key);
      }

      if (abortTimeout) {
        clearTimeout(abortTimeout);
      }

      return newState as ConnectedSolWalletState;
    } catch (error) {
      if (error instanceof WalletDisconnectAccountError) {
        disconnect();
      }
      throw error;
    } finally {
      lifecycle.inFlight.remove(signal);
    }
  };

  const connect: SolWalletApi["connect"] = async (key, { onSuccess, onError, ...config } = {}) => {
    connectAsync(key, config)
      .then((wallet) => {
        onSuccess?.(wallet);
      })
      .catch((error) => {
        onError?.(error);
      });
  };

  const init: SolWalletApi["init"] = () => {
    if (initialState.isConnectingTo) {
      connect(initialState.isConnectingTo);
    }
  };

  const __persist: ExtendedSolWalletState["__persist"] = (serverIsConnectingTo?: string) => {
    let isConnectingTo = serverIsConnectingTo;
    if (
      !isConnectingTo &&
      typeof window !== "undefined" &&
      weldSol.config.getState().enablePersistence
    ) {
      isConnectingTo = weldSol.config.getState().getPersistedValue("connectedWallet");
    }
    initialState.isConnectingTo = isConnectingTo as SolExtensionKey;
    initialState.isConnecting = !!isConnectingTo;
  };

  const cleanup: SolWalletApi["cleanup"] = () => {
    lifecycle.cleanup();
  };

  const initialState: ExtendedSolWalletState = {
    ...newInitialSolState(),
    connect,
    connectAsync,
    disconnect,
    init,
    cleanup,
    __persist,
  };

  return initialState as SolWalletState;
});