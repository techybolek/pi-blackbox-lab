import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { denied, extractJson, quoteMatch, agentDir, toolDirs, withCapability, tally, noticeLevel, UNSUPPORTED_MARK } from "../lib.mjs";

const made = [];
const tmp = () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), "labtest-")); made.push(d); return d; };
after(() => made.forEach((d) => fs.rmSync(d, { recursive: true, force: true })));

test("deny-list withholds secrets, agent files, expectation and scenario files", () => {
  for (const f of [".env", ".env.local", "k/server.pem", "id_rsa", "secrets.json", "AGENTS.md", "sub/CLAUDE.md", ".pi/extensions/x.ts",
    ".claude/skills/a/SKILL.md", "expectations.md", "a/expectation.md", "lab-scenarios.md", "lab-reports/x.md"]) assert.ok(denied(f), f);
  for (const f of ["src/app.ts", "README.md", "package.json", "docs/environment.md"]) assert.ok(!denied(f), f);
});

test("extractJson reads fenced, bare and surrounded JSON", () => {
  assert.deepEqual(extractJson('```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(extractJson('{"a":[1,2]}'), { a: [1, 2] });
  assert.deepEqual(extractJson('Sure! {"a":2} hope that helps'), { a: 2 });
  assert.deepEqual(extractJson("[1,2]"), [1, 2]);
  assert.deepEqual(extractJson('{"a":1}\n{"b":2}'), { a: 1 }, "two objects: the first wins");
  assert.deepEqual(extractJson('{"a":"x}y","b":"q\\"}"} trailing }'), { a: "x}y", b: 'q"}' }, "braces inside strings");
  assert.throws(() => extractJson("no json here"));
});

test("quoteMatch: exact, whitespace-normalised, absent", () => {
  const screen = "  Split after which message?\n\n  → 2.  assistant:   hi there\n";
  assert.equal(quoteMatch(screen, "Split after which message?"), "exact");
  assert.equal(quoteMatch(screen, "2. assistant: hi there"), "whitespace-normalised");
  assert.equal(quoteMatch(screen, "invented text"), false);
  assert.equal(quoteMatch(screen, ""), false);
});

test("agentDir honors PI_CODING_AGENT_DIR, else ~/.pi/agent", () => {
  assert.equal(agentDir({ PI_CODING_AGENT_DIR: "/x/y" }, "/home/u"), "/x/y");
  assert.equal(agentDir({}, "/home/u"), "/home/u/.pi/agent");
});

test("toolDirs finds settings extensions, local and npm packages, project dirs; skips git packages", () => {
  const root = tmp(), agent = path.join(root, "agent"), cwd = path.join(root, "proj", "deep");
  fs.mkdirSync(agent, { recursive: true }); fs.mkdirSync(cwd, { recursive: true });
  const local = path.join(root, "localpkg"); fs.mkdirSync(local);
  fs.writeFileSync(path.join(local, "package.json"), JSON.stringify({ pi: { extensions: ["./src/ext.ts"] } }));
  const npmPkg = path.join(agent, "npm", "node_modules", "@s", "thing"); fs.mkdirSync(npmPkg, { recursive: true });
  fs.writeFileSync(path.join(agent, "settings.json"), JSON.stringify({
    extensions: ["./myexts"], packages: ["../localpkg", "npm:@s/thing@1.2.0", "git:github.com/a/b", { source: "npm:@s/thing" }] }));
  const dirs = toolDirs({ agent, cwd, home: root }).map((x) => x.dir);
  assert.ok(dirs.includes(path.join(agent, "myexts")));
  assert.ok(dirs.includes(path.join(local, "extensions")) && dirs.includes(path.join(local, "src")));
  assert.ok(dirs.includes(path.join(npmPkg, "extensions")));
  assert.ok(dirs.includes(path.join(cwd, ".pi", "extensions")) && dirs.includes(path.join(root, "proj", ".pi", "extensions")));
  assert.ok(!dirs.some((d) => d.includes("github.com")));
});

test("a missing screenshot capability is UNSUPPORTED, not pass, fail or unclear", () => {
  const j = { verdict: "unclear", got: "x", quote: "q" };
  const did = ["typed ls", `${UNSUPPORTED_MARK}: herdr has none`];
  const r = withCapability(j, did, "Take a screenshot.");
  assert.equal(r.verdict, "unsupported");
  assert.equal(withCapability(j, did, "Run /split. Does the picker open?").verdict, "unclear", "a stray screenshot action must not hide a real result"); assert.match(r.note, /cannot do what was asked/);
  assert.equal(withCapability(j, ["typed ls"], "Take a screenshot.").verdict, "unclear", "untouched without the mark");
  assert.equal(j.verdict, "unclear", "input is not mutated");
});

test("tally counts every verdict kind", () => {
  assert.equal(tally(["pass", "pass", "pass", "unsupported"]), "3 pass, 0 fail, 0 unclear, 1 unsupported");
});

test("noticeLevel: a finished run with a summary is not an Error", () => {
  assert.equal(noticeLevel(0, "summary: 4 pass"), "info");
  assert.equal(noticeLevel(1, "UNCLEAR 3. x\n\nsummary: 3 pass, 0 fail, 1 unclear"), "warning");
  assert.equal(noticeLevel(1, "lab: tool not found"), "error");
  assert.equal(noticeLevel(2, "summary: x"), "error");
  assert.equal(noticeLevel(null, ""), "error");
});
