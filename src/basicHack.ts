import type { NS } from '../NetscriptDefinitions';

export async function main(ns: NS) {
  const target = ns.args[0];
  if (typeof target !== 'string') {
    ns.tprint(`Target required.`);
    return;
  }
  if (ns.getServerMoneyAvailable(target) < ns.getServerMaxMoney(target)) {
    await ns.grow(target);
  } else if (
    ns.getServerSecurityLevel(target) > ns.getServerMinSecurityLevel(target)
  ) {
    await ns.weaken(target);
  } else await ns.hack(target);
}
