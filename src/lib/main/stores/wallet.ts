import type { WalletHandler } from "@/internal/handler";
import {
  type Store,
  type StoreLifeCycleMethods,
  createStore,
} from "@/internal/store";
import {
  type NetworkId,
  WalletConnectionAbortedError,
  WalletDisconnectAccountError,
  type WalletInfo,
  lovelaceToAda,
} from "@/lib/utils";
import { type WalletConfig, defaults } from "../config";
import { connect as weldConnect } from "../connect";
import { getPersistedValue } from "../persistence";
import { STORAGE_KEYS } from "@/lib/server";

type WalletProps = WalletInfo & {
  isConnectingTo: string | undefined;
  handler: WalletHandler;
  balanceLovelace: number;
  balanceAda: number;
  rewardAddress: string;
  changeAddress: string;
  networkId: NetworkId;
};

const initialWalletState: WalletState = {
  isConnected: false,
  isConnectingTo: undefined,
  handler: undefined,
  balanceLovelace: undefined,
  balanceAda: undefined,
  rewardAddress: undefined,
  changeAddress: undefined,
  networkId: undefined,
  supported: undefined,
  key: undefined,
  icon: undefined,
  website: undefined,
  displayName: undefined,
  description: undefined,
  supportsTxChaining: undefined,
};

type ConnectWalletCallbacks = {
  onSuccess(wallet: ConnectedWalletState): void;
  onError(error: unknown): void;
};

type WalletApi = {
  connect(key: string, config?: Partial<WalletConfig & ConnectWalletCallbacks>): void;
  connectAsync: (key: string, config?: Partial<WalletConfig>) => Promise<ConnectedWalletState>;
  disconnect(): void;
};

export type WalletState =
  | ({ isConnected: true } & WalletProps)
  | ({ isConnected: false } & { [TKey in keyof WalletProps]: WalletProps[TKey] | undefined });

export type ConnectedWalletState = Extract<WalletState, { isConnected: true }>;
export type DiconnectedWalletState = Extract<WalletState, { isConnected: false }>;

export type WalletStoreState = WalletState & WalletApi;
export type WalletStore = Store<WalletStoreState>;

export type CreateWalletStoreOpts = Partial<Pick<WalletProps, "isConnectingTo">> & {
  onUpdateError?(error: unknown): void;
};

type InFlightConnection = {
  aborted: boolean;
};

export type CreateWalletStore = {
  (opts?: CreateWalletStoreOpts): WalletStore;
  vanilla(opts?: CreateWalletStoreOpts): WalletStore;
};

export function storeCreator<TConfig extends ReadonlyArray<unknown>, TState extends object>(
  storeHandler: (
    setState: Store<TState>["setState"],
    getState: Store<TState>["getState"],
    ...config: TConfig
  ) => TState & StoreLifeCycleMethods,
) {
  const factory = (...config: TConfig) => {
    return createStore<TState>((s, g) => {
      return storeHandler(s, g, ...config);
    });
  };

  factory.vanilla = (...config: TConfig) => {
    const store = factory(...config);
    console.log("store", store?.getInitialState());

    window.addEventListener("load", () => {
      console.log("init!");
      store.getState().__init?.();
    });

    window.addEventListener("unload", () => {
      store.getState().__cleanup?.();
    });

    return store;
  };

  return factory;
}

export const createWalletStore = storeCreator<
  [opts?: CreateWalletStoreOpts, config?: Partial<WalletConfig>],
  WalletStoreState
>((setState, _getState, { onUpdateError, ...initialProps } = {}, storeConfigOverrides = {}) => {
  const subscriptions = new Set<() => void>();
  const inFlightConnections = new Set<InFlightConnection>();

  const abortInFlightConnections = () => {
    for (const connection of inFlightConnections) {
      connection.aborted = true;
    }
    inFlightConnections.clear();
  };

  const clearSubscriptions = () => {
    for (const unsubscribe of subscriptions) {
      unsubscribe();
    }
    subscriptions.clear();
  };

  const disconnect: WalletApi["disconnect"] = () => {
    clearSubscriptions();
    setState(initialWalletState);
    if (defaults.persistence.enabled) {
      defaults.persistence.storage.remove(STORAGE_KEYS.connectedWallet);
    }
  };

  const handleError = (error: unknown) => {
    if (error instanceof WalletDisconnectAccountError) {
      disconnect();
    }
  };

  const connectAsync: WalletApi["connectAsync"] = async (key, connectConfigOverrides) => {
    const signal: InFlightConnection = { aborted: false };
    inFlightConnections.add(signal);

    try {
      clearSubscriptions();

      setState({ isConnectingTo: key });

      const config: WalletConfig = {
        ...defaults.wallet,
        ...storeConfigOverrides,
        ...connectConfigOverrides,
      };

      const handler = await weldConnect(key, config);

      if (signal.aborted) {
        throw new WalletConnectionAbortedError();
      }

      const updateState = async () => {
        const balanceLovelace = await handler.getBalanceLovelace();
        const newState: ConnectedWalletState = {
          isConnected: true,
          isConnectingTo: undefined,
          handler,
          balanceLovelace,
          balanceAda: lovelaceToAda(balanceLovelace),
          networkId: await handler.getNetworkId(),
          rewardAddress: await handler.getStakeAddress(),
          changeAddress: await handler.getChangeAddress(),
          ...handler.info,
        };

        setState(newState);
        return newState;
      };

      const newState = await updateState();

      if (signal.aborted) {
        throw new WalletConnectionAbortedError();
      }

      if (config.pollInterval) {
        const pollInterval = setInterval(() => {
          console.log("updating state on interval");
          updateState();
        }, config.pollInterval);
        subscriptions.add(() => {
          console.log("stop polling");
          clearInterval(pollInterval);
        });
      }

      if (config.updateOnWindowFocus) {
        const listener = () => {
          console.log("updating state on window focus");
          updateState();
        };
        window.addEventListener("focus", listener);
        subscriptions.add(() => {
          console.log("stop listening for focus events");
          window.removeEventListener("focus", listener);
        });
      }

      if (defaults.persistence.enabled) {
        defaults.persistence.storage.set(STORAGE_KEYS.connectedWallet, newState.key);
      }

      return newState;
    } catch (error) {
      handleError(error);
      disconnect();
      throw error;
    } finally {
      inFlightConnections.delete(signal);
    }
  };

  const connect: WalletApi["connect"] = async (key, { onSuccess, onError, ...config } = {}) => {
    connectAsync(key, config)
      .then((wallet) => {
        onSuccess?.(wallet);
      })
      .catch((error) => {
        onError?.(error);
      });
  };

  const initialState: WalletStoreState & StoreLifeCycleMethods = {
    ...initialWalletState,
    ...initialProps,
    connect,
    connectAsync,
    disconnect,
  };

  initialState.__init = () => {
    if (
      !initialState.isConnectingTo &&
      typeof window !== "undefined" &&
      defaults.persistence.enabled
    ) {
      initialState.isConnectingTo = getPersistedValue("connectedWallet");
    }

    if (initialState.isConnectingTo) {
      console.log("autoconnect:", initialState.isConnectingTo);
      connect(initialState.isConnectingTo);
    }
  };

  initialState.__cleanup = () => {
    console.log("cleanup!");
    clearSubscriptions();
    abortInFlightConnections();
  };

  return initialState;
});
