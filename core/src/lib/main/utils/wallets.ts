import type { WalletExtension } from "./extensions";

export type WalletInfo = {
	supported: boolean;
	key: string;
	icon: string;
	website: string | undefined;
	displayName: string;
	supportsTxChaining: boolean;
};

export const SUPPORTED_WALLETS: WalletInfo[] = [
	{
		supported: true,
		key: "eternl",
		displayName: "Eternl",
		icon: "https://raw.githubusercontent.com/cardano-forge/weld/main/images/wallets/eternl.svg",
		website:
			"https://chrome.google.com/webstore/detail/eternl/kmhcihpebfmpgmihbkipmjlmmioameka?hl=en-US",
		supportsTxChaining: true,
	},
	{
		supported: true,
		key: "lace",
		displayName: "Lace",
		icon: "https://raw.githubusercontent.com/cardano-forge/weld/main/images/wallets/lace.svg",
		website:
			"https://chrome.google.com/webstore/detail/lace/gafhhkghbfjjkeiendhlofajokpaflmk?hl=en-US",
		supportsTxChaining: false,
	},
	{
		supported: true,
		key: "vespr",
		displayName: "VESPR",
		icon: "https://raw.githubusercontent.com/cardano-forge/weld/main/images/wallets/vespr.svg",
		website: "https://www.vespr.xyz/",
		supportsTxChaining: false,
	},
	{
		supported: true,
		key: "tokeo",
		displayName: "Tokeo",
		icon: "https://raw.githubusercontent.com/cardano-forge/weld/main/images/wallets/tokeo.svg",
		website: "https://tokeopay.io",
		supportsTxChaining: false,
	},
	{
		supported: true,
		key: "flint",
		displayName: "Flint",
		icon: "https://raw.githubusercontent.com/cardano-forge/weld/main/images/wallets/flint.svg",
		website:
			"https://chrome.google.com/webstore/detail/flint-wallet/hnhobjmcibchnmglfbldbfabcgaknlkj?hl=en-US",
		supportsTxChaining: false,
	},
	{
		supported: true,
		key: "gerowallet",
		displayName: "Gero",
		icon: "https://raw.githubusercontent.com/cardano-forge/weld/main/images/wallets/gerowallet.svg",
		website:
			"https://chrome.google.com/webstore/detail/gerowallet/bgpipimickeadkjlklgciifhnalhdjhe/overview",
		supportsTxChaining: false,
	},
	{
		supported: true,
		key: "typhoncip30",
		displayName: "Typhon",
		icon: "https://raw.githubusercontent.com/cardano-forge/weld/main/images/wallets/typhoncip30.svg",
		website:
			"https://chrome.google.com/webstore/detail/typhon-wallet/kfdniefadaanbjodldohaedphafoffoh",
		supportsTxChaining: false,
	},
	{
		supported: true,
		key: "nufi",
		displayName: "NuFi",
		icon: "https://raw.githubusercontent.com/cardano-forge/weld/main/images/wallets/nufi.svg",
		website:
			"https://chrome.google.com/webstore/detail/nufi/gpnihlnnodeiiaakbikldcihojploeca?hl=en-US",
		supportsTxChaining: false,
	},
	{
		supported: true,
		key: "nufiSnap",
		displayName: "MetaMask",
		icon: "https://raw.githubusercontent.com/cardano-forge/weld/main/images/wallets/nufi-snap.svg",
		website:
			"https://chrome.google.com/webstore/detail/nufi/gpnihlnnodeiiaakbikldcihojploeca?hl=en-US",
		supportsTxChaining: false,
	},
	{
		supported: true,
		key: "begin",
		displayName: "Begin",
		icon: "https://raw.githubusercontent.com/cardano-forge/weld/main/images/wallets/begin_wallet.svg",
		website: "https://begin.is",
		supportsTxChaining: false,
	},
	{
		supported: true,
		key: "magicmoney",
		displayName: "MagicMoney Wallet",
		icon: "https://raw.githubusercontent.com/cardano-forge/weld/main/images/wallets/magicmoney.svg",
		website: "https://www.chainlensnft.info/",
		supportsTxChaining: false,
	},
];

export const supportedWalletsMap = new Map<string, WalletInfo>(
	SUPPORTED_WALLETS.map((config) => [config.key, config]),
);

export function getWalletInfo(
	extension: WalletExtension,
	registeredWallets: Map<string, WalletInfo> = supportedWalletsMap,
): WalletInfo {
	const info = registeredWallets.get(extension.key);
	if (info) {
		return info;
	}
	return {
		supported: false,
		key: extension.key,
		icon: extension.defaultApi.icon,
		displayName: extension.defaultApi.name,
		website: undefined,
		supportsTxChaining: false,
	};
}
