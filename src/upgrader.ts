import { NS } from '@ns';

export async function main(ns: NS) {
  while (true) {
    await ns.sleep(500);

    // check ram upgrade cost
    const upgradeCost = ns.singularity.getUpgradeHomeRamCost();
    const funds = ns.getServerMoneyAvailable('home');

    if (funds >= upgradeCost) {
      ns.singularity.upgradeHomeRam();
    }
  }
}
