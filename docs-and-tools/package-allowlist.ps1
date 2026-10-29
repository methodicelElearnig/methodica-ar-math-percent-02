#Requires -Version 7.0
<#
.SYNOPSIS
    THE ALLOWLIST: the single definition of what a deployment package contains.

.DESCRIPTION
    Dot-sourced by build-package.ps1 and verify-package.ps1. It is not runnable on
    its own and produces no output.

    ⚠️ This is an ALLOWLIST and must never become a denylist. kata-api-key.txt is
    gitignored and may sit at the REPO ROOT — a denylist with one missing entry
    publishes a live key. Here a root file ships only if $RootFiles names it, and
    $RootFiles is index.html.

    That is not a hypothetical failure mode. In methodica-math-scale-01 every package
    before 2026-09-07 was cut by hand from an exclusion list written in prose inside
    DEPLOY.md and re-derived from memory each release, and its 2026-09-02 DEPLOY.md
    records an earlier package cut the same day being destroyed: "it is gone, and
    nothing from it should be uploaded."

    ⚠️ EDIT THIS FILE AND NOTHING ELSE when what ships changes. The builder and the
    verifier both read it, which is what stops a package from being built to one
    definition and checked against another.

        build-package.ps1   — copies exactly the files Test-Ships accepts
        verify-package.ps1  — asserts the package IS exactly those files

    This file never ships: docs-and-tools/ is excluded wholesale, and *.ps1 twice over.

.NOTES
    build-package.ps1 and verify-package.ps1 here are BYTE-IDENTICAL to the copies in
    methodica-math-scale-01 and methodica-science-mass-measure-02 (md5 19b1dcb4 and
    f7404298). Only this file differs. What differs, and why — all forced by this
    unit's shape:

      1. ⚠️ THE BIG ONE: this unit's per-part code lives in SUBDIRECTORIES.
         Both sibling units keep a flat script.js / styles.css at the component root,
         and their Test-Ships therefore ships exactly two named files plus assets/.
         percent-02 keeps js/main.js and css/style.css, so a copy of the sibling rule
         would ship SEVEN index.html files and no code or CSS at all — and the package
         would look plausible, because every part's index.html and every asset is
         there. $ComponentDirs below is what makes the subdirectories ship, and the
         REVERSE check in verify-package.ps1 is what would catch it if this were
         got wrong again.
         The plan for this unit is explicit that main.js / style.css must NOT be
         renamed to the family's flat names, so this difference is permanent.

      2. $UnitDirs gains a REAL unit-css. In scale-01 that directory is empty and its
         DEPLOY.md lists it as an exclusion; here it holds four files, one of which
         (25-report.css) styles the issue-report modal in all seven parts. A package
         without it reports issues through an unstyled dialog.

      3. $ExcludeTopLevel gains .claude — the agent config directory, which is neither
         source nor deliverable. It does not start with an underscore and is not
         matched by .git*, so nothing else would stop it.

      4. $ExcludeExt keeps .log: retrieve-metadata.log and send-metadata.log sit at
         the repo root. $RootFiles already refuses them; this is defence in depth.

      5. $ExcludeRelPaths is EMPTY, and that is a measured result rather than an
         omission — see the comment on it below.

    On index_dev.html, which this repo's .gitignore gets wrong: the .gitignore says
    "nothing production-facing is excluded: index.html, index_dev.html (the 720
    dev-navigation harness is part of the deliverable)". That conflates TRACKED IN GIT
    with SHIPPED TO THE CDN. Being versioned is right — it is a dev tool worth keeping.
    Shipping it is not, and both siblings' actual deployment records confirm the
    practice: scale-01's 2026-09-02 DEPLOY.md and mass-measure-02's 2026-08-20 both
    list index_dev.html as a dev-only exclusion, and verify-package.ps1's own HYGIENE
    check names it. §11.1 agrees. It is excluded here in $ExcludeNames and again in
    $SecretPatterns.

    There is now a second, sharper reason. index_dev.html drives the lomda by posting
    DEV_GOTO to the framed page, and unit-js/60-devbridge.js turns that into goTo(n).
    Since RESUME_ENABLED went true, goTo() also schedules a state save — so the dev
    screen-jumper can rewrite a learner's saved position. That belongs nowhere near a
    learner.

    It ships NO root files (rule set 28.09.26 for all 720 units; Documentation/
    reporting-and-resume/ADDING-REPORTING-AND-RESUME.md §5.2). Platforms launch every component
    by its own .../<component>/index.html link — Kata's hostedContentRef — so a unit-level entry
    point is never used, and the MOE CDN serves a folder URL as 0 bytes (a folder-style redirect
    is a blank page). The root index.html stays in the repo for local browsing only.
#>

# ── Directories that never contribute a single file, whatever is inside them ──
$ExcludeTopLevel = @('_test', 'docs-and-tools', 'metadata-from', '.git', '.claude')

# ── File names that never ship, wherever they appear ──
#    index_dev.html: see the .NOTES block above. README.md is a GLOBAL rule, not a
#    directory-scoped one, so it catches _test/README.md and any future unit-js one.
$ExcludeNames = @('index_dev.html', 'README.md', '.gitignore', '.gitattributes', '.DS_Store',
                  'ARCHITECTURE.md', 'PROJECT_BRIEF.md', 'CLAUDE.md', 'desktop.ini')

