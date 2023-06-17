/**
 * @format
 * @param {NS} ns
 * @returns {number}
 */
import { NS } from "@ns";

/** @param {NS} ns */
export function restart(ns: NS) {
	ns.spawn("start.js");
}

/** @param {NS} ns
 * @returns {string[]}
 */
export function getServers(ns: NS): string[] {
	/** @type {Set<string>} servers */
	const servers = new Set<string>();
	/** @type {Set<string>} scannedServers */
	const scannedServers = new Set();
	/** @param {string} target
	 *  @returns {string[]}
	 */
	function subServers(target?: string) {
		if (scannedServers.has(target)) return;
		scannedServers.add(target);
		const next = ns.scan(target);
		for (const server of next) {
			servers.add(server);
			subServers(server);
		}
		return next;
	}
	subServers();
	return Array.from(servers);
}
