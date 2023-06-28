import type { NS } from '../NetscriptDefinitions';

const MinutesToPhase2 = 2;

const scripts: (string | string[])[] = [
  'gangs.js',
  'auto-crack.js',
  'hacknet.js',
  'crime.js',
  ['main/simple.js', 'n00dles', 'all'],
];

const phase2Scripts: (string | string[])[] = [
  'work.js',
  // ['main/tools/servers.js', 'buy', 'big', 'auto'],
  // ['main/start-hgw.js'],
];

export async function main(ns: NS) {
  for (const script of scripts) {
    if (typeof script === 'string') {
      if (!ns.isRunning(script, ns.getHostname())) ns.run(script);
    } else {
      if (!ns.isRunning(script[0], ns.getHostname(), ...script.slice(1)))
        ns.run(script[0], 1, ...script.slice(1));
    }
  }
  const startTime = Date.now();
  const phase2Time = startTime + MinutesToPhase2 * 60000;

  while (Date.now() < phase2Time) {
    ns.tail();
    ns.disableLog('ALL');
    ns.clearLog();
    ns.print(`Phase 2 begins in ${ns.tFormat(phase2Time - Date.now())}`);
    await ns.sleep(500);
  }

  for (const script of phase2Scripts) {
    if (typeof script === 'string') {
      if (!ns.isRunning(script, ns.getHostname())) ns.run(script);
    } else {
      if (!ns.isRunning(script[0], ns.getHostname(), ...script.slice(1)))
        ns.run(script[0], 1, ...script.slice(1));
    }
  }
}
