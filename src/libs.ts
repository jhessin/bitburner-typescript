/** @format */

import { NS } from "@ns";

export function restart(ns: NS) {
	ns.spawn("start.js");
}

/**
 * @param filter: A callback function for testing wheather to include a server
 * or not.
 */
export function getServers(
	ns: NS,
	filter: (server: string) => boolean = () => true,
): string[] {
	const servers: Set<string> = new Set<string>();
	const scannedServers: Set<string> = new Set();
	function subServers(target: string = 'home'): string[] | void {
		if (scannedServers.has(target)) return;
		if (filter(target)) servers.add(target);
		scannedServers.add(target);
		const nextServers = ns.scan(target);
		for (const server of nextServers) {
			if (filter(server)) servers.add(server);
			subServers(server);
		}
		return nextServers;
	}
	subServers();
	return Array.from(servers);
}

export async function backdoorServers(ns: NS): Promise<void> {
	const serverList = ["home"];
	async function children(host: string) {
		ns.singularity.connect(host);
		for (const child of ns.scan(host)) {
			if (!serverList.includes(child)) {
				serverList.push(child);
				const parent = ns.singularity.getCurrentServer();
				ns.singularity.connect(child);
				try {
					if (ns.hasRootAccess(child))
						await ns.singularity.installBackdoor();
				} catch (e) {
					ns.print(e);
				} finally {
					await children(child);
					ns.singularity.connect(parent);
				}
			}
		}
	}
	await children("home");
}

export function getBatchPort(ns: NS) {
	return ns.getPortHandle(1);
}
