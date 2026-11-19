---
name: lab
description: Black-box test a pi extension or command (e.g. /split) in an isolated herdr + pi, driven like a person and judged from the screen, with a report. Use when asked to test, try out, check or verify a pi command or tool "in the lab", or to see whether it works from the outside.
---

# lab

Runs the thing under test in its own herdr server and pi (own sockets and settings, only the model logins reused, only the tools named), drives it with herdr's CLI, has a tool-less judge quote the screen, writes a report, and removes what it started. Never touches the user's own herdr.

## Before you run (project rule: stop and ask first)
A run makes model calls and writes a report into `./lab-reports/`. Show the user the exact command and wait for OK.

## Commands (shell: `node <this package>/lab.mjs`, or `lab` if on PATH; in pi: `/lab`)
- `lab doctor` — read-only check of herdr, its CLI, pi, login. Run it first.
- `lab run "<scenario>" --tool NAME --project <repo>` — a file of `## ` sections, a `.json`, or a sentence.
  - Steps given: the driver follows them, one check per sentence.
  - Only "try out /x": the driver explores (learns from the `/` command list and `--help`, normal use, then edge cases).
- `lab stop <id>|--all|--stale`, `lab list`, `lab report <id>`, `lab --help`.
- `lab prune --older-than 14d` lists old reports; add `--yes` to delete (ask the user first: reports are evidence).

## Always
- Pass `--tool NAME` for what is under test. Without it nothing is loaded and the run says so in WARNINGs.
- Pass `--project <git repo>`; relative paths resolve from the cwd. A non-git folder copies everything minus a deny-list.
- Read the WARNING lines printed beside the summary before trusting a PASS.

## Reading results
- PASS with explore mode means "nothing looked broken", not "does what you meant". Trust FAILs and odd findings more.
- UNCLEAR means the screen did not show enough, or the scenario could not be carried out (blocked). It is not a pass.
- UNSUPPORTED means the lab itself cannot do what the step asked (herdr has no screenshot). It says nothing about the tool under test; report it as a gap, not a bug.
- Each report step says whether its expectation was "declared before acting" (trustworthy) or "set AFTER the driver saw the screen" (weaker: the judge may be anchored).
- Every verdict carries a verbatim screen quote the lab checked; a quote not on the screen downgrades a pass.
- herdr has no screenshot command: the lab says so and uses visible pane text.
- Report each step as "I tried X, expected Y, got Z". Say plainly what the lab cannot do; never simulate it.
