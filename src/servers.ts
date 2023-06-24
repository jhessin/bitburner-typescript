import type { NS } from "../NetscriptDefinitions";

export async function main(ns: NS) {
	let ram = ns.getPurchasedServerMaxRam()

	// try purchasing the largest server we can
	while (!ns.purchaseServer(Date.now().toString(), ram)) {
		ram /= 2;
		await ns.sleep(500);
		// give up if it gets too small.
		if (ram < 8) return;
	}
}
