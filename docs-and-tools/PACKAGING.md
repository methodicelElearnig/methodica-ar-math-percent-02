# Cutting a deployment package

| file | role |
|---|---|
| `package-allowlist.ps1` | **The single definition** of what a package contains. Not runnable; the other two dot-source it. |
| `build-package.ps1` | Cuts a package into a dated folder, then verifies what it just wrote. |
| `verify-package.ps1` | Answers one question: is the package on disk still exactly this tree? |

`build-package.ps1` and `verify-package.ps1` are **byte-identical** to the copies in
`methodica-math-scale-01` and `methodica-science-mass-measure-02` (md5 `19b1dcb4` and `f7404298`).
Only `package-allowlist.ps1` differs between units — see its `.NOTES` block for what differs here
and why.

## Running

```powershell
pwsh -File docs-and-tools/build-package.ps1 -DryRun   # what would ship, writing nothing
pwsh -File docs-and-tools/build-package.ps1           # cut into deployments/<today>
pwsh -File docs-and-tools/verify-package.ps1          # check the newest package
```

`build-package.ps1` **refuses** a dirty working tree (`-AllowDirty` overrides) and a non-empty
target (`-Force` overrides, and preserves the hand-written DEPLOY.md). `deployments/` sits
**outside** the repo, so an overwrite is not recoverable.

**Run the four test gates before cutting, not only after.** Packaging cannot see load order, and
load order is load-bearing here: `js/main.js` second-to-last and `../unit-js/90-boot.js` last, in
its own tag (§3.1/§3.2). `_test/verify-shared.js` asserts it; the allowlist cannot.

## Why an allowlist, not a denylist

`kata-api-key.txt` is gitignored and may sit at the repo root. Under a denylist, one missing entry
publishes it. Under an allowlist a root-level file ships only if `$RootFiles` names it, and
`$RootFiles` is `index.html`.

The failure mode is on record in a sibling unit: scale-01's 2026-09-02 DEPLOY.md documents an
earlier package cut the same day being destroyed — *"it is gone, and nothing from it should be
uploaded"* — and every release before 2026-09-07 restated the exclusion list from memory.

## The four checks in verify-package

| check | question |
|---|---|
| FORWARD | every file in the package exists in the tree with identical content (MD5) |
| REVERSE | every file the allowlist ships is **present** in the package — the check a plain diff misses, because a file added to the tree after the cut looks fine and ships as a 404 |
| HYGIENE | no key, `*.ps1`, `*.log`, `*.bat`, `index_dev.html`, `README.md` or `_`-prefixed path in the package |
| COMMIT | the commit DEPLOY.md claims versus HEAD — and only a change to a **shipped** file marks a package stale, so a commit touching `_test/` or `docs-and-tools/` does not |

## What is specific to this unit

**Per-part code lives in SUBDIRECTORIES, and this is the one difference that could ship a broken
package quietly.** Both sibling units keep a flat `script.js` / `styles.css` at the component root.
percent-02 keeps `js/main.js` and `css/style.css`, and the plan for this unit is explicit that they
must **not** be renamed to the family's flat names. A copy of the sibling `Test-Ships` rule would
ship seven `index.html` files and every asset, and **no code or CSS at all** — a package that looks
complete at a glance. `$ComponentDirs` is what makes the subdirectories ship; the REVERSE check is
what catches it if this is ever got wrong again.

Expected shape of a correct package: **101 files** — 1 root `index.html`, 8 `metadata/`,
14 `unit-js/`, 4 `unit-css/`, 6 `unit-assets/`, and 68 across the seven parts (3 code files each
plus 47 assets).

**`unit-css/` is real here.** In scale-01 that directory is empty and its DEPLOY.md lists it as an
exclusion. Here it holds four files, one of which (`25-report.css`) styles the issue-report modal in
all seven parts — a package without it reports issues through an unstyled dialog.

**`index_dev.html` does not ship**, and this repo's `.gitignore` used to say otherwise. It claimed
"nothing production-facing is excluded: index.html, index_dev.html (the 720 dev-navigation harness
is part of the deliverable)", which conflates *tracked in git* — correct, it is a dev tool worth
versioning — with *shipped to the CDN*. §11.1 says never ship it; both siblings' actual deployment
records (scale-01 2026-09-02, mass-measure-02 2026-08-20) list it as a dev-only exclusion; and
`verify-package.ps1`'s HYGIENE check refuses a package containing it.

Since `RESUME_ENABLED` went true there is a second, sharper reason. `index_dev.html` drives the
lomda by posting `DEV_GOTO` to the framed page, and `unit-js/60-devbridge.js` turns that into
`goTo(n)` — which now calls `scheduleResumeSave()`. The dev screen-jumper can therefore rewrite a
learner's saved position. (The bridge itself ships and is now origin-gated, so only a same-origin
harness can drive it.)

**`docs-and-tools/` must never ship** — it holds `send-metadata.ps1` / `retrieve-metadata.ps1`,
which read a live Kata API key. It is excluded wholesale by `$ExcludeTopLevel`, and again by
`*.ps1` in `$ExcludeExt` and `$SecretPatterns`.

## Running the test suite against a package

All four harnesses take a base path as their first argument:

```bash
node _test/verify-shared.js ../../deployments/<date>
```

This is a cross-check, not a gate — the gate is `verify-package.ps1`. The golden digests resolve
from `__dirname`, so they travel with the harness rather than being looked for inside the package.

## Deploy order — library first, unit second, all parts atomically

§11.2. If the unit goes up referencing a library letter that is not on the CDN yet, `loadScript`'s
`onerror` still invokes its callback — so the page boots, looks healthy, and **all reporting is off
and resume is dead**, with nothing in the console.

This unit now loads `xapi-720-k.js` (derived from `RESUME_ENABLED`), so **the `-k` build must be on
the CDN before the unit goes up.** Verify the uploaded library **by size and signature, not
`HTTP 200`** (§11.3): the test stub at `_test/xapi-720-k.js` and the real library share a basename
by design, and the stub was once pushed under the library's name and returned 200.

Deploy **all seven parts atomically.** A part on the old build beside resume-enabled parts writes a
document the others discard and rewrite: a reset loop that wipes the `done` ledger each cycle and
re-sends `completed` every time. The same applies on rollback.
