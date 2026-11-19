# pi-blackbox-lab

`/lab` for [pi](https://github.com/earendil-works/pi) + [herdr](https://github.com/herdrdev/herdr): test a pi extension or command from the outside. The lab starts its own herdr server and pi, drives them like a person (type, keys, read the screen), has a tool-less judge quote the screen, writes a report, and removes what it started. Your own herdr is never touched.

Tested on Linux with herdr 0.9.3 and pi 1.5.2. herdr has no screenshot command: the lab says so and uses visible pane text. Not tested on macOS.

## Install
```sh
pi install /path/to/lab-package          # local, loaded from where it is
pi install git:github.com/<you>/<repo>   # once pushed
```
Then `/reload` and `/lab doctor`. It adds `/lab`, a `lab` skill for agents, and a `lab` shell command (`bin`). Whether `pi install` puts `bin` on your PATH is untested; `ln -s <package>/lab.mjs ~/.local/bin/lab` does it.

Needs: `herdr` and `pi` on PATH, a model login in pi, and herdr's pi integration (`herdr integration install pi`) so herdr can see pi's session (`/split` needs it).

## Use
```sh
lab doctor
lab run "try out /split" --tool split --project <repo>      # no steps: explores
lab run lab-scenarios.md --tool split --project <repo>      # "## " sections, one check per sentence
lab stop --all
```
- `--tool NAME`: only these exist in the lab's pi. Found in pi's settings (extension folders, installed local/npm packages) and `.pi/extensions` up from the cwd. Git packages are found in the clone pi keeps under `<agent dir>/git/` (ssh-style sources are not: pass a path).
- `--project`: relative to the cwd; must exist. A git repo is copied by `git ls-files`, minus secrets, agent files, expectation files and `lab-scenarios.md`.
- Each `## ` section of a scenario file runs in its own fresh lab, so sections cannot leave conversation, panes or files behind for each other (about 20 s extra per section).
- Reports: `./lab-reports/<id>.md` ("I tried X, expected Y, got Z" with a verbatim quote).
- A run makes model calls (driver, judge, and the pi under test).

## Reading results
An explore-mode PASS means nothing looked broken, not that it does what you meant. UNCLEAR is never a pass. UNSUPPORTED means the lab cannot do the step (e.g. a screenshot); it says nothing about the tool. WARNINGs print beside the summary (no `--tool`, project not a git repo).

## Develop
`npm test` (node:test; no dependencies, no model calls). Credit: the quote check and blank-row squeeze follow [johnlindquist/herdr-pi-lab](https://github.com/johnlindquist/herdr-pi-lab).

## License
MIT, see [LICENSE](LICENSE).
