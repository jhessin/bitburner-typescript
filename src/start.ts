import type { NS } from '../NetscriptDefinitions';

const MinutesToPhase2 = 2;

const scripts: (string | string[])[] = [
  'main/tools/scan.js',
  // 'gangs.js',
  // 'hacknet.js',
  // 'crime.js',
  // 'work.js',
  'upgrader.js',
  ['crime.js', 'karma'],
  'auto-crack.js',
];

const phase2Scripts: (string | string[])[] = [
  // ['main/simple.js', 'n00dles', 'all'],
  // ['main/tools/servers.js', 'buy', 'big', 'auto'],
  // ['main/start-hgw.js'],
];

const phase3Target = 'the-hub';
const phase3Scripts: (string | string[])[] = [
  ['main/simple.js', phase3Target, 'all'],
];

// sorted by memory use
const phase4Scripts: (string | string[])[] = ['corp.js'];

export async function main(ns: NS) {
  function getFreeRam() {
    return ns.getServerMaxRam('home') - ns.getServerUsedRam('home');
  }
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

  while (Date.now() < phase2Time && !!phase2Scripts.length) {
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

  while (
    ns.getHackingLevel() < ns.getServerRequiredHackingLevel(phase3Target)
  ) {
    ns.tail();
    ns.disableLog('ALL');
    ns.clearLog();
    ns.print(
      `Phase 3 begins @ hacking level ${ns.getServerRequiredHackingLevel(
        phase3Target,
      )}`,
    );
    ns.print(`Current Hacking Level: ${ns.getHackingLevel()}`);
    await ns.sleep(500);
  }

  for (const script of phase3Scripts) {
    if (typeof script === 'string') {
      if (!ns.isRunning(script, ns.getHostname())) ns.run(script);
    } else {
      if (!ns.isRunning(script[0], ns.getHostname(), ...script.slice(1)))
        ns.run(script[0], 1, ...script.slice(1));
    }
  }

  if (!phase4Scripts.length) return;

  runPhase4();

  async function runPhase4() {
    for (const script of phase4Scripts.sort((a, b) => {
      if (Array.isArray(a)) a = a[0];
      if (Array.isArray(b)) b = b[0];
      return ns.getScriptRam(a) - ns.getScriptRam(b);
    })) {
      if (typeof script === 'string') {
        if (!ns.isRunning(script, ns.getHostname())) {
          while (getFreeRam() < ns.getScriptRam(script)) {
            ns.tail();
            ns.disableLog('ALL');
            ns.clearLog();
            ns.print(
              `Ram ${ns.formatRam(getFreeRam())}/${ns.formatRam(
                ns.getScriptRam(script),
              )}`,
            );
            await ns.sleep(500);
          }
          ns.run(script);
        }
      } else {
        if (!ns.isRunning(script[0], ns.getHostname(), ...script.slice(1))) {
          while (getFreeRam() < ns.getScriptRam(script[0])) {
            ns.tail();
            ns.disableLog('ALL');
            ns.clearLog();
            ns.print(
              `Ram ${ns.formatRam(getFreeRam())}/${ns.formatRam(
                ns.getScriptRam(script[0]),
              )}`,
            );
            await ns.sleep(500);
          }
          ns.run(script[0], 1, ...script.slice(1));
        }
      }
    }
  }
}
