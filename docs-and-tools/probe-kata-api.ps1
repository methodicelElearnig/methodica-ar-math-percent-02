<#
.SYNOPSIS
    Settle — empirically, against the live API — what KATA actually accepts and stores
    for component/item identifiers and for item `questions[]`.

.DESCRIPTION
    Everything runs against a THROWAWAY component created for the purpose and deleted
    at the end. No real component, item or question in the unit is touched, so the
    item-order trap in SEND-METADATA.md cannot fire and nothing a learner can reach
    changes.

    Why this exists. On 2026-09-09 a live send logged `updated=35 failed=0` and a
    retrieve 18 seconds later confirmed all 44 questions. On 2026-09-11 the catalogue
    holds 42, and 12 of the 26 items carry an OLDER generation of question data. The
    write succeeded and was verified; the data changed afterwards. Before anything is
    re-pushed we need to know which writes KATA honours at all — otherwise a re-push
    that silently reverts again destroys the evidence that it ever applied.

    Each probe records the HTTP status AND a follow-up GET, because "200 and silently
    ignored" is the failure mode being hunted and only the GET distinguishes it.

    Questions answered:
      Q-A  Is `hostedContentRef` accepted on an item at create, and patchable?
      Q-B  Is clearing it reversible (null / '')?          -> gates the hostedContentRef work
      Q-C  Is `questions[]` applied by PATCH, or create-only?  -> the lost-question question
      Q-D  Does `questions: []` delete, or no-op?
      Q-E  Is `uniqueKey` accepted in a PATCH body at all, and can it hold a full IRI?
      Q-F  Is a URN (`urn:…`, no slashes, an IRI under 720 v2.5 p.11) accepted as a key?

.PARAMETER KeepEntities
    Skip the cleanup, leaving the throwaway component in place for inspection. Use only
    when a probe wedges; otherwise always let it clean up.

.PARAMETER OutFile
    Markdown report path. Defaults to <repo>/probe-kata-api.md (git-ignored via *.md?
    no — it is deliberately committable: it is the evidence attached to the CET note).

.EXAMPLE
    pwsh -File docs-and-tools\probe-kata-api.ps1
.EXAMPLE
    pwsh -File docs-and-tools\probe-kata-api.ps1 -DryRun
#>
[CmdletBinding()]
param(
    [string] $UnitKey = 'methodica-math-percent-02',
    [string] $ApiKey,
    [string] $BaseUrl = 'https://kata.cet.ac.il',
    [string] $OutFile,
    [switch] $KeepEntities,
    [switch] $DryRun
)

$ErrorActionPreference = 'Stop'

$RepoRoot   = Split-Path $PSScriptRoot -Parent
$ApiKeyFile = Join-Path $RepoRoot 'kata-api-key.txt'
if (-not $OutFile) { $OutFile = Join-Path $RepoRoot 'probe-kata-api.md' }

# The IRI prefix this unit's metadata/ is built from. Probe payloads reuse it so the
# shapes tested are the real ones, not invented lookalikes.
$IriBase = 'https://lomdot.education.gov.il/metodica/720active/math/percent/02/'

function Resolve-ApiKey {
    if ($ApiKey)           { return $ApiKey.Trim() }
    if ($env:KATA_API_KEY) { return $env:KATA_API_KEY.Trim() }
    if (Test-Path $ApiKeyFile) {
        return ((Get-Content -Raw -Path $ApiKeyFile -Encoding UTF8) -replace '\s', '')
    }
    return ''
}
$ApiKey = Resolve-ApiKey
if (-not $ApiKey -and -not $DryRun) {
    Write-Host "No API key. Pass -ApiKey, set `$env:KATA_API_KEY, or put it in $ApiKeyFile." -ForegroundColor Red
    exit 1
}

$script:rows = New-Object System.Collections.Generic.List[object]

function Write-Step { param([string] $m, [string] $c = 'Cyan') Write-Host $m -ForegroundColor $c }

