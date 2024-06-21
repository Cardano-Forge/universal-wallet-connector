import type { WalletHandler } from "@/internal/handler";
import type { NetworkId, WalletKey } from "@/lib/utils";

export type EventsDef = {
  wallet: {
    connection: {
      initiate: undefined;
      success: { handler: WalletHandler };
      error: { error: unknown };
    };
    update: {
      error: { error: unknown };
    };
    balance: {
      update: {
        handler: WalletHandler;
        cbor: string;
        balanceLovelace: number | undefined;
      };
    };
    "reward-address": {
      update: {
        handler: WalletHandler;
        rewardAddress: string;
      };
    };
    "change-address": {
      update: {
        handler: WalletHandler;
        changeAddress: string;
      };
    };
    network: {
      update: {
        handler: WalletHandler;
        networkId: NetworkId;
      };
    };
  };
  debug: {
    log: {
      debug: { message: string; data?: unknown; source: string };
      info: { message: string; data?: unknown; source: string };
      warning: { message: string; data?: unknown; source: string };
      error: { message: string; data?: unknown; source: string };
    };
  };
};

export type Scope = keyof EventsDef;
export type Ns<TScope extends Scope> = Extract<keyof EventsDef[TScope], string>;
export type Type<TScope extends Scope, TNs extends Ns<TScope>> = keyof EventsDef[TScope][TNs];
export type Data<
  TScope extends Scope,
  TNs extends Ns<TScope>,
  TType extends Type<TScope, TNs>,
> = EventsDef[TScope][TNs][TType];

type UnionToIntersection<U> = (U extends object ? (k: U) => void : never) extends (
  k: infer I,
) => void
  ? I
  : never;

type AnyEvent = {
  "weld:*": {
    [TScope in Scope]: {
      [TNs in Ns<TScope>]: {
        [TType in Type<TScope, TNs>]: {
          scope: TScope;
          ns: TNs;
          type: TType;
          data: Data<TScope, TNs, TType>;
          key: string;
        };
      }[Type<TScope, TNs>];
    }[Ns<TScope>];
  }[Scope];
};

type EventByScope = {
  [TScope in Scope as `weld:${TScope}.*`]: {
    [TNs in Ns<TScope>]: {
      [TType in Type<TScope, TNs>]: {
        ns: TNs;
        type: TType;
        data: Data<TScope, TNs, TType>;
        key: string;
      };
    }[Type<TScope, TNs>];
  }[Ns<TScope>];
};

type EventByNs = UnionToIntersection<
  {
    [TScope in Scope]: {
      [TNs in Ns<TScope> as `weld:${TScope}.${Extract<TNs, string>}.*`]: {
        [TType in Type<TScope, TNs>]: {
          type: TType;
          data: Data<TScope, TNs, TType>;
          key: string;
        };
      }[Type<TScope, TNs>];
    };
  }[Scope]
>;

type EventByType = UnionToIntersection<
  {
    [TScope in Scope]: {
      [TNs in Ns<TScope>]: {
        [TType in Type<TScope, TNs> as `weld:${TScope}.${Extract<TNs, string>}.${Extract<
          TType,
          string
        >}.*`]: {
          data: Data<TScope, TNs, TType>;
          key: string;
        };
      };
    }[Ns<TScope>];
  }[Scope]
>;

type EventBySupportedWallet = UnionToIntersection<
  {
    [TScope in Scope]: {
      [TNs in Ns<TScope>]: {
        [TType in Type<TScope, TNs> as `weld:${TScope}.${Extract<TNs, string>}.${Extract<
          TType,
          string
        >}.${WalletKey}`]: {
          data: Data<TScope, TNs, TType>;
        };
      };
    }[Ns<TScope>];
  }[Scope]
>;

export type EventByUnsupportedWallet = UnionToIntersection<
  {
    [TScope in Scope]: {
      [TNs in Ns<TScope>]: {
        [TType in Type<TScope, TNs> as `weld:${TScope}.${Extract<TNs, string>}.${Extract<
          TType,
          string
        >}.${string}`]: {
          data: Data<TScope, TNs, TType>;
        };
      };
    }[Ns<TScope>];
  }[Scope]
>;

export type WeldEvent = AnyEvent & EventByScope & EventByNs & EventByType & EventBySupportedWallet;

export function dispatchEvent<
  TScope extends Scope,
  TNs extends Ns<TScope>,
  TType extends keyof EventsDef[TScope][TNs],
>(scope: TScope, ns: TNs, type: TType, data: EventsDef[TScope][TNs][TType], key?: string) {
  document.dispatchEvent(new CustomEvent("weld:*", { detail: { scope, ns, type, data, key } }));
  document.dispatchEvent(new CustomEvent(`weld:${scope}.*`, { detail: { ns, type, data, key } }));
  document.dispatchEvent(
    new CustomEvent(`weld:${scope}.${String(ns)}.*`, {
      detail: { type, data, key },
    }),
  );
  if (key) {
    document.dispatchEvent(
      new CustomEvent(`weld:${scope}.${String(ns)}.${String(type)}.*`, {
        detail: { data, key },
      }),
    );
    document.dispatchEvent(
      new CustomEvent(`weld:${scope}.${String(ns)}.${String(type)}.${key}`, {
        detail: { data },
      }),
    );
  } else {
    document.dispatchEvent(
      new CustomEvent(`weld:${scope}.${String(ns)}.${String(type)}`, {
        detail: { data },
      }),
    );
  }
}
