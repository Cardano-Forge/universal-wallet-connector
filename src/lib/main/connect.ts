import type { WalletKey } from "@/lib/utils";

import { dispatchEvent } from "@/internal/events";

import {
  clearConnectedWallets,
  getConnectedWallet,
  setConnectedWallet,
} from "@/internal/connected-wallets";
import { getDefaultWalletConnector } from "@/internal/connector";
import {
  type WalletHandlerByKey,
  customWalletConnectors,
  hasCustomConnector,
} from "@/internal/custom";
import { type ExtendedWalletHandler, extend } from "@/internal/extended";
import type { WalletHandler } from "@/internal/handler";
import { UNSAFE_LIB_USAGE_ERROR, isBrowser } from "@/internal/utils/browser";
import { type WalletConfig, defaults } from "./config";

function getConnectConfig(overrides: Partial<WalletConfig> = {}): WalletConfig {
  return {
    ...defaults.wallet,
    ...overrides,
  };
}

/**
 * Connect and enable a user wallet extension
 * @param {string} key - The extension API key on the window.cardano object
 * @throws WalletConnectionError
 * @returns WalletHandler
 */
export async function connect<T extends WalletKey>(
  key: T,
  config?: Partial<WalletConfig>,
): Promise<ExtendedWalletHandler<WalletHandlerByKey[T]>>;
export async function connect(
  key: string,
  config?: Partial<WalletConfig>,
): Promise<ExtendedWalletHandler>;
export async function connect(
  key: string,
  configOverrides?: Partial<WalletConfig>,
): Promise<ExtendedWalletHandler> {
  if (!isBrowser() && !defaults.ignoreUnsafeUsageError) {
    console.error(UNSAFE_LIB_USAGE_ERROR);
    dispatchEvent(
      "debug",
      "log",
      "warning",
      {
        message: "Trying to connect outside of a browser environment",
        source: "connect",
      },
      key,
    );
  }

  dispatchEvent(
    "debug",
    "log",
    "debug",
    {
      message: "Connecting wallet...",
      data: { params: { key, configOverrides } },
      source: "connect",
    },
    key,
  );

  const config = getConnectConfig(configOverrides);

  const connectedWallet = getConnectedWallet(key);
  if (connectedWallet && !config.overwriteExistingConnection) {
    return connectedWallet;
  }

  if (!config.allowMultipleConnections) {
    clearConnectedWallets();
  }

  let handler: WalletHandler;
  if (hasCustomConnector(key)) {
    handler = await customWalletConnectors[key](key, config);
  } else {
    handler = await getDefaultWalletConnector()(key, config);
  }

  const extendedHandler = extend(handler);

  setConnectedWallet(key, extendedHandler);

  dispatchEvent(
    "debug",
    "log",
    "debug",
    {
      message: "Connected",
      data: {
        params: { key, configOverrides },
        handler: extendedHandler,
        config,
      },
      source: "connect",
    },
    key,
  );

  return extendedHandler;
}
