# Retrieving metadata from the Kata catalog

`retrieve-metadata.ps1` is the opposite direction of [`send-metadata.ps1`](SEND-METADATA.md):
it reads a content unit out of the Katalog (Kata) catalog at `https://kata.cet.ac.il/api/v1`
and writes it back out as metadata files — same schema, same key order, same formatting
as the `metadata/` folder — into **`metadata-from/`**. It never writes to `metadata/`.

The point is comparison. Diff the two folders to see exactly where the catalog and the
repo disagree:

```bash
git diff --no-index metadata metadata-from
```

See [KATA-API-DETAILED.md](../../KATA-API-DETAILED.md) for the endpoint schemas.

## Requirements

- **PowerShell 7+** (`pwsh`). PowerShell 7.5+ additionally keeps `createdAt`/`updatedAt`
  exactly as KATA sent them; on 7.0–7.4 they are re-serialized to microsecond precision
  (`ConvertFrom-Json` converts ISO-8601 strings to `[datetime]` and there is no
  `-DateKind` to switch it off before 7.5).
- **curl.exe** — bundled with Windows 10/11.
- An API key, resolved in this order: the `-ApiKey` parameter, the `KATA_API_KEY`
  environment variable, or **`kata-api-key.txt`** next to the script (one line, just the
  key — git-ignored, and shared with `send-metadata.ps1`). See
  [SEND-METADATA.md → One-time setup](SEND-METADATA.md#one-time-setup). Never hard-code
  a key in the script; it is committed.

## Usage

```powershell
# Unit key is taken from metadata/*_unit.json
pwsh -File retrieve-metadata.ps1

# Also save the untouched API response under metadata-from/_raw/
pwsh -File retrieve-metadata.ps1 -KeepRaw

# Any other unit / server / destination
pwsh -File retrieve-metadata.ps1 -UnitKey some-other-unit -OutDir .\snapshot

# Audit the catalogue against metadata/ and FAIL if it has drifted (pre-release gate)
pwsh -File retrieve-metadata.ps1 -FailOnDrift

# Audit against a different authored tree, or skip the audit entirely
pwsh -File retrieve-metadata.ps1 -MetadataDir ..\other\metadata
pwsh -File retrieve-metadata.ps1 -MetadataDir ''
```

Progress prints to the console and to `retrieve-metadata.log` (git-ignored). The run
ends with a `unit=1 components=N items=M warnings=W` summary.

### The audit (added 2026-09-11)

Every run now compares what KATA **actually returned** against `metadata/` — component and
item `uniqueKey` / `hostedContentRef`, and every `questions[]` entry field by field — and
warns per divergence. Two prefixes to know:

- `NOTE ID-SHAPE …: uniqueKey is a bare slug, not an IRI` — **expected.** KATA keys
  components and items on a slug and exposes no `id` column, so the IRI that 720 v2.5 p.11
  requires survives only in `hostedContentRef`. Recorded, not counted as drift.
- `WARN QUESTIONS …` / `WARN … hostedContentRef` — **real divergence.** These are counted,
  and `-FailOnDrift` turns them into exit 1.

This exists because on 2026-09-09 a send logged `updated=35 failed=0` and a retrieve
straight afterwards reported `warnings=0` — and both were useless (see below).

`-UnitKey` is resolved in this order: the parameter → the `id` in `metadata/*_unit.json`
→ `GET /api/v1/content-units` when the account owns exactly one unit (otherwise it
stops and lists the available keys).

## How it maps KATA back to the metadata format

A single `GET /api/v1/content-units/{unitKey}` returns the whole tree — unit,
`components[]`, each component's `subContent[]`, and each item's `questions[]` — so
there is one request per run regardless of size.

**Enum values are passed through untouched.** KATA now stores the same kebab-case
vocabulary the metadata files use (`state-general`, `core-curriculum-basic`,
`project-or-inquiry-task`, `interactive-content`, …), so unlike the sender this script
has no enum-mapping tables. *(Note that the Title-Case vocabularies still documented in
`KATA-API.md` — and still used by `send-metadata.ps1` — are stale.)*

| Metadata | Rebuilt from KATA |
|---|---|
| `id` (full URL) | the entity's own `uniqueKey`, which **is** the id since the 2026-09-15 IRI migration — for components, items and the URL prefix alike; the unit's `id` comes from the unit key (v2.5 §2.7 exempts it). Falls back to component `hostedContentRef` minus `/index.html` for a pre-migration row (with a warning), then to `-IdBase`. ⚠️ Until 2026-09-16 `hostedContentRef` came first, which put a `720` content path where a `720active` identifier belongs and produced `id` DRIFT rows that were not drift. |
| unit `title` (string) | `title.Hebrew` (`$TitleLangKey`) |
| component `learningUnitId` | the unit's `id` URL (KATA returns the bare key) |
| component `manufacture` | the `$Manufacture` constant, `'methodica'` — KATA returns the provider display name (`מתודיקה`) instead. Set `$Manufacture = $null` to pass KATA's value through. |
| `recommendedAfterFail` | each key expanded back to `<prefix>/<key>/` |
| item `id` | the item's own `hostedContentRef`. **KATA holds `null` here for every item in this unit**, so the id is *synthesised* as `<component id>/<item uniqueKey>/` — and each synthesis now emits a `WARN` naming it as reconstructed. Before 2026-09-11 this was silent, which is how it stayed invisible that an item's IRI is stored nowhere in KATA. |
| `questions[]` | verbatim, minus each question's `order` |

**Dropped**, because the metadata format has no place for them — use `-KeepRaw` if you
need them: unit `kind`, `providerName`, `providerLogoUrl`, `componentCount`, `createdAt`,
`updatedAt`; component `status`, `manufacturerGroupId`, `masteryLevel`,
`hostedContentRef`; item `uniqueKey`, `hostedContentRef`, `order`; question `order`.

Component `createdAt`/`updatedAt` **are** kept — they are KATA's real timestamps, so
they always differ from the placeholder dates in `metadata/`.

## Output formatting

Files are written **UTF-8 without BOM, CRLF, 2-space indent, trailing newline**, and the
formatter reproduces the hand-authored style of `metadata/` rather than using
`ConvertTo-Json` (which expands every array and would add whitespace noise to every
diff). The rule, all of it configurable in the CONFIG block:

- an empty array is `[]`; an empty object is `{}`
- an array of primitives goes on one line while its compact form is ≤ `$InlineArrayMaxChars`
  (8) — so `answers`, `correctAnswers`, `targetSector`, `skills` and
  `recommendedAfterFail` get one element per line, and each element shows up as its own
  line in a diff
- arrays under `languages` / `source` / `target` (`$InlineArrayKeys`) are short tuples and
  get a larger budget, `$InlineTupleMaxChars` (62)
- a flat object of at most `$InlineObjectMaxProps` (3) primitive values goes on one line —
  that's how the `matching` questions' `correctAnswers` pairs are stored

**Fidelity.** The two array budgets were fitted by parsing each `metadata/*.json` and
re-emitting it through this formatter: 8 / 62 reproduces **5 of the 6 files byte for
byte**. The one residual line is `"answers": ["כן", "לא"]` in part 04, which `metadata/`
inlines at 12 characters — but a 12-character budget re-formats more lines elsewhere
than it fixes, because the hand-authored files aren't self-consistent about it. Re-measure
before changing either number.

## What a first run showed (2026-07-25)

Every file's diff against `metadata/` was genuine drift, not noise — the catalog holds
different values from the repo for `title` (all 5 components), `cognitiveLevel` (all 5 —
KATA has `algorithmic-thinking`, the metadata has the 720 science labels),
`estimatedTimeInMinutes`, `skills` (KATA has `MOE.SKILL.*` codes, the metadata has none),
`contentType`, `mediaFormat`, `questionType`, `questionText`, `answers`,
`correctAnswers`, and `recommendedAfterFail`.

---

## percent-02: what changed in this copy, and the expected residual diff

This is a copy of scale-01's tool, adapted on 2026-09-09. Four changes:

1. **Encoding fix (the important one).** `Get-Kata` used to capture curl's stdout through
   `Out-String`, which decodes bytes using `[Console]::OutputEncoding` — an OEM codepage on a
   Windows console. **Every Hebrew string came back as mojibake** (`╫É╫ù╫ò╫û╫Ö╫¥` for `אחוזים`),
   silently, in the reconstructed files *and* in `-KeepRaw`. The body now goes to a temp file via
   `-o` and is read back as UTF-8, which is immune to the console codepage. If you port this tool
   anywhere else, take this fix with it.
2. **v2.5 field shapes** — `targetSector`→`targetSectors`, `targetAudience` to a single value,
   `prerequisiteLearningObjective` dropped, `manufacturer` added on the unit,
   `cognitiveLevel`→`cognitiveLevels`, component-level `manufacture` no longer emitted,
   `masteryLevel` emitted even when null.
3. **Ids** — unit id is the plain slug (v2.5 §2.7 dropped the IRI requirement for the unit only);
   component and item ids regained the trailing slash the metadata convention carries.
4. **`$InlineArrayMaxChars` 8 → 96**, re-fitted against this unit's files.

### The diff will never be empty, and that is correct

After those changes the whole residual is **17 lines per side**, in three groups. None is content:

| Lines | What | Why |
|---|---|---|
| 14 | `createdAt` / `updatedAt` on all 7 components | The metadata carries placeholder dates; these are KATA's real timestamps. Documented above. |
| 1 | `manufacturer`: `"310"` vs `"מתודיקה"` | KATA derives it from the group owning the API key and returns the provider display name. Our supplier number cannot round-trip. |
| 2 | two `correctAnswers`, one `target` tuple | Pure JSON array wrapping: two strings land at ~97–99 chars against the 96 budget, and the `target` tuple at ~70 against `$InlineTupleMaxChars` (62). Identical content, different line breaks. |

So **do not chase an empty diff.** The check that actually matters is a *semantic* comparison —
component by component and item by item, on `title`, `componentPurpose`, `depthLevel`,
`cognitiveLevels`, `relativeDifficulty`, `order`, `estimatedTimeInMinutes`, `isAssessment`,
`isRequired`, `languages`, `skills`, the item id list, and each item's `contentType`,
`mediaFormat`, `informationToBot` and `questions`. Run against the live API on 2026-09-09 for all
7 components / 26 items / 44 questions, that comparison returned **zero differences**.

> ⚠️ **It does not return zero any more, and the cause is on KATA's side.** Re-run on
> 2026-09-11 against the same unit, the catalogue holds **42** questions, and **12 of the 26
> items** carry an older generation of question data — `questionType` `other` where the
> metadata says `numeric`/`fill-in`/`matching`, `answers` as a bare string where the metadata
> has `[]`, empty `correctAnswers`, `["true","false"]` where the metadata has
> `["נכון","לא נכון"]`, and `-01-007/q1` plus `-03-006/q2` gone outright.
>
> This is **not** a sender bug and not a stale-metadata problem. `metadata-from/` in this repo
> *is* the 2026-09-09 capture, it matches `metadata/`, and diffing it against a fresh retrieve
> today shows 6 of the 8 files changed (`-01` +17/-34, `-02` +31/-23, `-03` +5/-12, `-05` +9/-9,
> `-06` +8/-7, `-07` +3/-3; `-04` and the unit file identical). Both sides were produced by this
> same script, so the difference is a change **inside KATA** that post-dates a send which logged
> `updated=35 failed=0` and a retrieve that confirmed it.
>
> Run `-FailOnDrift` to see the full list. This is the open question in the note to CET.
(Earlier notes said 45; 5+15+13+0+5+4+2 is 44. The per-component split later became
9/5/7/1/2/1/1 items and 9/11/13/0/5/4/2 questions when the two warm-up items moved
from component -02 to -01 — same 26 and 44 in total.)
