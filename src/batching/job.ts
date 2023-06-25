import type { NS } from '/../NetscriptDefinitions';

export enum JobType {
  Hack = 'Hack',
  Weaken = 'Weaken',
  DoubleWeaken = 'DoubleWeaken',
  Grow = 'Grow',
  Prep = 'Prep',
}

const version = 1;
const hackScript = 'batching/hack.js';
const growScript = 'batching/grow.js';
const weakenScript = 'batching/weaken.js';

export class Job {
  ns: NS;
  jobType: JobType;
  target: string;

  // The percent of the server we want to hack.
  hackPercent = 0.5;

  constructor(ns: NS, jobType: JobType, target: string) {
    // ns.print(`Job v${version}`)
    this.ns = ns;
    this.jobType = jobType;
    this.target = target;
  }

  get threads() {
    const { ns, target } = this;
    const player = ns.getPlayer();
    const server = ns.getServer(target);
    server.hackDifficulty = server.baseDifficulty;
    const hackThreads =
      Math.floor(
        this.hackPercent / ns.formulas.hacking.hackPercent(server, player),
      ) || 1;
    server.moneyAvailable = this.hackPercent * ns.getServerMaxMoney(target);
    const growThreads =
      ns.formulas.hacking.growThreads(
        server,
        player,
        ns.getServerMaxMoney(target),
      ) || 1;
    const hackEffect = ns.hackAnalyzeSecurity(hackThreads, target);
    const growEffect = ns.growthAnalyzeSecurity(growThreads, target);
    const weakenPerThread = ns.weakenAnalyze(1);
    const weakenThreadsPerHack = Math.ceil(hackEffect / weakenPerThread) || 1;
    const weakenThreadsPerGrow = Math.ceil(growEffect / weakenPerThread) || 1;
    switch (this.jobType) {
      case JobType.Grow:
        return growThreads;
      case JobType.Hack:
        return hackThreads;
      case JobType.Weaken:
        return Math.max(weakenThreadsPerGrow, weakenThreadsPerHack);
      case JobType.DoubleWeaken:
      case JobType.Prep:
        return weakenThreadsPerGrow + weakenThreadsPerHack;
    }
  }

  get duration() {
    const { ns, target, jobType } = this;
    const player = ns.getPlayer();
    const server = ns.getServer(target);
    server.hackDifficulty = server.baseDifficulty;
    const weakenTime = ns.formulas.hacking.weakenTime(server, player);
    const growTime = ns.formulas.hacking.growTime(server, player);
    switch (jobType) {
      case JobType.Grow:
        return growTime;
      case JobType.Hack:
        return ns.formulas.hacking.hackTime(server, player);
      case JobType.Weaken:
      case JobType.DoubleWeaken:
        return weakenTime;
      case JobType.Prep:
        return Math.max(growTime, weakenTime);
    }
  }

  get ram() {
    const growRam = this.ns.getScriptRam(growScript) * this.threads;
    const weakenRam = this.ns.getScriptRam(weakenScript) * this.threads;
    switch (this.jobType) {
      case JobType.Grow:
        return growRam;
      case JobType.Hack:
        return this.ns.getScriptRam(hackScript) * this.threads;
      case JobType.Weaken:
      case JobType.DoubleWeaken:
        return weakenRam;
      case JobType.Prep:
        return Math.max(growRam, weakenRam);
    }
  }

  // Execute the appropriate script on given server.
  execute(host: string, delay = 0) {
    const { ns, target, jobType } = this;
    if (!host || !ns.serverExists(host)) {
      ns.print(`Attempting to execute a job without a host!`);
      return;
    }
    switch (jobType) {
      case JobType.Weaken:
        ns.exec(weakenScript, host, this.threads, target, delay);
      case JobType.Hack:
        ns.exec(hackScript, host, this.threads, target, delay);
      case JobType.Grow:
        ns.exec(growScript, host, this.threads, target, delay);
      case JobType.Prep:
        if (ns.getServerMoneyAvailable(target) < ns.getServerMaxMoney(target)) {
          ns.exec(growScript, host, this.threads, target, delay);
        } else {
          ns.exec(weakenScript, host, this.threads, target, delay);
        }
    }
  }
}
