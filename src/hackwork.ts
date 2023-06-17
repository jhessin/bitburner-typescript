/** @format */

import { NS } from "../NetscriptDefinitions";

const factionsToJoin = ["Daedalus", "Sector-12"];

/** @param {NS} ns */
export async function main(ns: NS) {
	while (true) {
		for (const faction of ns.singularity.checkFactionInvitations()) {
			if (factionsToJoin.includes(faction)) {
				ns.singularity.joinFaction(faction);
			}
		}
		for (const faction of factionsToJoin) {
			if (!ns.getPlayer().factions.includes(faction)) continue;
			if (ns.singularity.workForFaction(faction, "hacking")) return;
		}
		await ns.sleep(500);
	}
}
