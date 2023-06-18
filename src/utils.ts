/** @format */

import type { Metrics, RamNet } from "controller";
import { NS } from "../NetscriptDefinitions";

export enum Modes {
	Security,
	Money,
	OneShot,
}

// The main placeholder for the utils.
export async function main(ns: NS) {
	ns.tprint("This is just a function library, it doesn't do anything.");
}

// recursive server navigation algorithm.
export function getServers(
	ns: NS,
	lambdaCondition: (hostname: string) => boolean = () => true,
	hostname = "home",
	servers: string[] = [],
	visited: string[] = [],
): string[] {
	if (visited.includes(hostname)) return [];
	visited.push(hostname);
	if (lambdaCondition(hostname)) servers.push(hostname);
	const connectedNodes = ns.scan(hostname);
	if (hostname !== "home") connectedNodes.shift();
	for (const node of connectedNodes)
		getServers(ns, lambdaCondition, node, servers, visited);
	return servers;
}

// finds the best hacking target.
export function checkTarget(
	ns: NS,
	server: string,
	target = "n00dles",
	forms = false,
) {
	if (!ns.hasRootAccess(server)) return target;
	const player = ns.getPlayer();
	const serverSim = ns.getServer(server);
	const pSim = ns.getServer(target);
	let previousScore;
	let currentScore;

	if (
		(serverSim.requiredHackingSkill || 0) <=
		player.skills.hacking / (forms ? 1 : 2)
	) {
		if (forms) {
			serverSim.hackDifficulty = serverSim.minDifficulty;
			pSim.hackDifficulty = pSim.minDifficulty;
			// With formulas we can factor in weaken time and hack chance directly
			// instead of using approximations
			previousScore =
				((pSim.moneyMax || 0) / ns.formulas.hacking.weakenTime(pSim, player)) *
				ns.formulas.hacking.hackChance(pSim, player);
			currentScore =
				((serverSim.moneyMax || 0) /
					ns.formulas.hacking.weakenTime(serverSim, player)) *
				ns.formulas.hacking.hackChance(serverSim, player);
		} else {
			previousScore = (pSim.moneyMax || 0) / (pSim.minDifficulty || 1);
			currentScore = (serverSim.moneyMax || 0) / (serverSim.minDifficulty || 1);
		}
		if (currentScore > previousScore) target = server;
	}
	return target;
}

// A simple function for copying a list of scripts to a server.
export function copyScripts(
	ns: NS,
	server: string,
	scripts: string[],
	overwrite = false,
) {
	for (const script of scripts) {
		if (
			(!ns.fileExists(script, server) || overwrite) &&
			ns.hasRootAccess(server)
		) {
			ns.scp(script, server);
		}
	}
}

// A generic function to check if a server is prepped. Mostly just a
// convenience.
export function isPrepped(ns: NS, server: string): boolean {
	const tolerance = 0.0001;
	const maxMoney = ns.getServerMaxMoney(server);
	const money = ns.getServerMoneyAvailable(server);
	const minSec = ns.getServerMinSecurityLevel(server);
	const sec = ns.getServerSecurityLevel(server);
	const secFix = Math.abs(sec - minSec) < tolerance; // a fix for floating point inaccuracy
	return money === maxMoney && secFix;
}

