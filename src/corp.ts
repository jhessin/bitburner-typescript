import type { CorpIndustryName, NS } from '@ns';

const CORPORATION_NAME = 'Corpie';

export async function main(ns: NS) {
  const DIVISIONS: [CorpIndustryName, string][] = [
    [ns.corporation.getConstants().industryNames[0], 'Aggies'],
  ];

  function expandIndustry() {
    const industry = DIVISIONS.pop();
    if (industry) ns.corporation.expandIndustry(industry[0], industry[1]);
  }

  while (true) {
    await ns.sleep(500);

    // Form a corporation if needed.
    if (!ns.corporation.hasCorporation()) {
      ns.corporation.createCorporation(CORPORATION_NAME, true);
    }

    // buy the first division if we need to.
    if (ns.corporation.getCorporation().divisions.length < 1) {
      expandIndustry();
    }

    const corp = ns.corporation.getCorporation();
    let funds = corp.funds;

    // Prioritize unlocks
    for (const unlock of ns.corporation.getConstants().unlockNames) {
      const cost = ns.corporation.getUnlockCost(unlock);
      if (funds >= cost) {
        ns.corporation.purchaseUnlock(unlock);
        funds -= cost;
      }
    }

    // then loop through the different upgrades.
    for (const upgrade of ns.corporation.getConstants().upgradeNames) {
      const cost = ns.corporation.getUpgradeLevelCost(upgrade);
      if (funds >= cost) {
        ns.corporation.levelUpgrade(upgrade);
        funds -= cost;
      }
    }

    // loop through divisions
    for (const divName of ns.corporation.getCorporation().divisions) {
      const div = ns.corporation.getDivision(divName);

      // start with advertising.
      // advertize if we can.
      if (funds >= ns.corporation.getHireAdVertCost(divName)) {
        funds -= ns.corporation.getHireAdVertCost(divName);
        ns.corporation.hireAdVert(divName);
      }

      // loop through cities
      for (const city of div.cities) {
        const cost = ns.corporation.getOfficeSizeUpgradeCost(divName, city, 3);
        if (funds >= cost) {
          ns.corporation.upgradeOfficeSize(divName, city, 3);
          funds -= cost;
        }
      }
    }
  }
}
