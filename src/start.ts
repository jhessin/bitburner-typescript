import type { NS } from "../NetscriptDefinitions"

const scripts = [
	"gangs.js",
	"batching/main.js"
]

export async function main(ns: NS) {
	for (const script of scripts) {
		ns.run(script);
	}
}