// A prep function to prep a server.
export async function prep(ns: NS, values: Metrics, ramNet: RamNet) {
	const { maxMoney, minSec, target } = values;
	let { money, sec } = values;
	while (!isPrepped(ns, target)) {
		const wTime = ns.getWeakenTime(target);
		const gTime = wTime * 0.8;
		const dataPort = ns.getPortHandle(ns.pid);
		dataPort.clear();

		const pRam = ramNet.cloneBlocks();
		const maxThreads = Math.floor(ramNet.maxBlockSize / 1.75);
		const totalThreads = ramNet.prepThreads;
		let wThreads1 = 0;
		let wThreads2 = 0;
		let gThreads = 0;
		let batchCount = 1;
		let script: string;
		let mode: Modes;
		/*
		Modes:
		0: Security only
		1: Money only
		2: One shot
		*/

		if (money < maxMoney) {
			gThreads = Math.ceil(ns.growthAnalyze(values.target, maxMoney / money));
			wThreads2 = Math.ceil(ns.growthAnalyzeSecurity(gThreads) / 0.05);
		}
		if (sec > minSec) {
			wThreads1 = Math.ceil((sec - minSec) * 20);
			if (
				!(
					wThreads1 + wThreads2 + gThreads <= totalThreads &&
					gThreads <= maxThreads
				)
			) {
				gThreads = 0;
				wThreads2 = 0;
				batchCount = Math.ceil(wThreads1 / totalThreads);
				if (batchCount > 1) wThreads1 = totalThreads;
				mode = Modes.Security;
			} else mode = Modes.OneShot;
		} else if (gThreads > maxThreads || gThreads + wThreads2 > totalThreads) {
			mode = Modes.Money;
			const oldG = gThreads;
			wThreads2 = Math.max(Math.floor(totalThreads / 13.5), 1);
			gThreads = Math.floor(wThreads2 * 12.5);
			batchCount = Math.ceil(oldG / gThreads);
		} else mode = Modes.OneShot;

		// Big Buffer
		const wEnd1 = Date.now() + wTime + 1000;
		const gEnd = wEnd1 + values.spacer;
		const wEnd2 = gEnd + values.spacer;

		// A mock Job object.
		const metrics = {
			batch: "prep",
			target: values.target,
			type: "none",
			time: 0,
			end: 0,
			port: ns.pid,
			log: values.log,
			report: false,
			server: "",
		};
		// Actually assigning threads. We actually allow grow threads to be spread out in mode 1.
		// This is because we don't mind if the effect is a bit reduced from higher security unlike a normal batcher.
		// We're not trying to grow a specific amount, we're trying to grow as much as possible.
		for (const block of pRam) {
			while (block.ram >= 1.75) {
				const bMax = Math.floor(block.ram / 1.75);
				let threads = 0;
				if (wThreads1 > 0) {
					script = "/part1/tWeaken.js";
					metrics.type = "pWeaken1";
					metrics.time = wTime;
					metrics.end = wEnd1;
					threads = Math.min(wThreads1, bMax);
					if (wThreads2 === 0 && wThreads1 - threads <= 0)
						metrics.report = true;
					wThreads1 -= threads;
				} else if (wThreads2 > 0) {
					script = "/part1/tWeaken.js";
					metrics.type = "pWeaken2";
					metrics.time = wTime;
					metrics.end = wEnd2;
					threads = Math.min(wThreads2, bMax);
					if (wThreads2 - threads === 0) metrics.report = true;
					wThreads2 -= threads;
				} else if (gThreads > 0 && mode === 1) {
					script = "/part1/tGrow.js";
					metrics.type = "pGrow";
					metrics.time = gTime;
					metrics.end = gEnd;
					threads = Math.min(gThreads, bMax);
					metrics.report = false;
					gThreads -= threads;
				} else if (gThreads > 0 && bMax >= gThreads) {
					script = "/part1/tGrow.js";
					metrics.type = "pGrow";
					metrics.time = gTime;
					metrics.end = gEnd;
					threads = gThreads;
					metrics.report = false;
					gThreads = 0;
				} else break;
				metrics.server = block.server;
				const pid = ns.exec(
					script,
					block.server,
					threads,
					JSON.stringify(metrics),
				);
				if (!pid) throw new Error("Unable to assign all jobs.");
				block.ram -= 1.75 * threads;
			}
		}

		// Fancy UI stuff to update you on progress.
		const tEnd =
			((mode === 0 ? wEnd1 : wEnd2) - Date.now()) * batchCount + Date.now();
		const timer = setInterval(() => {
			ns.clearLog();
			switch (mode) {
				case 0:
					ns.print(`Weakening security on ${values.target}...`);
					break;
				case 1:
					ns.print(`Maximizing money on ${values.target}...`);
					break;
				case 2:
					ns.print(`Finalizing preparation on ${values.target}...`);
			}
			ns.print(`Security: +${ns.formatNumber(sec - minSec, 3)}`);
			ns.print(
				`Money: $${ns.formatNumber(money, 2)}/${ns.formatNumber(maxMoney, 2)}`,
			);
			const time = tEnd - Date.now();
			ns.print(`Estimated time remaining: ${ns.tFormat(time)}`);
			ns.print(`~${batchCount} ${batchCount === 1 ? "batch" : "batches"}.`);
		}, 200);
		ns.atExit(() => clearInterval(timer));

		// Wait for the last weaken to finish.
		do await dataPort.nextWrite();
		while (!(dataPort.read() as string).startsWith("pWeaken"));
		clearInterval(timer);
		await ns.sleep(100);

		money = ns.getServerMoneyAvailable(values.target);
		sec = ns.getServerSecurityLevel(values.target);
	}
	return true;
}
