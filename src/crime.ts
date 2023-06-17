/** @format */

import { CrimeType, NS } from "../NetscriptDefinitions";
const crimeTypes: CrimeType[] = [
	CrimeType.assassination,
	CrimeType.bondForgery,
	CrimeType.dealDrugs,
	CrimeType.grandTheftAuto,
	CrimeType.heist,
	CrimeType.homicide,
	CrimeType.kidnap,
	CrimeType.larceny,
	CrimeType.mug,
	CrimeType.robStore,
	CrimeType.shoplift,
	CrimeType.traffickArms,
];

/** @param {NS} ns */
export async function main(ns: NS) {
	ns.tail();
	ns.clearLog();
	ns.disableLog("ALL");
	const crimeData = crimeTypes.map(crime => ({
		name: crime,
		stats: ns.singularity.getCrimeStats(crime),
		getChance: () => ns.singularity.getCrimeChance(crime),
		getValue() {
			// calculate the crime value.
			const cashPerSecond =
				(this.stats.money / this.stats.time) * this.getChance();

			return cashPerSecond;
		},
	}));
	let bestCrime = crimeData[0];

	while (true) {
		for (const crime of crimeData) {
			if (!bestCrime) bestCrime = crime;
			if (bestCrime.getValue() < crime.getValue()) bestCrime = crime;
		}
		ns.tail();
		ns.clearLog();
		ns.print(`Best crime is ${bestCrime.name}`);
		ns.print(`====================================`);
		ns.print(`\t EXPERIENCE GAIN`);
		ns.print(`====================================`);
		ns.print(
			`\t agility     : \t${ns.formatNumber(bestCrime.stats.agility_exp)}`,
		);
		ns.print(
			`\t strength    : \t${ns.formatNumber(bestCrime.stats.strength_exp)}`,
		);
		ns.print(
			`\t charisma    : \t${ns.formatNumber(bestCrime.stats.charisma_exp)}`,
		);
		ns.print(
			`\t defense     : \t${ns.formatNumber(bestCrime.stats.defense_exp)}`,
		);
		ns.print(
			`\t dexterity   : \t${ns.formatNumber(bestCrime.stats.dexterity_exp)}`,
		);
		ns.print(
			`\t hacking     : \t${ns.formatNumber(bestCrime.stats.hacking_exp)}`,
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
		if (!ns.singularity.isBusy())
			ns.singularity.commitCrime(bestCrime.name, false);
		await ns.sleep(500);
	}
}
