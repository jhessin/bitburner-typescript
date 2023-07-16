import type { CorpIndustryName, CorpResearchName, Division, NS } from '@ns';

type PurchaseAsset = () => void;

const CORPORATION_NAME = 'Corpie';
const DIVISIONS: [CorpIndustryName, string][] = [
  ['Agriculture', 'Aggies'],
  ['Spring Water', 'SmartWater'],
];
const REASEARCHES: CorpResearchName[] = [
  'Hi-Tech R&D Laboratory',
  'Market-TA.I',
  'Market-TA.II',
  'AutoBrew',
  'AutoPartyManager',
  'HRBuddy-Recruitment',
  'HRBuddy-Training',
];

export async function main(ns: NS) {
  ns.disableLog('ALL');
  let corp = ns.corporation.getCorporation();
  let funds = corp.funds;
  let purchases: [string, number, PurchaseAsset][] = [];

  function setSmartSupply(industry: [CorpIndustryName, string]) {
    if (!ns.corporation.hasUnlock('Smart Supply')) return;
    const data = ns.corporation.getDivision(industry[1]);
    const info = ns.corporation.getIndustryData(industry[0]);
    for (const city of data.cities) {
      ns.corporation.setSmartSupply(data.name, city, true);
      for (const material of Object.keys(info.requiredMaterials)) {
        ns.corporation.setSmartSupplyOption(
          data.name,
          city,
          material,
          'leftovers',
        );
      }
    }
  }

  function expandIndustry() {
    // if (ns.corporation.getCorporation().divisions.length < DIVISIONS.length) {
    const industry =
      DIVISIONS[ns.corporation.getCorporation().divisions.length];
    const info = ns.corporation.getIndustryData(industry[0]);
    const cost = info.startingCost;
    purchases.push([
      `expand into ${industry[0]}`,
      cost,
      () => {
        if (industry && funds >= cost) {
          ns.corporation.expandIndustry(industry[0], industry[1]);
          funds -= cost;
        }
      },
    ]);

    // configure smart supply
  }

  function assignWorkers(div: Division) {
    for (const city of div.cities) {
      // assign 1 slot to each non-research job.
      ns.corporation.setAutoJobAssignment(div.name, city, 'Operations', 1);
      ns.corporation.setAutoJobAssignment(div.name, city, 'Engineer', 1);
      ns.corporation.setAutoJobAssignment(div.name, city, 'Business', 1);
      ns.corporation.setAutoJobAssignment(div.name, city, 'Management', 1);
      ns.corporation.setAutoJobAssignment(div.name, city, 'Intern', 1);

      // complete research as needed
      let researchDone = false;
      let currentPoints = div.researchPoints;
      for (const research of REASEARCHES) {
        if (ns.corporation.hasResearched(div.name, research)) continue;
        const cost = ns.corporation.getResearchCost(div.name, research);
        ns.print(
          `Current Research Points @ ${div.name}: ${ns.formatNumber(
            currentPoints,
          )}`,
        );
        ns.print(`Cost to research ${research}: ${ns.formatNumber(cost)}`);
        if (currentPoints >= cost) {
          ns.corporation.research(div.name, research);
          currentPoints -= cost;
        } else {
          break;
        }
        researchDone = true;
      }
      // if there is still research to complete assign the rest of the workers
      // to research.
      // otherwise we will stick them into interns
      const employees = ns.corporation.getOffice(div.name, city).numEmployees;
      if (researchDone) {
        ns.corporation.setAutoJobAssignment(
          div.name,
          city,
          'Intern',
          employees - 4,
        );
      } else {
        ns.corporation.setAutoJobAssignment(
          div.name,
          city,
          'Research & Development',
          employees - 5,
        );
      }
    }
  }

  while (true) {
    await ns.sleep(500);
    ns.clearLog();
    ns.tail();
    purchases = [];

    // Form a corporation if needed.
    if (!ns.corporation.hasCorporation()) {
      ns.corporation.createCorporation(CORPORATION_NAME, true);
    }

    // buy the first division if we need to.
    if (ns.corporation.getCorporation().divisions.length < DIVISIONS.length) {
      expandIndustry();
    }

    corp = ns.corporation.getCorporation();
    funds = corp.funds;

    // Prioritize unlocks
    for (const unlock of ns.corporation
      .getConstants()
      .unlockNames.filter((unlock) => !ns.corporation.hasUnlock(unlock))) {
      const cost = ns.corporation.getUnlockCost(unlock);
      purchases.push([
        `purchase unlock ${unlock}`,
        cost,
        () => {
          if (funds >= cost) {
            ns.corporation.purchaseUnlock(unlock);
            funds -= cost;
          }
        },
      ]);
    }

    // then loop through the different upgrades.
    for (const upgrade of ns.corporation.getConstants().upgradeNames) {
      const cost = ns.corporation.getUpgradeLevelCost(upgrade);
      purchases.push([
        `purchase upgrade ${upgrade}`,
        cost,
        () => {
          if (funds >= cost) {
            ns.corporation.levelUpgrade(upgrade);
            funds -= cost;
          }
        },
      ]);
    }

    // loop through divisions
    for (const divName of ns.corporation.getCorporation().divisions) {
      const div = ns.corporation.getDivision(divName);
      setSmartSupply([div.type, div.name]);

      // start with advertising.
      // advertize if we can.
      let cost = ns.corporation.getHireAdVertCost(divName);
      purchases.push([
        `advertise @ ${divName}`,
        cost,
        () => {
          if (funds >= cost) {
            ns.corporation.hireAdVert(divName);
            funds -= cost;
          }
        },
      ]);

      // loop through cities
      for (const city of div.cities) {
        assignWorkers(div);

        // Upgrade office size when we can.
        cost = ns.corporation.getOfficeSizeUpgradeCost(divName, city, 1);
        purchases.push([
          `upgrade office @ ${divName}`,
          cost,
          () => {
            if (funds >= cost) {
              ns.corporation.upgradeOfficeSize(divName, city, 1);
              funds -= cost;
            }
          },
        ]);

        // upgrade warehouse when we can.
        cost = ns.corporation.getUpgradeWarehouseCost(divName, city);
        purchases.push([
          `upgrade warehouse @ ${divName}`,
          cost,
          () => {
            if (funds >= cost) {
              ns.corporation.upgradeWarehouse(divName, city);
              funds -= cost;
            }
          },
        ]);
      }
    }

    purchases.sort((a, b) => a[1] - b[1]);
    ns.print(`Current funds: $${ns.formatNumber(funds)}`);
    for (const purchase of purchases) {
      ns.print(`Cost to ${purchase[0]}: $${ns.formatNumber(purchase[1])}`);
      purchase[2]();
    }
  }
}
