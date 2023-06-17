/**
 * eslint-disable no-constant-condition
 *
 * @format
 */

/** @format */
import { NS } from "@ns";
import { getServers } from "/libs";

/** @param {NS} ns */
export async function main(ns: NS) {
	ns.tail();
	ns.clearLog();
	ns.disableLog("ALL");
	while (true) {
		try {
			ns.singularity.purchaseTor();
			for (const program of ns.singularity.getDarkwebPrograms()) {
				ns.singularity.purchaseProgram(program);
			}
			break;
		} catch (e) {
			ns.tail();
			ns.clearLog();
			ns.print(e);
			await ns.sleep(500);
			continue;
		}
	}
	const servers = getServers(ns);
	for (const server of servers) {
		ns.print(`accessing ${server}`);
		ns.brutessh(server);
		ns.ftpcrack(server);
		ns.sqlinject(server);
		ns.relaysmtp(server);
		ns.httpworm(server);
		try {
			ns.nuke(server);
			ns.singularity.connect(server);
			await ns.singularity.installBackdoor();
		} catch (error) {
			ns.print(error);
			continue;
		}
	}
	// next(ns);
}
