// Real CLI runs: they need herdr on PATH (the lab refuses to start without it) but start nothing and call no model.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const LAB = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "lab.mjs");
const lab = (args, env = {}) => spawnSync("node", [LAB, ...args], { encoding: "utf8", env: { ...process.env, ...env } });
const labIds = () => fs.readdirSync(os.tmpdir()).filter((n) => /^lab-[a-z0-9]+$/.test(n));

test("--help documents run, explore and warnings", () => {
  const r = lab(["--help"]);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /lab run/); assert.match(r.stdout, /explores/); assert.match(r.stdout, /WARNING/);
});

test("a --project that does not exist stops before anything starts", () => {
  const before = labIds();
  const r = lab(["start", "--project", "definitely-not-here"]);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /no such folder/);
  assert.deepEqual(labIds(), before);
});

test("an unknown --tool is refused and the message lists where it looked", () => {
  const agent = fs.mkdtempSync(path.join(os.tmpdir(), "labtest-"));
  after(() => fs.rmSync(agent, { recursive: true, force: true }));
  fs.writeFileSync(path.join(agent, "settings.json"), JSON.stringify({ extensions: ["./exts"] }));
  const before = labIds();
  const r = lab(["start", "--tool", "nope"], { PI_CODING_AGENT_DIR: agent });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /tool "nope" not found/); assert.match(r.stderr, new RegExp(path.join(agent, "exts")));
  assert.deepEqual(labIds(), before);
});
