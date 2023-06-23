/** @format */

import { getBatchPort, getServers } from "libs";
import { NS } from "../../NetscriptDefinitions";

const hackScript = "batching/hack.js";
const growScript = "batching/grow.js";
const weakenScript = "batching/weaken.js";
const hgwScript = "batching/hgw.js";
const nukeScript = "crack.js"

enum Phases {
	Growing,
	Weakening,
	Hacking,
}

export async function main(ns: NS) {
	// const batchPort = getBatchPort(ns);
	// // start by clearing the batch port.
	// batchPort.clear();
	// compile a list of all servers with ram and root access
	// also total all the ram across all the servers.
	let freeRam = 0;

	let runnableServers: string[];
	let hackingPids: number[] = [];
	let growingPids: number[] = [];
	let weakenPids: number[] = [];
	function getRunnableServers(): string[] {
		return getServers(ns, s => {
			const server = ns.getServer(s);
			// exclude servers without enough free ram to run any of our scripts.
			if (
				server.maxRam - server.ramUsed <
				Math.max(
					ns.getScriptRam(hackScript),
					ns.getScriptRam(growScript),
					ns.getScriptRam(weakenScript),
					ns.getScriptRam(hgwScript),
				)
			)
				return false;
			// exclude servers you don't have root access to.
			if (!ns.hasRootAccess(s)) return false;
			freeRam += server.maxRam - server.ramUsed;
			return true;
		});

		// keep our pids clean.
		hackingPids = hackingPids.filter(pid => ns.isRunning(pid))
		growingPids = growingPids.filter(pid => ns.isRunning(pid))
		weakenPids = weakenPids.filter(pid => ns.isRunning(pid))
	}

	// This is the main prepping loop.
	async function prepIt(target: string) {
		let phase: Phases = Phases.Growing;
		while (true) {
			// always keep our runnable servers up to date.
			ns.tail();
			ns.disableLog('ALL');
			ns.clearLog();
			runnableServers = getRunnableServers();
			ns.print(`Runnable Servers: ${runnableServers.length}`)
			ns.print(`Hackable Servers: ${targets.length}`)
			ns.print(`Current Target: ${target}`)
			if (ns.getServerMoneyAvailable(target) < ns.getServerMaxMoney(target))
				phase = Phases.Growing
			else if (ns.getServerSecurityLevel(target) > ns.getServerMinSecurityLevel(target))
				phase = Phases.Weakening
			else
				phase = Phases.Hacking

			for (const host of runnableServers) {
				switch (phase) {
					case Phases.Growing:
						growingPids.push(ns.exec(growScript, host, undefined, target));
						break;
					case Phases.Weakening:
						while (growingPids.length > 0) {
							const pid = growingPids.pop();
							if (!pid) continue;
							ns.kill(pid);
						}
						while (hackingPids.length > 0) {
							const pid = hackingPids.pop();
							if (!pid) continue;
							ns.kill(pid)
						}
						weakenPids.push(ns.exec(weakenScript, host, undefined, target))
						break
					case Phases.Hacking:
						hackingPids.push(ns.exec(hgwScript, host, undefined, target))
						break;
				}
			}
			await ns.sleep(500)
		}
	}
	// This is the main hacking loop.
	async function hackIt(target: string) {
		while (true) {
			// always keep our runnable servers up to date.
			runnableServers = getRunnableServers();
			for (const host of runnableServers) {

			}
			await ns.sleep(500)
		}
	}
	// Without formulas, a common de facto algorithm (credit to discord user xsinx) for finding the best server to target is to pare the list down to only servers with a hacking requirement of half your level, then divide their max money by the minimum security level. Pick whichever server scores highest. (For a fully functional batcher, you don't need to do that division, but if you had one of those you wouldn't be reading this.)
	// Find hacking targets
	ns.tprint('Nuking!')
	const nukePid = ns.run(nukeScript);
	while (ns.isRunning(nukePid)) {
		await ns.sleep(500)
	}
	ns.tprint('Finished nuking')
	ns.tprint(`Current hacking level / 2: ${ns.getHackingLevel() / 2}`)
	let targets: string[] = getServers(ns)
		.filter(s => {
			if (ns.getServerRequiredHackingLevel(s) > ns.getHackingLevel() / 2) {
				return false;
			}

			return true;
		});
	targets.sort((a, b) => {
		function value(server: string) {
			return ns.getServerMaxMoney(server) / ns.getServerMinSecurityLevel(server);
		}
		// sort in descending order so the best one is first.
		return value(b) - value(a)
	})

	if (targets.length === 0) {
		ns.tprint(`You can't hack it! No hacking target available.`)
		return;
	}
	ns.tprint(`You can hack ${targets.length} servers`)
	ns.tprint(`The best one is ${targets[0]}`)
	ns.tprint(`Hacking ${targets[0]}`)
	await prepIt(targets[0])
}
