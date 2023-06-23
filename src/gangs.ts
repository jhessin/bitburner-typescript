/** @format */

import { NS } from "../NetscriptDefinitions";

// These are the tasks that are assigned at appropriate times
const combatTrainingTask = "Train Combat";
const hackTrainingTask = "Train Hacking";
const charismaTrainingTask = "Train Charisma";
let cashTask = "Strongarm Civilians";
const territoryTask = "Territory Warfare";
const wantedTask = "Vigilante Justice";
let respectTask = "Mug People";
const RESPECT_THRESHOLD = 3e6;
const AVG_COMBAT_THRESHOLD = 200;
const HACKING_THRESHOLD = 200;
const CHARISMA_THRESHOLD = 200;
const WIN_CHANCE_THRESHOLD = .5;

// These are all the gangs in the game.
const OTHER_GANGS = [
	"Tetrads",
	"The Syndicate",
	"The Dark Army",
	"Speakers for the Dead",
	"NiteSec",
	"The Black Hand",
	"Slum Snakes",
];
let success = false;
let gms: string[] = [];

export async function main(ns: NS) {
	if (ns.args[0] === 'help') {
		const allTasks = ns.gang.getTaskNames();
		ns.tprint(`Valid task names:`);
		for (const task of allTasks) {
			ns.tprint(`\t ${task}`);
		}
	}

	function stats() {
		for (const gm of gms) {
			ns.print(`${gm}: \t ${ns.gang.getMemberInformation(gm).task}`)
		}
	}

	function trainAsNeeded(member: string, fb: string): string {
		const stats = ns.gang.getMemberInformation(member);
		if (avgCombat(member) < AVG_COMBAT_THRESHOLD) return combatTrainingTask;
		if (stats.hack < HACKING_THRESHOLD) return hackTrainingTask;
		if (stats.cha < CHARISMA_THRESHOLD) return charismaTrainingTask;
		return fb;
	}

	function findTasks() {
		const allTasks = ns.gang.getTaskNames();
		let bestTask = allTasks[0];
		for (const task of allTasks) {
			const bestStats = ns.gang.getTaskStats(bestTask);
			const stats = ns.gang.getTaskStats(task);
			if (bestStats.baseMoney < stats.baseMoney) bestTask = task;
		}
		cashTask = bestTask;
		for (const task of allTasks) {
			const bestStats = ns.gang.getTaskStats(bestTask);
			const stats = ns.gang.getTaskStats(task);
			if (bestStats.baseRespect < stats.baseRespect) bestTask = task;
		}
		respectTask = bestTask;
		for (const task of allTasks) {
			const bestStats = ns.gang.getTaskStats(bestTask);
			const stats = ns.gang.getTaskStats(task);
			if (bestStats.baseRespect < stats.baseRespect) bestTask = task;
		}
	}

	function avgCombat(member: string) {
		const stats = ns.gang.getMemberInformation(member);
		return (stats.str + stats.def + stats.agi + stats.dex) / 4;
	}

	function ascend() {
		// ascend recursively
		for (const gm of gms) {
			const result = ns.gang.getAscensionResult(gm);
			if (!result) continue;
			if (result.str > 1.5) success = !!ns.gang.ascendMember(gm);
			const augsOnly = (ns.gang.getEquipmentNames().filter(eq => ns.gang.getEquipmentType(eq).startsWith('Aug') && !ns.gang.getMemberInformation(gm).augmentations.includes(eq)))
			for (const eq of ns.gang.getEquipmentNames().filter(eq => !ns.gang.getMemberInformation(gm).augmentations.includes(eq))) {
				// Prioritize augmentations.
				const type = ns.gang.getEquipmentType(eq);
				// ns.print(`Purchasing ${type}: ${eq}`)
				if ((augsOnly.length && type.startsWith("Aug")) || !augsOnly.length) {
					ns.gang.purchaseEquipment(gm, eq);
				}
			}
		}
	}

	function winChance() {
		let worseChance = 100;
		for (const g of OTHER_GANGS) {
			if (g === ns.gang.getGangInformation().faction) continue;
			const chance = ns.gang.getChanceToWinClash(g);
			if (worseChance > chance) worseChance = chance;
		}
		return worseChance;
	}

	function fightCrime() {
		// loop through for training
		for (const gm of gms) {
			success = ns.gang.setMemberTask(gm, trainAsNeeded(gm, wantedTask));
		}
	}

	function splitJustice(task = cashTask) {
		gms.forEach((gm, i) => {
			if (i < 1) success = ns.gang.setMemberTask(gm, wantedTask);
			else success = ns.gang.setMemberTask(gm, trainAsNeeded(gm, task));
		});
	}

	function splitCash(task = respectTask) {
		gms.forEach((gm, i) => {
			if (i < 1 && ns.gang.getGangInformation().wantedLevel > 1) success = ns.gang.setMemberTask(gm, wantedTask)
			else if (i < gms.length / 2) success = ns.gang.setMemberTask(gm, cashTask);
			else success = ns.gang.setMemberTask(gm, trainAsNeeded(gm, task));
		});
	}


	// Initialize gms
	gms = ns.gang.getMemberNames();
	let task = ns.args.join(" ") || "ls";

	while (true) {
		findTasks();
		// Check if we can recruit a new member.
		while (ns.gang.canRecruitMember()) {
			const gm = `gm${Date.now()}`;
			if (ns.gang.recruitMember(gm)) gms.push(gm);
		}
		if (task.toLowerCase().startsWith("cash")) task = cashTask;
		ns.tail();
		ns.clearLog();
		stats();
		ns.disableLog("ALL");
		const warChance = winChance();
		const wantedLevel = ns.gang.getGangInformation().wantedLevel;
		if (task.startsWith("ls")) {
			if (wantedLevel > 2) {
				ns.print(`Lowest winChance = ${ns.formatPercent(warChance)}`);
				ns.print(`Wanted level = ${wantedLevel}`);
				ns.print("Fighting Crime");
				fightCrime();
			} else if (ns.gang.getGangInformation().respect < RESPECT_THRESHOLD) {
				ns.print(`Lowest winChance = ${ns.formatPercent(warChance)}`);
				ns.print(`Wanted level = ${wantedLevel}`);
				ns.print("Need a little RESPECT!");
				splitCash(respectTask);
			} else if (warChance < WIN_CHANCE_THRESHOLD) {
				ns.print(`Lowest winChance = ${ns.formatPercent(warChance)}`);
				ns.print("Preparing for war!");
				ns.gang.setTerritoryWarfare(false);
				splitCash(territoryTask);
			} else {
				ns.print(`Lowest winChance = ${ns.formatPercent(warChance)}`);
				ns.print(`Wanted level = ${wantedLevel}`);
				ns.print("Splitting Justice!");
				ns.gang.setTerritoryWarfare(true);
				splitJustice();
			}
		} else {
			// Start custom task
			ns.print(`running custom task ${task}`);
			if (wantedLevel > 2) {
				ns.print(`Lowest winChance = ${ns.formatPercent(warChance)}`);
				ns.print(`Wanted level = ${wantedLevel}`);
				ns.print("Fighting Crime");
				fightCrime();
			} else if (ns.gang.getGangInformation().respect < RESPECT_THRESHOLD) {
				ns.print(`Lowest winChance = ${ns.formatPercent(warChance)}`);
				ns.print(`Wanted level = ${wantedLevel}`);
				ns.print("Need a little RESPECT!");
				splitJustice(respectTask);
			} else if (warChance < 0.99) {
				ns.print(`Lowest winChance = ${ns.formatPercent(warChance)}`);
				ns.print("Preparing for war!");
				ns.gang.setTerritoryWarfare(false);
				splitJustice(territoryTask);
			} else {
				ns.print(`Lowest winChance = ${ns.formatPercent(warChance)}`);
				ns.print(`Wanted level = ${wantedLevel}`);
				ns.print("Splitting Justice!");
				ns.gang.setTerritoryWarfare(true);
				splitJustice(task);
			}
		}
		ascend();
		ns.print(success ? "SUCCESS!" : "FAILED!");
		await ns.sleep(500);
	}
}
