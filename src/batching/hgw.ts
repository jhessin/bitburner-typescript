import { NS } from '../../NetscriptDefinitions';

export async function main(ns: NS) {
  const target = ns.args[0] as string;
  await ns.hack(target);
  await ns.weaken(target);
  await ns.grow(target);
  await ns.weaken(target);
}