# curl.exe with the body written to / read from temp files as UTF-8. Out-String would
# decode the response with the console OEM codepage and turn every Hebrew error message
# into mojibake — the exact trap RETRIEVE-METADATA.md documents.
function Invoke-Kata {
    param([string] $Method, [string] $Path, $Body)
    $url = "$BaseUrl$Path"
    if ($DryRun) {
        Write-Host "DRY-RUN $Method $url"
        if ($null -ne $Body) { Write-Host ($Body | ConvertTo-Json -Depth 12) }
        return @{ Code = '000'; Body = '(dry-run)'; Json = $null }
    }
    $inFile  = [System.IO.Path]::GetTempFileName()
    $outFile = [System.IO.Path]::GetTempFileName()
    try {
        $args = @('-sS', '-X', $Method, $url, '-H', "X-API-Key: $ApiKey", '-o', $outFile, '-w', '%{http_code}')
        if ($null -ne $Body) {
            $json = $Body | ConvertTo-Json -Depth 12
            [System.IO.File]::WriteAllText($inFile, $json, (New-Object System.Text.UTF8Encoding($false)))
            $args += @('-H', 'Content-Type: application/json; charset=utf-8', '--data-binary', "@$inFile")
        }
        $code = (& curl.exe @args)
        $text = ''
        if (Test-Path $outFile) { $text = [System.IO.File]::ReadAllText($outFile, [System.Text.Encoding]::UTF8) }
        $obj = $null
        if ($text) { try { $obj = $text | ConvertFrom-Json } catch { } }
        return @{ Code = "$code".Trim(); Body = $text; Json = $obj }
    }
    finally {
        Remove-Item $inFile, $outFile -ErrorAction SilentlyContinue
    }
}

function Add-Row {
    param([string] $Id, [string] $Question, [string] $Call, $Result, [string] $Observed)
    $snippet = ''
    if ($Result.Code -notmatch '^2\d\d$' -and $Result.Body) {
        $snippet = ($Result.Body -replace '\s+', ' ')
        if ($snippet.Length -gt 200) { $snippet = $snippet.Substring(0, 200) + '…' }
    }
    $script:rows.Add([pscustomobject]@{
        Id = $Id; Question = $Question; Call = $Call
        Code = $Result.Code; Observed = $Observed; Error = $snippet
    })
    $colour = if ($Result.Code -match '^2\d\d$') { 'Green' } else { 'Yellow' }
    Write-Host ("  {0,-5} {1,-52} HTTP {2}  {3}" -f $Id, $Call, $Result.Code, $Observed) -ForegroundColor $colour
}

# ── probe payloads ──────────────────────────────────────────────────────────
$Q2 = @(
    [ordered]@{ questionId = "$($IriBase)probe/q1"; questionType = 'numeric'; questionText = 'PROBE q1'; answers = @(); correctAnswers = @(80) },
    [ordered]@{ questionId = "$($IriBase)probe/q2"; questionType = 'choice';  questionText = 'PROBE q2'; answers = @('a','b'); correctAnswers = @('a') }
)
$Q3 = $Q2 + @(
    [ordered]@{ questionId = "$($IriBase)probe/q3"; questionType = 'fill-in'; questionText = 'PROBE q3 ADDED BY PATCH'; answers = @(); correctAnswers = @('x') }
)

Write-Step "=== probe-kata-api ===  $BaseUrl  unit=$UnitKey$(if ($DryRun) { '  [DRY-RUN]' })"

# ── P1: throwaway component ─────────────────────────────────────────────────
Write-Step "`n[P1] create the throwaway component"
$sug = Invoke-Kata 'GET' "/api/v1/content/next-unique-key?entityType=component&unitKey=$UnitKey"
$PROBE = if ($sug.Json -and $sug.Json.uniqueKey) { $sug.Json.uniqueKey } else { "$UnitKey-00099" }
Add-Row 'P0' 'What key does KATA itself suggest for a component?' 'GET /content/next-unique-key' $sug $PROBE

# order 99 keeps it clear of the seven real components (1-7); no hostedContentRef means
# a platform-side unit view has nothing to launch it with.
$compBody = [ordered]@{
    uniqueKey = $PROBE; title = 'PROBE — safe to delete'; componentPurpose = 'instruction'
    isAssessment = $false; isRequired = $false; relativeDifficulty = 1; order = 99
    depthLevel = 'core-curriculum-basic'; cognitiveLevels = @('process-thinking')
    languages = @('Hebrew'); skills = @(); estimatedTimeInMinutes = 1
}
$r = Invoke-Kata 'POST' "/api/v1/content-units/$UnitKey/components" $compBody
Add-Row 'P1' 'Can we create a scratch component?' "POST /content-units/$UnitKey/components" $r "key=$PROBE"
if (-not $DryRun -and $r.Code -notmatch '^2\d\d$') {
    Write-Host 'P1 failed — nothing else can run safely. Stopping.' -ForegroundColor Red
    exit 1
}

