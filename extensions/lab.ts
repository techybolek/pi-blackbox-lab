// /lab — pi slash command; thin wrapper over the `lab` shell command (same operations, no model turn).
// Installed as part of this package: pi install <path-or-git-source>
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { noticeLevel } from "../lib.mjs";

// extensions/lab.ts -> ../lab.mjs (run with node; no bash wrapper, so nothing depends on readlink -f)
const LAB = join(dirname(fileURLToPath(import.meta.url)), "..", "lab.mjs");
const SUBS: [string, string][] = [
	["doctor", "check herdr, its CLI and pi before a run"],
	["run", "run a scenario file, a described scenario, or just \"try out /cmd\" to explore: run <file|\"text\"> --tool NAME"],
	["start", "isolate only; prints a lab id"],
	["drive", "drive <id> type|keys|read|wait|split|close|screenshot"],
	["judge", "judge <id> \"<tried>\" \"<expected>\""],
	["report", "report <id>"],
	["list", "list live labs"],
	["stop", "stop <id>|--all"],
	["--help", "usage and examples (same text as bare /lab)"],
];

function tokenize(input: string): string[] {
	const out: string[] = [];
	const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
	let m: RegExpExecArray | null;
	while ((m = re.exec(input)) !== null) out.push(m[1] ?? m[2] ?? m[3]);
	return out;
}

const DRIVE_VERBS: [string, string][] = [
	["type", 'type "<text>" into the pane under test'],
	["keys", "press keys: enter esc ctrl+c down …"],
	["read", "print visible pane text [--lines N]"],
	["wait", 'wait "<text>" [--timeout MS]'],
	["split", "new pane in the lab [right|down]"],
	["close", "close the split pane"],
	["screenshot", "unsupported by herdr 0.9.x: exits 3 and says so"],
];
const OPTIONS: [string, string][] = [
	["--tool", "tool available in the lab (repeatable): builtin, extension name, or path"],
	["--project", "project to copy (default: cwd)"],
	["--model", "provider/model for pi under test and judge"],
	["--keep", "run: do not stop afterwards"],
	["--no-pi", "start a plain shell instead of pi"],
];
const ID_SUBS = new Set(["drive", "judge", "report", "stop"]);
const liveIds = () => {
	try { return readdirSync(tmpdir()).filter((n) => /^lab-[a-z0-9]+$/.test(n) && existsSync(join(tmpdir(), n, "state.json"))); } catch { return []; }
};
const scenarioFiles = (cwd: string) => {
	try { return readdirSync(cwd).filter((f) => /\.(md|txt|json)$/i.test(f) && /scenario|lab/i.test(f)); } catch { return []; }
};

// pi replaces the WHOLE argument text with the chosen value, so every value repeats the words already typed.
function complete(prefix: string, cwd: string) {
	const words = prefix.split(/\s+/);
	const last = words.pop() ?? "";
	const before = words.length ? words.join(" ") + " " : "";
	const mk = (items: [string, string][]) =>
		items.filter(([v]) => v.startsWith(last) && v !== last).map(([v, d]) => ({ value: before + v, label: v, description: d }));
	const sub = words[0];
	if (words.length === 0) return mk(SUBS);
	if (sub === "run") return mk([...scenarioFiles(cwd).map((f): [string, string] => [f, "scenario file"]), ...OPTIONS]);
	if (sub === "start") return mk(OPTIONS);
	if (ID_SUBS.has(sub) && words.length === 1) return mk([...liveIds().map((i): [string, string] => [i, "live lab"]), ...(sub === "stop" ? [["--all", "stop every lab started by this tool"] as [string, string]] : [])]);
	if (sub === "drive" && words.length === 2) return mk(DRIVE_VERBS);
	if (words.includes("--tool") === false && last.startsWith("-") && (sub === "run" || sub === "start")) return mk(OPTIONS);
	return [];
}

export default function lab(pi: ExtensionAPI) {
	pi.registerCommand("lab", {
		description: "Black-box lab: /lab doctor | run | start | drive | judge | report | list | stop | --help",
		getArgumentCompletions: (prefix: string) => {
			const items = complete(prefix, process.cwd());
			return items.length ? items : null;
		},
		handler: async (args, ctx) => {
			const tokens = tokenize(args);
			const known = new Set(SUBS.map(([n]) => n).concat(["-h", "help"]));
			// Help and mistakes print in this pane only (ui.notify adds no turn to the conversation).
			if (tokens.length === 0 || tokens[0] === "--help" || tokens[0] === "-h" || tokens[0] === "help" || !known.has(tokens[0])) {
				const r = await pi.exec("node", [LAB, "--help"], { cwd: ctx.cwd, timeout: 15_000 });
				const unknown = tokens.length > 0 && !known.has(tokens[0]);
				const hint = unknown
					? `/lab: "${tokens[0]}" is not a subcommand. To try something out, use run and load the tool under test:\n  /lab run "${tokens.join(" ")}" --tool <name> --project <repo>\n(no --tool = nothing is loaded in the lab's pi)\n\n`
					: "";
				ctx.ui.notify(`${hint}${r.stdout.trim()}`, unknown ? "warning" : "info");
				return;
			}
			ctx.ui.notify(`lab ${tokens[0]} …`, "info");
			const r = await pi.exec("node", [LAB, ...tokens], { cwd: ctx.cwd, timeout: 1_800_000 });
			const text = ((r.stdout || "") + (r.stderr ? `\n${r.stderr}` : "")).trim();
			ctx.ui.notify(text || `(no output, exit ${r.code})`, noticeLevel(r.code, r.stdout));
		},
	});
}
