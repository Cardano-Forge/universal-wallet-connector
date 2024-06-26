import { WalletConnectionError, enableWallet, getWalletInfo, getWindowCardano } from "@/lib/utils";

import { dispatchEvent } from "@/internal/events";
import { DefaultWalletHandler, type WalletHandler } from "@/internal/handler";
import type { WalletConfig } from "@/lib/main";

export type WalletConnector = (key: string, config: WalletConfig) => Promise<WalletHandler>;

export function createWalletConnector<T extends WalletConnector>(c: T): T {
  return c;
}

export function getDefaultWalletConnector(): (
  key: string,
  config: WalletConfig,
) => Promise<DefaultWalletHandler>;
export function getDefaultWalletConnector<TConstructor extends typeof DefaultWalletHandler>(
  HandlerConstructor: TConstructor,
): (key: string, config: WalletConfig) => Promise<InstanceType<TConstructor>>;
export function getDefaultWalletConnector<TConstructor extends typeof DefaultWalletHandler>(
  HandlerConstructor?: TConstructor,
) {
  return async (key: string, config: WalletConfig): Promise<InstanceType<TConstructor>> => {
    dispatchEvent(key, "wallet", "connection", "initiate", undefined);

    const defaultApi = await getWindowCardano({ key });
    if (!defaultApi) {
      const message = "Could not retrieve the wallet API";
      const error = new WalletConnectionError(message);
      dispatchEvent(key, "wallet", "connection", "error", { error });
      throw error;
    }

    const info = getWalletInfo({ key, defaultApi });

    const enabledApi = await enableWallet(defaultApi);
    if (!enabledApi) {
      const message = "Could not enable the wallet";
      const error = new WalletConnectionError(message);
      dispatchEvent(key, "wallet", "connection", "error", { error });
      throw error;
    }

    let handler: DefaultWalletHandler;
    if (HandlerConstructor) {
      handler = new HandlerConstructor(info, defaultApi, enabledApi, config);
    } else {
      handler = new DefaultWalletHandler(info, defaultApi, enabledApi, config);
    }

    dispatchEvent(key, "wallet", "connection", "success", { handler });
    return handler as InstanceType<TConstructor>;
  };
}
