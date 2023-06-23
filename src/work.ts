/** @format */

import type { FactionWorkType, NS } from "../NetscriptDefinitions";

export async function main(ns: NS) {
	// enumerate the work types
	const WORK_TYPES: FactionWorkType[] = [
		ns.enums.FactionWorkType.field,
		ns.enums.FactionWorkType.hacking,
		ns.enums.FactionWorkType.security,
	];
	// get the first argument as a work type.
	let arg = (ns.args[0] as FactionWorkType) || WORK_TYPES[0];
	if (!WORK_TYPES.includes(arg)) {
		ns.tail();
		ns.disableLog("ALL");
		ns.tprint(`Unknown work type ${arg}`);
		ns.tprint("Valid values are:");
		for (const work of WORK_TYPES) {
			ns.tprint(`\t ${work}`);
		}
		ns.tprint(`Defaulting to ${WORK_TYPES[0]} work`);
		arg = WORK_TYPES[0];
		await ns.sleep(500);
	}
	while (true) {
		ns.tail();
		ns.clearLog();
		for (const faction of ns.singularity.checkFactionInvitations()) {
			try {
				ns.singularity.joinFaction(faction);
			} catch (error) {
				ns.tprint(error);
			}
		}
		for (const faction of ns.getPlayer().factions) {
			if (ns.singularity.workForFaction(faction, arg, false)) return;
		}
		await ns.sleep(500);
	}
}
