/** @format */

import { getServers } from "libs";
import { Batch, BatchMode } from "batching/batch";
import { Job, JobType } from "batching/job";
import { main as PurchaseServers } from "servers";
import { main as Crack } from "crack";
import { NS } from "../../NetscriptDefinitions";

const hackScript = "batching/hack.js";
const growScript = "batching/grow.js";
const weakenScript = "batching/weaken.js";
const hgwScript = "batching/hgw.js";
const basicHack = "basicHack.js";
const version = 1;

enum Phases {
	Growing = 'Growing',
	Weakening = 'Weakening',
	Hacking = 'Hacking',
}

export async function main(ns: NS) {
	// const batchPort = getBatchPort(ns);
	// // start by clearing the batch port.
	// batchPort.clear();
	// compile a list of all servers with ram and root access
	// also total all the ram across all the servers.
	let bufferTime = 500;

	function printServerData(target: string) {
		const cash = ns.getServerMoneyAvailable(target);
		const maxCash = ns.getServerMaxMoney(target);
		const percentCash = cash / maxCash;
		const security = ns.getServerSecurityLevel(target);
		const minSecurity = ns.getServerMinSecurityLevel(target);
		const percentSecurity = (security - minSecurity)
		const hackTime = ns.getHackTime(target);
		const growTime = ns.getGrowTime(target);
		const weakenTime = ns.getWeakenTime(target);
		ns.print(`Target Server:	${target}`)
		ns.print('========================================')
		ns.print(`Current Cash:   $${ns.formatNumber(cash, 2)}`)
		ns.print(`Max Cash        $${ns.formatNumber(maxCash, 2)}`)
		ns.print(`% Cash          ${ns.formatPercent(percentCash)}`)
		ns.print(`Security        ${ns.formatNumber(security, 2)}`)
		ns.print(`Min Security    ${ns.formatNumber(minSecurity, 2)}`)
		ns.print(`% Security      ${ns.formatPercent(percentSecurity)}`)
		ns.print(`Hack Time       ${ns.tFormat(hackTime)}`)
		ns.print(`Grow Time       ${ns.tFormat(growTime)}`)
		ns.print(`Weaken Time     ${ns.tFormat(weakenTime)}`)
	}

	let runnableServers: string[];
	function getRunnableServers(): string[] {
		// keep our pids clean.
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
					ns.getScriptRam(basicHack),
				)
			)
				return false;
			// exclude servers you don't have root access to.
			if (!ns.hasRootAccess(s)) return false;
			ns.scp([
				hackScript,
				growScript,
				weakenScript,
				hgwScript,
				basicHack,
			], s)
			return true;
		});

	}

	// This is the main prepping loop.
	async function prepIt(target: string) {
		let phase: Phases = Phases.Growing;
		while (true) {
			ns.tail();
			ns.disableLog('ALL');
			ns.clearLog();
			ns.print(`Script Version: ${version}`)
			// always keep our runnable servers up to date.
			runnableServers = getRunnableServers();
			ns.print(`Free Servers: ${runnableServers.length}`)
			ns.print(`Hackable Servers: ${targets.length}`)
			printServerData(target)
			if (ns.getServerMoneyAvailable(target) < ns.getServerMaxMoney(target))
				phase = Phases.Growing
			else if (ns.getServerSecurityLevel(target) > ns.getServerMinSecurityLevel(target))
				phase = Phases.Weakening
			else
				phase = Phases.Hacking
			ns.print(`Current Phase: ${phase}`)
			for (const host of runnableServers) {
				switch (phase) {
					case Phases.Growing:
						(new Job(ns, JobType.Grow, target)).execute(host)
						break;
					case Phases.Weakening:
						(new Job(ns, JobType.Weaken, target)).execute(host)
						// (new Batch(ns, BatchMode.Prep, target)).execute(runnableServers);
						break;
					case Phases.Hacking:
						// The server is now prepped
						return
				}
			}
			await ns.sleep(bufferTime)
		}
	}
	// This is the main hacking loop.
	async function hackIt(target: string) {
		while (true) {
			await PurchaseServers(ns);
			ns.tail();
			ns.disableLog('ALL');
			ns.clearLog();
			ns.print(`Script Version: ${version}`)
			const income = ns.getScriptIncome(ns.getScriptName(), ns.getHostname(), ...ns.args)
			ns.print(`Script Income: $${ns.formatNumber(income, 2)}`)
			const xp = ns.getScriptExpGain(ns.getScriptName(), ns.getHostname(), ...ns.args);
			ns.print(`Script XP: ${ns.formatNumber(xp, 2)}`)
			// always keep our runnable servers up to date.
			runnableServers = getRunnableServers();
			ns.print(`Free Servers: ${runnableServers.length}`)
			ns.print(`Hackable Servers: ${targets.length}`)
			printServerData(target);
			ns.print(`Current Phase: Hacking`)
			const batch = new Batch(ns, BatchMode.HWGW, target)
			batch.execute(runnableServers)
		}
	}
	// Without formulas, a common de facto algorithm (credit to discord user xsinx) for finding the best server to target is to pare the list down to only servers with a hacking requirement of half your level, then divide their max money by the minimum security level. Pick whichever server scores highest. (For a fully functional batcher, you don't need to do that division, but if you had one of those you wouldn't be reading this.)
	// Find hacking targets
	ns.tprint('Nuking!')
	await Crack(ns)
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
		targets.push('n00dles')
	}
	ns.tprint(`You can hack ${targets.length} servers`)
	ns.tprint(`The best one is ${targets[0]}`)
	ns.tprint(`Hacking ${targets[0]}`)
	await prepIt(targets[0])
	// bufferTime = Math.max(
	// 	ns.getGrowTime(targets[0]),
	// 	ns.getHackTime(targets[0]),
	// 	ns.getWeakenTime(targets[0]),
	// )
	await hackIt(targets[0])
}
