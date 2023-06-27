/** @format */

import { NS } from '../NetscriptDefinitions';

// These are the tasks that are assigned at appropriate times
const combatTrainingTask = 'Train Combat';
const hackTrainingTask = 'Train Hacking';
const charismaTrainingTask = 'Train Charisma';
let cashTask = 'Strongarm Civilians';
const territoryTask = 'Territory Warfare';
// const wantedTask = 'Vigilante Justice';
const wantedTask = 'Ethical Hacking';
// let respectTask = 'Mug People';
let respectTask = 'Cyberterrorism';
const RESPECT_THRESHOLD = 3e6;
const AVG_COMBAT_THRESHOLD = 1000;
const HACKING_THRESHOLD = 1000;
const CHARISMA_THRESHOLD = 1000;
const WIN_CHANCE_THRESHOLD = 0.5;
// Ascending is interesting 1.0 means ascend as soon as you can - 2.0 means
// ascend when it will give you double your bonus. Generally 1.5 seems to be the
// best.
const ASCEND_THRESHOLD = 2;
const MINUTES_BETWEEN_ASCENSIONS = 5;

// These are all the gangs in the game.
const OTHER_GANGS = [
  'Tetrads',
  'The Syndicate',
  'The Dark Army',
  'Speakers for the Dead',
  'NiteSec',
  'The Black Hand',
  'Slum Snakes',
];
let success = false;
let gms: string[] = [];