# ── Extensions that never ship ──
$ExcludeExt = @('.ps1', '.log', '.bat', '.pptx')

# ── Any path segment starting with an underscore is a SOURCE, not a deliverable. ──
#    _test/ is the only one left; _motion-engine/ and _nav-engine/ were retired with
#    the copy-and-sync pattern in Track A.
$ExcludeUnderscoreSegment = $true

# ── Individual files that look shippable and are not ─────────────────────────
#    EMPTY, deliberately, and this is a measured result rather than an oversight.
#    Track A audited every asset in this unit and found ZERO orphans: the only
#    duplication was seven copies of the font set and five each of two character
#    stills, all of which were deduplicated into unit-assets/ rather than deleted,
#    and the four dead font weights (200/300/500/800) were removed outright after
#    four independent gates. So there is nothing left that looks shippable and is not.
#
#    ⚠️ Do NOT extend this list by eye. An asset that merely looks unused may be built
#    at runtime from a character number, a colour or a screen index — the two
#    character stills in this unit are reached only from a video 'error' handler, which
#    no grep for a literal path will show you. A missing image costs more than its
#    bytes.
$ExcludeRelPaths = @()

# ── What each shipped area contributes ──
$RootFiles = @()                         # none — the root index.html is not deployed (see .NOTES)

$UnitDirs = @{
    'metadata'    = '*.json'             # unit + per-component catalogue records (8 files)
    'unit-js'     = '*.js'               # the shared layer (14 files)
    'unit-css'    = '*.css'              # tokens, base, motion, and the report modal
    'unit-assets' = '*'                  # fonts + the two shared character stills
}

# Inside a part folder: index.html at the root, plus js/, css/ and assets/.
#    ⚠️ Load order in every index.html is load-bearing: js/main.js second-to-last and
#    ../unit-js/90-boot.js last, in its own tag (§3.1/§3.2). Packaging cannot see that,
#    but _test/verify-shared.js asserts it — which is a reason to run the gates before
#    cutting a package, not only after.
$ComponentFiles = @('index.html')
$ComponentDirs  = @{ 'js' = '*.js'; 'css' = '*.css' }
$ComponentGlob  = 'methodica-math-percent-02-[0-9][0-9]'

# ── Hygiene: if any of these turn up INSIDE a package, it is unsafe to upload ──
$SecretPatterns = @('*key*', '*.ps1', '*.log', '*.bat', '*.pptx', 'index_dev.html',
                    'README.md', '.git*', '.claude', '_*')

# ── Files a package may contain that are NOT copied from the tree ──
$PackageOnlyFiles = @('DEPLOY.md')

<#
.SYNOPSIS
    Does this repo-relative path (forward slashes) belong in a deployment package?
#>
function Test-Ships([string] $rel) {
    $segs = $rel.Split('/')
    if ($rel -in $ExcludeRelPaths)                     { return $false }
    if ($segs[0] -in $ExcludeTopLevel)                 { return $false }
    if ($segs[-1] -in $ExcludeNames)                   { return $false }
    if ([IO.Path]::GetExtension($rel) -in $ExcludeExt) { return $false }
    if ($ExcludeUnderscoreSegment -and ($segs | Where-Object { $_.StartsWith('_') })) { return $false }

    if ($segs.Count -eq 1) { return $segs[0] -in $RootFiles }

    if ($UnitDirs.ContainsKey($segs[0])) {
        $glob = $UnitDirs[$segs[0]]
        if ($glob -eq '*') { return $true }              # unit-assets/: everything, at any depth
        return ($segs.Count -eq 2 -and $segs[1] -like $glob)
    }

    if ($segs[0] -like $ComponentGlob) {
        if ($segs.Count -eq 2) { return $segs[1] -in $ComponentFiles }
        if ($segs[1] -eq 'assets') { return $true }      # assets/ at any depth
        # js/ and css/ are FLAT: exactly <part>/js/<name>.js, no deeper. A nested file
        # would be something new, and should be looked at rather than shipped silently.
        if ($ComponentDirs.ContainsKey($segs[1])) {
            return ($segs.Count -eq 3 -and $segs[2] -like $ComponentDirs[$segs[1]])
        }
        return $false
    }
    return $false
}

<#
.SYNOPSIS
    Every repo-relative path in $root that ships, sorted.
#>
function Get-ShippableFiles([string] $root) {
    Get-ChildItem -LiteralPath $root -Recurse -File -Force |
        ForEach-Object { [IO.Path]::GetRelativePath($root, $_.FullName).Replace('\', '/') } |
        Where-Object { Test-Ships $_ } |
        Sort-Object
}

<#
.SYNOPSIS
    Secret/dev files present in a package. Anything returned makes it unsafe to upload.
#>
function Get-HygieneHits([string[]] $rels) {
    $hits = @()
    foreach ($pat in $SecretPatterns) {
        $hits += @($rels | Where-Object {
            $_.Split('/')[-1] -like $pat -or ($_.Split('/') | Where-Object { $_ -like $pat })
        })
    }
    @($hits | Sort-Object -Unique | Where-Object { $_ -notin $PackageOnlyFiles })
}
