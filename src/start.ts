import type { NS } from '../NetscriptDefinitions';

const scripts: (string | string[])[] = [
  'work.js',
  'gangs.js',
  'auto-crack.js',
  // 'crime.js',
  // ['main/simple.js', 'n00dles', 'all'],
  'main/start-hgw.js',
];

export async function main(ns: NS) {
  for (const script of scripts) {
    if (typeof script === 'string') ns.run(script);
    else {
      ns.run(script[0], 1, ...script.slice(1));
    }
  }
}
