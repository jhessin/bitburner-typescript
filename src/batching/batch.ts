import type { NS } from '/../NetscriptDefinitions';
import { Job, JobType } from 'batching/job';

// The version
const version = 1;

// The space between batches
const spacer = 500;

export enum BatchMode {
  HGW = 'HGW',
  HWGW = 'HWGW',
  Prep = 'Prep',
}

class HostPool {
  ns: NS;
  hosts: string[];

  constructor(ns: NS, hosts: string[]) {
    this.ns = ns;
    this.hosts = hosts.filter((h) => h && ns.serverExists(h));
  }

  get length() {
    return this.hosts.length;
  }

  get totalRam() {
    let sum = 0;
    for (const host of this.hosts) {
      sum += this.ns.getServerMaxRam(host) - this.ns.getServerUsedRam(host);
    }
    return sum;
  }
}

export class Batch {
  ns: NS;
  mode: BatchMode;
  hack: Job;
  weaken: Job;
  grow: Job;

  constructor(ns: NS, mode: BatchMode, target: string) {
    ns.print(`Batch v${version}`);
    this.ns = ns;
    this.mode = mode;
    this.hack = new Job(ns, JobType.Hack, target);
    this.grow = new Job(ns, JobType.Grow, target);
    this.weaken =
      mode === BatchMode.HGW
        ? new Job(ns, JobType.DoubleWeaken, target)
        : new Job(ns, JobType.Weaken, target);
  }

  get duration() {
    switch (this.mode) {
      case BatchMode.HWGW:
        return this.weaken.duration + spacer * 3;
      case BatchMode.HGW:
        return this.weaken.duration + spacer;
      case BatchMode.Prep:
        return this.weaken.duration;
    }
  }

  get totalRam() {
    switch (this.mode) {
      case BatchMode.HWGW:
        return this.hack.ram + this.grow.ram + this.weaken.ram * 2;
      case BatchMode.HGW:
        return this.hack.ram + this.grow.ram + this.weaken.ram;
      case BatchMode.Prep:
        return Math.max(this.grow.ram, this.weaken.ram);
    }
  }

  get minRam() {
    return Math.max(this.hack.ram, this.grow.ram, this.weaken.ram);
  }

  execute(hosts: string[]) {
    // filter out hosts that can't run any 1 of our scripts.
    const hostPool = new HostPool(this.ns, hosts);
    hosts = hostPool.hosts.filter((h) => {
      if (!h) return false;
      const freeRam = this.ns.getServerMaxRam(h) - this.ns.getServerUsedRam(h);
      return freeRam >= this.minRam;
    });
    if (hosts.length < 1) {
      this.ns.print(`You need at least 1 host to spawn a batcher!`);
      return;
    }
    if (hostPool.totalRam < this.totalRam) {
      this.ns.print(`Not enough Ram for batch`);
      this.ns.print(`Required: ${this.totalRam}`);
      this.ns.print(`Available: ${hostPool.totalRam}`);
      return;
    }
    const { weaken, grow, hack } = this;
    const host1 = hosts[0];
    const host2 = hosts[1];
    const host3 = hosts[2];
    const host1freeRam =
      this.ns.getServerMaxRam(host1) - this.ns.getServerUsedRam(host1);
    switch (this.mode) {
      case BatchMode.HGW:
        switch (hosts.length) {
          case 1:
            // run everything on a single host
            const host = hosts[0];
            weaken.execute(host);
            grow.execute(host, weaken.duration - grow.duration - spacer);
            hack.execute(host, grow.duration - spacer);
          case 2:
            // split between host 1 and 2
            // can host1 handle weaken?
            weaken.execute(host1);
            if (host1freeRam > weaken.ram + grow.ram) {
              grow.execute(host1, weaken.duration - grow.duration - spacer);
            } else {
              // assume we have enough on host 2
              grow.execute(host2, weaken.duration - grow.duration - spacer);
            }
            hack.execute(host2, grow.duration - spacer);

          default:
            // put one job on each host.
            weaken.execute(hosts[0]);
            grow.execute(hosts[1], weaken.duration - grow.duration - spacer);
            hack.execute(hosts[2], grow.duration - spacer);
        }

      case BatchMode.HWGW:
        switch (hosts.length) {
          case 1:
            // run everything on a single host
            const host = hosts[0];
            weaken.execute(host);
            weaken.execute(host, spacer * 2);
            grow.execute(host, weaken.duration - spacer - grow.duration);
            hack.execute(host, grow.duration - hack.duration - spacer * 2);
          case 2:
            //	split between 2 hosts
            // start with host 1
            weaken.execute(host1);
            // can you handle 2 weakens?
            if (host1freeRam > weaken.ram * 2) {
              weaken.execute(host1, spacer * 2);
              // and a grow?
              if (host1freeRam > weaken.ram * 2 + grow.ram) {
                grow.execute(host1, weaken.duration - spacer - grow.duration);
              } else {
                grow.execute(host2, weaken.duration - spacer - grow.duration);
              }
            } else {
              // assume we have enough on host 2
              weaken.execute(host2, spacer * 2);
              grow.execute(host2, weaken.duration - spacer - grow.duration);
            }
            hack.execute(host2, grow.duration - hack.duration - spacer * 2);
          case 3:
            // split between 3 servers
            const host2freeRam =
              this.ns.getServerMaxRam(host2) - this.ns.getServerUsedRam(host2);
            weaken.execute(host1);
            // how about 2?
            if (host1freeRam > weaken.ram * 2) {
              weaken.execute(host1, spacer * 2);
              grow.execute(host2, weaken.duration - spacer - grow.duration);
              hack.execute(host3, grow.duration - hack.duration - spacer * 2);
            } else {
              weaken.execute(host2, spacer * 2);
              // and a grow?
              if (host2freeRam > weaken.ram + grow.ram) {
                grow.execute(host2, weaken.duration - spacer - grow.duration);
              } else {
                // dump it on 3
                grow.execute(host3, weaken.duration - spacer - grow.duration);
              }
              hack.execute(host3, grow.duration - hack.duration - spacer * 2);
            }
          default:
            // one on each host
            weaken.execute(hosts[0]);
            weaken.execute(hosts[1], spacer * 2);
            grow.execute(hosts[2], weaken.duration - spacer - grow.duration);
            hack.execute(hosts[3], grow.duration - hack.duration - spacer * 2);
        }

      case BatchMode.Prep:
        if (
          this.ns.getServerMoneyAvailable(grow.target) <
          this.ns.getServerMaxMoney(grow.target)
        ) {
          // Do a grow/weaken cycle if we can
          if (hostPool.totalRam >= weaken.ram + grow.ram) {
            weaken.execute(host1);
            if (host1freeRam >= weaken.ram + grow.ram) {
              grow.execute(host1, weaken.duration - spacer);
            } else {
              grow.execute(host2, weaken.duration - spacer);
            }
          } else {
            // just grow for now
            grow.execute(host1);
          }
        } else {
          // Just weaken it!
          this.ns.print(`executing weaken on ${host1}`);
          weaken.execute(host1);
        }
    }
  }
}