$A = "$PROBE-001"
$refA    = "$($IriBase)probe/item-a/"
$refAlt  = "$($IriBase)probe/item-a-CHANGED/"

# ── P2/P3: item create with hostedContentRef + questions ────────────────────
Write-Step "`n[P2/P3] Q-A — hostedContentRef and questions at CREATE"
$itemA = [ordered]@{
    uniqueKey = $A; title = 'PROBE item A'; informationToBot = 'probe'
    contentType = 'practice'; mediaFormat = 'interactive-content'
    hostedContentRef = $refA; order = 1; questions = $Q2
}
$r = Invoke-Kata 'POST' "/api/v1/components/$PROBE/items" $itemA
Add-Row 'P2' 'Is hostedContentRef accepted on an item at create?' "POST /components/$PROBE/items" $r ''
$g = Invoke-Kata 'GET' "/api/v1/components/$PROBE/items/$A"
$obs = if ($g.Json) { "hostedContentRef=$($g.Json.hostedContentRef)  questions=$(@($g.Json.questions).Count)" } else { '' }
Add-Row 'P3' 'Is it stored and returned verbatim?' "GET  /components/$PROBE/items/$A" $g $obs

# ── P4/P5: is it patchable, and is that reversible? ─────────────────────────
Write-Step "`n[P4/P5] Q-A/Q-B — hostedContentRef PATCH and reversibility"
$r = Invoke-Kata 'PATCH' "/api/v1/components/$PROBE/items/$A" ([ordered]@{ hostedContentRef = $refAlt })
Add-Row 'P4' 'Is hostedContentRef patchable?' 'PATCH item {hostedContentRef}' $r ''
$g = Invoke-Kata 'GET' "/api/v1/components/$PROBE/items/$A"
$applied = if ($g.Json) { "applied=$($g.Json.hostedContentRef -eq $refAlt)  value=$($g.Json.hostedContentRef)" } else { '' }
Add-Row 'P4b' 'Did the PATCH actually take effect?' 'GET  item' $g $applied

$r = Invoke-Kata 'PATCH' "/api/v1/components/$PROBE/items/$A" ([ordered]@{ hostedContentRef = $null })
Add-Row 'P5' 'Can it be cleared to null? (rollback path)' 'PATCH item {hostedContentRef: null}' $r ''
$g = Invoke-Kata 'GET' "/api/v1/components/$PROBE/items/$A"
$cleared = if ($g.Json) { "value=$(if ($null -eq $g.Json.hostedContentRef) { '<null>' } else { $g.Json.hostedContentRef })" } else { '' }
Add-Row 'P5b' 'Did it clear?' 'GET  item' $g $cleared

$r = Invoke-Kata 'PATCH' "/api/v1/components/$PROBE/items/$A" ([ordered]@{ hostedContentRef = '' })
Add-Row 'P5c' "Does empty string clear it instead?" "PATCH item {hostedContentRef: ''}" $r ''
$r = Invoke-Kata 'PATCH' "/api/v1/components/$PROBE/items/$A" ([ordered]@{ hostedContentRef = $refA })
Add-Row 'P5d' 'Can it be restored?' 'PATCH item {hostedContentRef: <original>}' $r ''
$g = Invoke-Kata 'GET' "/api/v1/components/$PROBE/items/$A"
Add-Row 'P5e' 'Restored?' 'GET  item' $g $(if ($g.Json) { "value=$($g.Json.hostedContentRef)" } else { '' })

# ── P6/P7: THE ONE THAT MATTERS — are questions writable by PATCH? ──────────
Write-Step "`n[P6/P7] Q-C/Q-D — is questions[] applied by PATCH, or create-only?"
$r = Invoke-Kata 'PATCH' "/api/v1/components/$PROBE/items/$A" ([ordered]@{ questions = $Q3 })
Add-Row 'P6' 'Is questions[] applied by a narrow PATCH?' 'PATCH item {questions} 2 -> 3' $r ''
$g = Invoke-Kata 'GET' "/api/v1/components/$PROBE/items/$A"
$q = @($g.Json.questions)
Add-Row 'P6b' 'Did the questions actually change?' 'GET  item' $g ("count=$($q.Count) (expect 3)  types=" + (($q | ForEach-Object { $_.questionType }) -join ','))

