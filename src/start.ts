import type { NS } from "../NetscriptDefinitions"

const scripts = [
	"work.js",
	"gangs.js",
	// "batching/main.js"
	"crack.js",
]

export async function main(ns: NS) {
	for (const script of scripts) {
		ns.run(script);
	}
}
