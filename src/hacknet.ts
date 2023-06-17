/** @format */

import { NS } from "../NetscriptDefinitions";

const cashPercent = 0.9;

/** @param {NS} ns */
export async function main(ns: NS) {
	while (true) {
		const currentCash = ns.getServerMoneyAvailable("home") * cashPercent;
		if (
			ns.hacknet.numNodes() < ns.hacknet.maxNumNodes() &&
			ns.hacknet.getPurchaseNodeCost() <= currentCash
		) {
			ns.hacknet.purchaseNode();
		}

		for (let i = 0; i < ns.hacknet.numNodes(); i++) {
			// const node = ns.hacknet.getNodeStats(i);
			if (ns.hacknet.getLevelUpgradeCost(i, 1) <= currentCash) {
				ns.hacknet.upgradeLevel(i, 1);
			}
			if (ns.hacknet.getCoreUpgradeCost(i, 1) <= currentCash) {
				ns.hacknet.upgradeCore(i, 1);
			}
			if (ns.hacknet.getRamUpgradeCost(i, 1) <= currentCash) {
				ns.hacknet.upgradeRam(i, 1);
			}
		}
		await ns.sleep(500);
	}
}
