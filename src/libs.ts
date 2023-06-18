/** @format */

import { NS } from "@ns";

export function restart(ns: NS) {
	ns.spawn("start.js");
}

export function getServers(ns: NS): string[] {
	const servers: Set<string> = new Set<string>();
	const scannedServers: Set<string> = new Set();
	function subServers(target?: string): string[] | void {
		if (!target || scannedServers.has(target)) return;
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
