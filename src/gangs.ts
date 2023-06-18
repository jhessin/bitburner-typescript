/** @format */

import { NS } from "../NetscriptDefinitions";

// These are the tasks that are assigned at appropriate times
const trainingTask = "Train Combat";
const cashTask = "Strongarm Civilians";
const territoryTask = "Territory Warfare";
const wantedTask = "Vigilante Justice";

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

/** @param {NS} ns */
export async function main(ns: NS) {
	// Initialize gms
	gms = ns.gang.getMemberNames();
	// Check if we can recruit a new member.
	while (ns.gang.canRecruitMember()) {
		const gm = `gm${gms.length}`;
		gms.push(gm);
		ns.gang.recruitMember(gm);
	}
	const task = ns.args.join(" ") || "ls";

	// default to list all tasks
	if (task.startsWith("ls")) {
		while (true) {
			ns.tail();
			ns.clearLog();
			ns.disableLog("ALL");
			const allTasks = ns.gang.getTaskNames();
			ns.print(`Valid task names:`);
			for (const task of allTasks) {
				ns.print(`\t ${task}`);
			}
			const warChance = winChance(ns);
			const wantedLevel = ns.gang.getGangInformation().wantedLevel;
			if (warChance < 0.99) {
				ns.print(`Lowest winChance = ${ns.formatPercent(warChance)}`);
				ns.print("Preparing for war!");
				ns.gang.setTerritoryWarfare(false);
				await war(ns);
			} else if (wantedLevel > 2) {
				ns.print(`Lowest winChance = ${ns.formatPercent(warChance)}`);
				ns.print(`Wanted level = ${wantedLevel}`);
				ns.print("Fighting Crime");
				await fightCrime(ns);
			} else if (wantedLevel > 1) {
				ns.print(`Lowest winChance = ${ns.formatPercent(warChance)}`);
				ns.print(`Wanted level = ${wantedLevel}`);
				ns.print("Splitting Justice!");
				ns.gang.setTerritoryWarfare(true);
				await splitJustice(ns);
			} else {
				ns.print(`Lowest winChance = ${ns.formatPercent(warChance)}`);
				ns.print(`Wanted level = ${wantedLevel}`);
				ns.print("Cashing out!");
				ns.gang.setTerritoryWarfare(true);
				await cashOut(ns);
			}
			await ascend(ns);
			ns.print(success ? "SUCCESS!" : "FAILED!");
			await ns.sleep(500);
		}
	} else {
		// Start custom task
		ns.print(task);
		await custom(ns, task);
		ns.print(success ? "SUCCESS!" : "FAILED!");
	}
}

/** @param {NS} ns
 *  @param {string} task
 */
export async function custom(ns: NS, task: string) {
	// loop through for training
	for (const gm of gms) {
		success = ns.gang.setMemberTask(gm, task);
	}
}

/** @param {NS} ns */
export async function train(ns: NS) {
	// loop through for training
	for (const gm of gms) {
		success = ns.gang.setMemberTask(gm, trainingTask);
	}
}

/** @param {NS} ns */
export async function war(ns: NS) {
	// loop through for training
	for (const gm of gms) {
		success = ns.gang.setMemberTask(gm, territoryTask);
	}
}

/** @param {NS} ns */
export async function cashOut(ns: NS) {
	// loop through for training
	for (const gm of gms) {
		success = ns.gang.setMemberTask(gm, cashTask);
	}
}

/** @param {NS} ns */
export async function ascend(ns: NS) {
	// ascend recursively
	for (const gm of gms) {
		const result = ns.gang.getAscensionResult(gm);
		if (!result) continue;
		if (result.str > 1.5) success = !!ns.gang.ascendMember(gm);
		for (const eq of ns.gang.getEquipmentNames()) {
			ns.gang.purchaseEquipment(gm, eq);
		}
	}
}

/** @param {NS} ns */
function winChance(ns: NS) {
	let worseChance = 100;
	for (const g of OTHER_GANGS) {
		if (g === ns.gang.getGangInformation().faction) continue;
		const chance = ns.gang.getChanceToWinClash(g);
		if (worseChance > chance) worseChance = chance;
	}
	return worseChance;
}

/** @param {NS} ns */
async function fightCrime(ns: NS) {
	// loop through for training
	for (const gm of gms) {
		success = ns.gang.setMemberTask(gm, wantedTask);
	}
}

/** @param {NS} ns */
async function splitJustice(ns: NS) {
	// loop through for training
	gms.forEach((gm, i) => {
		if (i < 1) success = ns.gang.setMemberTask(gm, wantedTask);
		else success = ns.gang.setMemberTask(gm, cashTask);
	});
}
