import { dispatchEvent } from "@/internal/events";
import { STORAGE_KEYS } from "../server";
import { defaults } from "./config";

export type WeldStorage = {
  get(key: string): string | undefined;
  set(key: string, value: string): void;
  remove(key: string): void;
};

/**
 * Retrieves a value from storage.
 * Always returns `undefined` when persistence is disabled
 */
export function getPersistedValue(key: keyof typeof STORAGE_KEYS): string | undefined {
  if (!defaults.persistence.enabled) {
    return undefined;
  }
  return defaults.persistence.storage.get(STORAGE_KEYS[key]) ?? undefined;
}

export const defaultStorage: WeldStorage = {
  get(key) {
    try {
      const arr = document?.cookie?.split("; ") ?? [];
      for (const str of arr) {
        const [k, v] = str.split("=");
        if (k === key) {
          dispatchEvent("debug", "log", "debug", {
            message: "Retrieved cookie",
            data: { key, value: v },
            source: "defaultStorage",
          });
          return v;
        }
      }
      dispatchEvent("debug", "log", "debug", {
        message: "Cookie not found",
        data: { key },
        source: "defaultStorage",
      });
      return undefined;
    } catch (error) {
      dispatchEvent("debug", "log", "debug", {
        message: "Error while retrieving cookie",
        data: { key, error },
        source: "defaultStorage",
      });
      return undefined;
    }
  },
  set(key, value) {
    const exp = new Date(Date.now() + 400 * 24 * 60 * 60 * 1000);
    dispatchEvent("debug", "log", "debug", {
      message: "Setting cookie",
      data: { key, value, exp },
      source: "defaultStorage",
    });
    document.cookie = `${key}=${value}; expires=${exp.toUTCString()}; path=/;`;
  },
  remove(key) {
    dispatchEvent("debug", "log", "debug", {
      message: "Removing cookie",
      data: { key },
      source: "defaultStorage",
    });
    document.cookie = `${key}=; expires=${new Date(0).toUTCString()}; path=/;`;
  },
};
