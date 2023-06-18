/** @format */

import { NS } from "../NetscriptDefinitions";

enum Stats {
	money = "money",
	hack = "hack",
	str = "str",
	def = "def",
	dex = "dex",
	agi = "agi",
	cha = "cha",
	int = "int",
	karma = "karma",
	kills = "kills",
}

// const STATS: Stats[] = [
// 	Stats.money,
// 	Stats.hack,
// 	Stats.str,
// 	Stats.def,
// 	Stats.dex,
// 	Stats.agi,
// 	Stats.cha,
// 	Stats.int,
// 	Stats.karma,
// 	Stats.kills,
// ];

function statData(ns: NS, stat: Stats): string {
	switch (stat) {
		case Stats.kills:
			return `Current Player kills = ${ns.getPlayer().numPeopleKilled}`;

		default:
			return "";
	}
}

// TODO: Make this multifunction for different stats.
/** @param {NS} ns */
export async function main(ns: NS) {
	// get the crimetypes from the ns.enums
	const crimeTypes = [
		ns.enums.CrimeType.assassination,
		ns.enums.CrimeType.bondForgery,
		ns.enums.CrimeType.dealDrugs,
		ns.enums.CrimeType.grandTheftAuto,
		ns.enums.CrimeType.heist,
		ns.enums.CrimeType.homicide,
		ns.enums.CrimeType.kidnap,
		ns.enums.CrimeType.larceny,
		ns.enums.CrimeType.mug,
		ns.enums.CrimeType.robStore,
		ns.enums.CrimeType.shoplift,
		ns.enums.CrimeType.traffickArms,
	];
	ns.tail();
	ns.disableLog("ALL");
	const args = ns.args[0].toString().toLowerCase() as Stats;
	const crimeData = crimeTypes.map(crime => ({
		name: crime,
		stats: ns.singularity.getCrimeStats(crime),
		getChance: () => ns.singularity.getCrimeChance(crime),
		getValue() {
			// calculate the crime value.
			let statToWatch = this.stats.money;
			switch (args) {
				case Stats.hack:
					statToWatch = this.stats.hacking_exp;
					break;
				case Stats.str:
					statToWatch = this.stats.strength_exp;
					break;
				case Stats.def:
					statToWatch = this.stats.defense_exp;
					break;
				case Stats.dex:
					statToWatch = this.stats.dexterity_exp;
					break;
				case Stats.agi:
					statToWatch = this.stats.agility_exp;
					break;
				case Stats.cha:
					statToWatch = this.stats.charisma_exp;
					break;
				case Stats.int:
					statToWatch = this.stats.intelligence_exp;
					break;
				default:
					statToWatch = this.stats.money;
					break;
			}

			return (statToWatch / this.stats.time) * this.getChance();
		},
	}));
	let bestCrime = crimeData[0];
	let oldBest = bestCrime;
	while (true) {
		for (const crime of crimeData) {
			if (!bestCrime) bestCrime = crime;
			if (bestCrime.getValue() < crime.getValue()) bestCrime = crime;
		}
		if (bestCrime.name !== oldBest.name) {
			ns.singularity.stopAction();
			oldBest = bestCrime;
		}
		ns.tail();
		ns.clearLog();
		ns.print(`Optimizing for ${args}`);
		ns.print(statData(ns, args));
		ns.print(`Best crime is ${bestCrime.name}`);
		ns.print(`====================================`);
		ns.print(`\t EXPERIENCE GAIN`);
		ns.print(`====================================`);
		ns.print(
			`\t hacking     : \t${ns.formatNumber(bestCrime.stats.hacking_exp)}`,
		);
		ns.print(
			`\t strength    : \t${ns.formatNumber(bestCrime.stats.strength_exp)}`,
		);
		ns.print(
			`\t defense     : \t${ns.formatNumber(bestCrime.stats.defense_exp)}`,
		);
		ns.print(
			`\t dexterity   : \t${ns.formatNumber(bestCrime.stats.dexterity_exp)}`,
		);
		ns.print(
			`\t agility     : \t${ns.formatNumber(bestCrime.stats.agility_exp)}`,
		);
		ns.print(
			`\t charisma    : \t${ns.formatNumber(bestCrime.stats.charisma_exp)}`,
		);
		ns.print(
			`\t intelligence: \t${ns.formatNumber(bestCrime.stats.intelligence_exp)}`,
		);
		ns.print(`====================================`);
		ns.print(`\t OTHER STATS`);
		ns.print(`====================================`);
		ns.print(`\t chance: \t${ns.formatPercent(bestCrime.getChance())}`);
		ns.print(`\t karma: \t${bestCrime.stats.karma}`);
		ns.print(`\t kills: \t${bestCrime.stats.kills}`);
		ns.print(`\t money: \t$${ns.formatNumber(bestCrime.stats.money)}`);
		ns.print(`\t time : \t${ns.tFormat(bestCrime.stats.time)}`);
		// only commit crimes if we aren't busy.
		if (!ns.singularity.isBusy())
			ns.singularity.commitCrime(bestCrime.name, false);
		await ns.sleep(500);
	}
}
