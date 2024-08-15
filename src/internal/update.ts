import { weld } from "@/lib/main";
import type { StoreConfig, UpdateConfig } from "@/lib/main/stores/config";
import type { LifeCycleManager } from "./lifecycle";

function mergeConfigs<TKey extends keyof UpdateConfig>(
  key: TKey,
  base: UpdateConfig,
  ...configs: (Partial<UpdateConfig> | undefined | false)[]
): UpdateConfig[TKey] {
  console.log("base", base);
  for (let i = configs.length - 1; i >= 0; i--) {
    const config = configs[i];
    const value = typeof config === "boolean" ? undefined : config?.[key];
    if (typeof value !== "undefined") {
      return value;
    }
  }
  return base[key];
}

export function setupAutoUpdate(
  update: () => unknown,
  lifecycle: LifeCycleManager,
  store?: keyof StoreConfig,
  ...overrides: (Partial<UpdateConfig> | undefined)[]
) {
  let unsubInterval: (() => void) | undefined = undefined;
  lifecycle.subscriptions.add(
    weld.config.subscribeWithSelector(
      (config) => mergeConfigs("updateInterval", config, store && config[store], ...overrides),
      (updateInterval) => {
        console.log("update interval for", store);
        if (unsubInterval) {
          unsubInterval();
          unsubInterval = undefined;
        }
        if (updateInterval) {
          const pollInterval = setInterval(update, updateInterval);
          unsubInterval = lifecycle.subscriptions.add(() => {
            clearInterval(pollInterval);
          });
        }
      },
      { fireImmediately: true },
    ),
  );

  let unsubWindowFocus: (() => void) | undefined = undefined;
  lifecycle.subscriptions.add(
    weld.config.subscribeWithSelector(
      (config) => mergeConfigs("updateOnWindowFocus", config, store && config[store], ...overrides),
      (updateOnWindowFocus) => {
        console.log("update window focus for", store);
        if (unsubWindowFocus) {
          unsubWindowFocus();
          unsubWindowFocus = undefined;
        }
        if (updateOnWindowFocus) {
          window.addEventListener("focus", update);
          unsubWindowFocus = lifecycle.subscriptions.add(() => {
            window.removeEventListener("focus", update);
          });
        }
      },
      { fireImmediately: true },
    ),
  );
}