# The shape send-metadata.ps1 actually sends: the whole item body minus uniqueKey.
$full = [ordered]@{}
foreach ($k in $itemA.Keys) { if ($k -ne 'uniqueKey') { $full[$k] = $itemA[$k] } }
$full['questions'] = $Q3
$r = Invoke-Kata 'PATCH' "/api/v1/components/$PROBE/items/$A" $full
Add-Row 'P6c' 'Does a FULL item PATCH apply questions? (sender shape)' 'PATCH item {full body}' $r ''
$g = Invoke-Kata 'GET' "/api/v1/components/$PROBE/items/$A"
$q = @($g.Json.questions)
Add-Row 'P6d' 'Did it?' 'GET  item' $g ("count=$($q.Count) (expect 3)")

$r = Invoke-Kata 'PATCH' "/api/v1/components/$PROBE/items/$A" ([ordered]@{ questions = @() })
Add-Row 'P7' 'Does questions: [] delete them, or no-op?' 'PATCH item {questions: []}' $r ''
$g = Invoke-Kata 'GET' "/api/v1/components/$PROBE/items/$A"
Add-Row 'P7b' 'Result' 'GET  item' $g ("count=$(@($g.Json.questions).Count)")

# ── P8: is uniqueKey writable at all? ───────────────────────────────────────
#
# ⚠️ 2026-09-11: the full-URL-IRI rename that used to live here has been REMOVED, and
# must not be added back. It returns 200, KATA stores the IRI, and the entity then
# cannot be addressed by ANY path form — escaped, raw, double-encoded or the old key
# all 404. It cannot be renamed back and it cannot be deleted. The first run of this
# script stranded a component in the LIVE unit exactly that way, because it renamed
# both the item and the component and then tried to DELETE them by their stale keys.
#
# Two fixes, both load-bearing: every rename is tracked in $A / $PROBE so cleanup
# always addresses the key the entity ACTUALLY has, and every rename here is now
# slug->slug or URN, both of which are reversible. The destructive URL-IRI cases are
# covered by probe-iri-component-key.ps1 and probe-iri-item-key.ps1, which run them
# inside a component that keeps its slug key so the parent DELETE can always cascade.
Write-Step "`n[P8] Q-E — uniqueKey in a PATCH body (slug -> slug only; see the note above)"
$renamed = "$PROBE-002"
$r = Invoke-Kata 'PATCH' "/api/v1/components/$PROBE/items/$A" ([ordered]@{ uniqueKey = $renamed })
Add-Row 'P8' 'Is uniqueKey accepted in an item PATCH (slug -> slug)?' 'PATCH item {uniqueKey: <slug>}' $r ''
$g = Invoke-Kata 'GET' "/api/v1/components/$PROBE/items/$renamed"
Add-Row 'P8b' 'Did the item move to the new key?' "GET  item/$renamed" $g ("renamed=" + ($g.Code -eq '200'))
if ($g.Code -eq '200') { $A = $renamed }   # keep cleanup pointed at the live key

# ── P10: component key, renamed and renamed BACK ───────────────────────────
Write-Step "`n[P10] Q-E — component uniqueKey (renamed back before cleanup)"
$compRenamed = "$PROBE-renamed"
$r = Invoke-Kata 'PATCH' "/api/v1/components/$PROBE" ([ordered]@{ uniqueKey = $compRenamed })
Add-Row 'P10' 'Is a component uniqueKey mutable by PATCH?' 'PATCH component {uniqueKey}' $r ''
$g = Invoke-Kata 'GET' "/api/v1/components/$compRenamed"
if ($g.Code -eq '200') { $PROBE = $compRenamed }     # cleanup follows the rename
Add-Row 'P10b' 'Did the component move to the new key?' 'GET  component' $g ("renamed=" + ($g.Code -eq '200'))
$r = Invoke-Kata 'PATCH' "/api/v1/components/$PROBE" ([ordered]@{ uniqueKey = $sug.Json.uniqueKey })
if ($r.Code -match '^2\d\d$' -and $sug.Json) { $PROBE = $sug.Json.uniqueKey }
Add-Row 'P10c' 'Renamed back?' 'PATCH component {uniqueKey: <original>}' $r "now=$PROBE"