export async function main(ns: NS) {
  let lastAscension = 0;

  function heroSkills(gm: string) {
    const info = ns.gang.getMemberInformation(gm);
    // These are the skills for ethical hacking
    // Vigilante justice probably uses different ones.
    return info.hack + info.cha;
  }

  function getThresholds(): string[] {
    return [
      `Respect threshold:     ${ns.formatNumber(RESPECT_THRESHOLD, 2)}`,
      `Avg Combat threshold:  ${ns.formatNumber(AVG_COMBAT_THRESHOLD, 2)}`,
      `Hacking threshold:     ${ns.formatNumber(HACKING_THRESHOLD, 2)}`,
      `Charisma threshold:    ${ns.formatNumber(CHARISMA_THRESHOLD, 2)}`,
      `Win Chance threshold:  ${ns.formatNumber(WIN_CHANCE_THRESHOLD, 2)}`,
      `Ascend threshold:      ${ns.formatNumber(ASCEND_THRESHOLD, 2)}`,
    ];
  }

  function ascensionResult(gm: string) {
    const result = ns.gang.getAscensionResult(gm);
    if (!result) return 0;
    return (
      (result.hack +
        result.str +
        result.def +
        result.dex +
        result.agi +
        result.cha +
        result.respect) /
      7
    );
  }
  if (ns.args[0] === 'help') {
    const allTasks = ns.gang.getTaskNames();
    ns.tprint(`Valid task names:`);
    for (const task of allTasks) {
      ns.tprint(`\t ${task}`);
    }
  }

  function stats() {
    for (const s of getThresholds()) {
      ns.print(s);
    }
    const timeSinceLastAscension = lastAscension
      ? Date.now() - lastAscension
      : lastAscension;
    if (timeSinceLastAscension) {
      ns.print(
        `Time since last ascension: \t ${ns.tFormat(timeSinceLastAscension)}`,
      );
    } else {
      ns.print(`Time since last ascension: \t You have not yet ascended.`);
    }
    for (const gm of gms) {
      const info = ns.gang.getMemberInformation(gm);
      ns.print(`${gm}:      \t ${info.task}`);
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

  // This ascends and equips your gang members
  function ascend() {
    // ascend recursively
    const augsOnly = ns.gang.getGangInformation().respect < RESPECT_THRESHOLD;
    let bestAscender = gms[0];
    for (const gm of gms) {
      // const augsOnly = (ns.gang.getEquipmentNames().filter(eq =>
      // ns.gang.getEquipmentType(eq).startsWith('Aug') &&
      // !ns.gang.getMemberInformation(gm).augmentations.includes(eq)))
      for (const eq of ns.gang
        .getEquipmentNames()
        .filter(
          (eq) => !ns.gang.getMemberInformation(gm).augmentations.includes(eq),
        )) {
        // Prioritize augmentations.
        const type = ns.gang.getEquipmentType(eq);
        // ns.print(`Purchasing ${type}: ${eq}`);
        if ((augsOnly && type.startsWith('Aug')) || !augsOnly) {
          ns.gang.purchaseEquipment(gm, eq);
        }
      }
      if (ascensionResult(gm) > ascensionResult(bestAscender))
        bestAscender = gm;
    }
    if (Date.now() - lastAscension < MINUTES_BETWEEN_ASCENSIONS * 60000) return;
    success = !!ns.gang.ascendMember(bestAscender);
    lastAscension = Date.now();
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
    // find the hero
    let hero = gms[0];
    for (const gm of gms) {
      if (heroSkills(gm) > heroSkills(hero)) {
        hero = gm;
      }
    }
    gms.forEach((gm) => {
      if (gm === hero)
        success = ns.gang.setMemberTask(gm, trainAsNeeded(gm, wantedTask));
      else success = ns.gang.setMemberTask(gm, trainAsNeeded(gm, task));
    });
  }

  function splitCash(task = respectTask) {
    let hero = gms[0];
    for (const gm of gms) {
      if (heroSkills(gm) > heroSkills(hero)) {
        hero = gm;
      }
    }
    gms.forEach((gm, i) => {
      if (gm === hero)
        success = ns.gang.setMemberTask(gm, trainAsNeeded(gm, wantedTask));
      else if (i < gms.length / 2)
        success = ns.gang.setMemberTask(gm, trainAsNeeded(gm, cashTask));
      else success = ns.gang.setMemberTask(gm, trainAsNeeded(gm, task));
    });
  }

  // Initialize gms
  gms = ns.gang.getMemberNames();
  let task = ns.args.join(' ').trim();

  while (true) {
    findTasks();
    // Check if we can recruit a new member.
    while (ns.gang.canRecruitMember()) {
      const gm = `gm${Date.now()}`;
      if (ns.gang.recruitMember(gm)) gms.push(gm);
    }
    ns.tail();
    ns.clearLog();
    ns.disableLog('ALL');
    const warChance = winChance();
    const wantedLevel = ns.gang.getGangInformation().wantedLevel;
    ascend();
    if (!task) {
      if (wantedLevel > 2) {
        ns.print(`Lowest winChance = ${ns.formatPercent(warChance)}`);
        ns.print(`Wanted level = ${wantedLevel}`);
        ns.print('Fighting Crime');
        fightCrime();
      } else if (ns.gang.getGangInformation().respect < RESPECT_THRESHOLD) {
        ns.print(`Lowest winChance = ${ns.formatPercent(warChance)}`);
        ns.print(`Wanted level = ${wantedLevel}`);
        ns.print('Need a little RESPECT!');
        splitCash(respectTask);
      } else if (warChance < WIN_CHANCE_THRESHOLD) {
        ns.print(`Lowest winChance = ${ns.formatPercent(warChance)}`);
        ns.print('Preparing for war!');
        ns.gang.setTerritoryWarfare(false);
        splitCash(territoryTask);
      } else {
        ns.print(`Lowest winChance = ${ns.formatPercent(warChance)}`);
        ns.print(`Wanted level = ${wantedLevel}`);
        ns.print('Splitting Justice!');
        ns.gang.setTerritoryWarfare(true);
        splitJustice();
      }
    } else {
      if (task.toLowerCase().startsWith('cash')) task = cashTask;
      if (task.toLowerCase().startsWith('resp')) task = respectTask;
      if (task.toLowerCase().startsWith('ter')) task = territoryTask;
      // Start custom task
      ns.print(`running custom task ${task}`);
      if (wantedLevel > 2) {
        ns.print(`Lowest winChance = ${ns.formatPercent(warChance)}`);
        ns.print(`Wanted level = ${wantedLevel}`);
        ns.print('Fighting Crime');
        fightCrime();
      } else if (ns.gang.getGangInformation().respect < RESPECT_THRESHOLD) {
        ns.print(`Lowest winChance = ${ns.formatPercent(warChance)}`);
        ns.print(`Wanted level = ${wantedLevel}`);
        ns.print('Need a little RESPECT!');
        splitJustice(respectTask);
      } else if (warChance < 0.99) {
        ns.print(`Lowest winChance = ${ns.formatPercent(warChance)}`);
        ns.print('Preparing for war!');
        ns.gang.setTerritoryWarfare(false);
        splitJustice(territoryTask);
      } else {
        ns.print(`Lowest winChance = ${ns.formatPercent(warChance)}`);
        ns.print(`Wanted level = ${wantedLevel}`);
        ns.print('Splitting Justice!');
        ns.gang.setTerritoryWarfare(true);
        splitJustice(task);
      }
    }
    ns.print(success ? 'SUCCESS!' : 'FAILED!');
    stats();
    await ns.sleep(500);
  }
}
