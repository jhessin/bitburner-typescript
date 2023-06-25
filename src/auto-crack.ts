import { NS } from '../NetscriptDefinitions';
import { main as Crack } from './crack';

export async function main(ns: NS) {
  while (true) {
    await ns.sleep(5000);
    await Crack(ns);
  }
}
