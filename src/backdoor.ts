/**
 * @format
 */

/** @format */
import { NS } from '@ns';
import { backdoorServers, getServers } from 'libs';

/** @param {NS} ns */
export async function main(ns: NS) {
  function openPorts(target: string) {
    try {
      ns.brutessh(target);
    } catch {}
    try {
      ns.ftpcrack(target);
    } catch {}
    try {
      ns.relaysmtp(target);
    } catch {}
    try {
      ns.httpworm(target);
    } catch {}
    try {
      ns.sqlinject(target);
    } catch {}
    try {
      ns.nuke(target);
    } catch {}
  }

  function GetAllServers() {
    const serverList = ['home'];
    for (const server of serverList) {
      for (const host of ns.scan(server)) {
        if (!serverList.includes(host)) serverList.push(host);
      }
    }
    return serverList;
  }

  const hosts = GetAllServers();
  for (const host of hosts) {
    // nukes the server
    openPorts(host);
  }
  await backdoorServers(ns);
  // next(ns);
}