# ── P11: URN key at create — path-safe, and reversible ─────────────────────
Write-Step "`n[P11] Q-F — URN as a uniqueKey at create (path-safe IRI)"
$urn = "urn:lomdot:metodica:720active:math:percent:02:probe"
$urnBody = [ordered]@{}
foreach ($k in $compBody.Keys) { $urnBody[$k] = $compBody[$k] }
$urnBody['uniqueKey'] = $urn
$urnBody['title'] = 'PROBE URN — safe to delete'
$r = Invoke-Kata 'POST' "/api/v1/content-units/$UnitKey/components" $urnBody
Add-Row 'P11' 'Is a URN accepted as a component key? (v2.5 p.11 allows URN)' 'POST component {uniqueKey: urn:…}' $r ''
$urnCreated = ($r.Code -match '^2\d\d$')

# ── cleanup ─────────────────────────────────────────────────────────────────
Write-Step "`n[cleanup]" 'Magenta'
if ($KeepEntities) {
    Write-Host "  -KeepEntities set — leaving $PROBE in place. DELETE IT MANUALLY." -ForegroundColor Red
} else {
    $r = Invoke-Kata 'DELETE' "/api/v1/components/$PROBE/items/$A"
    Add-Row 'C1' 'Delete probe item' "DELETE item/$A" $r ''
    $r = Invoke-Kata 'DELETE' "/api/v1/components/$PROBE"
    Add-Row 'C2' 'Delete probe component' 'DELETE component' $r ''
    if ($urnCreated) {
        $r = Invoke-Kata 'DELETE' "/api/v1/components/$([uri]::EscapeDataString($urn))"
        Add-Row 'C3' 'Delete URN probe component (escaped)' 'DELETE component (urn, %-escaped)' $r ''
        if ($r.Code -notmatch '^2\d\d$') {
            $r = Invoke-Kata 'DELETE' "/api/v1/components/$urn"
            Add-Row 'C3b' 'Delete URN probe component (raw)' 'DELETE component (urn, raw)' $r ''
        }
    }
    $g = Invoke-Kata 'GET' "/api/v1/components/$PROBE"
    Add-Row 'C4' 'Is the probe component gone?' 'GET  component' $g ("gone=" + ($g.Code -eq '404'))
}

# ── report ──────────────────────────────────────────────────────────────────
$lines = New-Object System.Collections.Generic.List[string]
$lines.Add("# KATA API probe — $UnitKey")
$lines.Add('')
$lines.Add("Run $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') against ``$BaseUrl`` with the catalogue key.")
$lines.Add("Throwaway component: ``$PROBE``. All probe entities are deleted at the end (see C-rows).")
$lines.Add('')
$lines.Add('| # | Question | Call | HTTP | Observed | Error |')
$lines.Add('|---|---|---|---|---|---|')
foreach ($row in $script:rows) {
    $lines.Add(('| {0} | {1} | `{2}` | {3} | {4} | {5} |' -f
        $row.Id, $row.Question, $row.Call, $row.Code, $row.Observed, $row.Error))
}
$lines.Add('')
$lines.Add('## How to read this')
$lines.Add('')
$lines.Add('- **P6/P6b** is the one that matters: if the PATCH returns 2xx but the GET still shows 2 questions, KATA accepts question writes and silently discards them — and every `updated=` line in `send-metadata.log` is meaningless for question content.')
$lines.Add('- **P4b/P5b** gate the item `hostedContentRef` work: it is only safe to populate if it is both patchable and clearable.')
$lines.Add('- **P8/P10** show that `uniqueKey` IS mutable by PATCH at both levels, contradicting `KATA-API.md:191,196` and `KATA-API-DETAILED.md:236-246`, which both document it as create-only.')
$lines.Add('- **P11** matters most: a URN has no `/`, so unlike a full URL it survives a path segment. It is a legal IRI under 720 v2.5 p.11 ("URL, או כ-URN"), which makes it the only form that satisfies the standard while keeping the entity addressable.')
$lines.Add('- The full-URL-IRI cases are deliberately NOT here — they strand the entity permanently. See `probe-iri-component-key.ps1` and `probe-iri-item-key.ps1`.')
[System.IO.File]::WriteAllText($OutFile, ($lines -join "`n"), (New-Object System.Text.UTF8Encoding($false)))

Write-Step "`nReport written to $OutFile" 'Green'
