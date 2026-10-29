<#
.SYNOPSIS
    Can a component's uniqueKey ("מזהה רכיב") be a full IRI, as 720 v2.5 p.11 requires —
    and if it is set, can it be set BACK?

.DESCRIPTION
    Runs entirely on a throwaway component. The live unit is never touched.

    The first probe (probe-kata-api.ps1) established that KATA accepts an IRI as a key
    and stores it: the orphan it left behind carried
    `https://lomdot.education.gov.il/.../probe/item-a/` as its item uniqueKey, visible in
    the whole-tree GET. What it did NOT establish is the only question that matters
    before doing this to a live component:

        once a component's key is an IRI, can it still be addressed at all?

    Every write path is `/api/v1/components/{unique_key}` — a PATH segment. A raw IRI
    carries `/`, which cannot survive there, and most ASGI servers decode %2F before
    routing, so percent-encoding may not rescue it either. If neither form addresses the
    component, the change is IRREVERSIBLE and the only exit is deleting the component,
    which on a live unit would take its items, its statements' target and every learner's
    resume document with it.

    So this script asks, in order:
      1  Does PATCH set a component uniqueKey to a full IRI at all?
      2  Does the whole-tree GET then show the IRI?
      3  Can the component be addressed by the %-escaped IRI?  (…and by the raw IRI?)
      4  CAN IT BE RENAMED BACK to a slug?          <- the reversibility gate
      5  Do its items remain reachable?
      6  Does a URN key behave better? (no '/', so it is path-safe, and still an IRI)

.EXAMPLE
    pwsh -File docs-and-tools\probe-iri-component-key.ps1
#>
[CmdletBinding()]
param(
    [string] $UnitKey = 'methodica-math-percent-02',
    [string] $ApiKey,
    [string] $BaseUrl = 'https://kata.cet.ac.il',
    [switch] $DryRun
)

$ErrorActionPreference = 'Stop'
$RepoRoot   = Split-Path $PSScriptRoot -Parent
$ApiKeyFile = Join-Path $RepoRoot 'kata-api-key.txt'
$IriBase    = 'https://lomdot.education.gov.il/metodica/720active/math/percent/02/'

function Resolve-ApiKey {
    if ($ApiKey)           { return $ApiKey.Trim() }
    if ($env:KATA_API_KEY) { return $env:KATA_API_KEY.Trim() }
    if (Test-Path $ApiKeyFile) { return ((Get-Content -Raw -Path $ApiKeyFile -Encoding UTF8) -replace '\s', '') }
    return ''
}
$ApiKey = Resolve-ApiKey
if (-not $ApiKey -and -not $DryRun) { Write-Host 'No API key.' -ForegroundColor Red; exit 1 }

function Invoke-Kata {
    param([string] $Method, [string] $Path, $Body)
    if ($DryRun) { Write-Host "DRY-RUN $Method $BaseUrl$Path"; return @{ Code = '000'; Json = $null; Body = '' } }
    $inF = [System.IO.Path]::GetTempFileName(); $outF = [System.IO.Path]::GetTempFileName()
    try {
        $a = @('-sS', '-X', $Method, "$BaseUrl$Path", '-H', "X-API-Key: $ApiKey", '-o', $outF, '-w', '%{http_code}')
        if ($null -ne $Body) {
            [System.IO.File]::WriteAllText($inF, ($Body | ConvertTo-Json -Depth 12), (New-Object System.Text.UTF8Encoding($false)))
            $a += @('-H', 'Content-Type: application/json; charset=utf-8', '--data-binary', "@$inF")
        }
        $code = (& curl.exe @a)
        $t = ''; if (Test-Path $outF) { $t = [System.IO.File]::ReadAllText($outF, [System.Text.Encoding]::UTF8) }
        $j = $null; if ($t) { try { $j = $t | ConvertFrom-Json } catch {} }
        return @{ Code = "$code".Trim(); Json = $j; Body = $t }
    } finally { Remove-Item $inF, $outF -ErrorAction SilentlyContinue }
}

$results = New-Object System.Collections.Generic.List[object]
function Say {
    param([string] $Id, [string] $What, $R, [string] $Observed)
    $results.Add([pscustomobject]@{ Id = $Id; What = $What; Code = $R.Code; Observed = $Observed })
    $col = if ($R.Code -match '^2\d\d$') { 'Green' } elseif ($R.Code -eq '000') { 'Gray' } else { 'Yellow' }
    Write-Host ("  {0,-5} {1,-46} HTTP {2}  {3}" -f $Id, $What, $R.Code, $Observed) -ForegroundColor $col
}

# Look the component up in the whole-tree GET — the one read path that never needs the
# key in a URL, and therefore the only one that still works once the key is an IRI.
function Find-InTree {
    param([string] $Key)
    $t = Invoke-Kata 'GET' "/api/v1/content-units/$UnitKey"
    if (-not $t.Json) { return $null }
    return ($t.Json.components | Where-Object { $_.uniqueKey -eq $Key } | Select-Object -First 1)
}

Write-Host "=== probe: IRI as a component uniqueKey ===  unit=$UnitKey" -ForegroundColor Cyan

# ── setup: throwaway component with one item ────────────────────────────────
$sug   = Invoke-Kata 'GET' "/content/next-unique-key?entityType=component&unitKey=$UnitKey"
$PROBE = if ($sug.Json -and $sug.Json.uniqueKey) { $sug.Json.uniqueKey } else { "$UnitKey-00098" }
$comp  = [ordered]@{
    uniqueKey = $PROBE; title = 'PROBE IRI-KEY — safe to delete'; componentPurpose = 'instruction'
    isAssessment = $false; isRequired = $false; relativeDifficulty = 1; order = 98
    depthLevel = 'core-curriculum-basic'; cognitiveLevels = @('process-thinking')
    languages = @('Hebrew'); skills = @(); estimatedTimeInMinutes = 1
}
Say 'S1' 'create throwaway component' (Invoke-Kata 'POST' "/api/v1/content-units/$UnitKey/components" $comp) $PROBE
$item = [ordered]@{
    uniqueKey = "$PROBE-001"; title = 'PROBE item'; informationToBot = 'probe'
    contentType = 'practice'; mediaFormat = 'text'; hostedContentRef = "$($IriBase)probe/i/"; order = 1
}
Say 'S2' 'create one item under it' (Invoke-Kata 'POST' "/api/v1/components/$PROBE/items" $item) "$PROBE-001"

# $current tracks the key the component ACTUALLY has, so cleanup cannot be left
# pointing at a stale one — the bug that orphaned an entity in the first probe.
$current = $PROBE
$IRI     = "$($IriBase)$PROBE/"
$esc     = [uri]::EscapeDataString($IRI)

# ── 1) set the key to a full IRI ────────────────────────────────────────────
Write-Host "`n[1] PATCH uniqueKey -> full IRI" -ForegroundColor Cyan
$r = Invoke-Kata 'PATCH' "/api/v1/components/$current" ([ordered]@{ uniqueKey = $IRI })
Say '1' 'PATCH {uniqueKey: <full IRI>}' $r ''
$inTree = Find-InTree $IRI
Say '2' 'does the tree show the IRI as the key?' @{Code='—'} ("stored=" + ($null -ne $inTree))
if ($inTree) { $current = $IRI }

# ── 3) can it be addressed? ─────────────────────────────────────────────────
Write-Host "`n[3] is it addressable once the key is an IRI?" -ForegroundColor Cyan
Say '3a' 'GET /components/<%-escaped IRI>' (Invoke-Kata 'GET' "/api/v1/components/$esc") ''
Say '3b' 'GET /components/<raw IRI>'       (Invoke-Kata 'GET' "/api/v1/components/$IRI") ''
Say '3c' 'GET /components/<old slug>'      (Invoke-Kata 'GET' "/api/v1/components/$PROBE") ''

# ── 4) THE GATE: can it be renamed back? ────────────────────────────────────
Write-Host "`n[4] REVERSIBILITY — can it be renamed back to a slug?" -ForegroundColor Cyan
$back = $false
foreach ($form in @(@{n='%-escaped'; p=$esc}, @{n='raw'; p=$IRI})) {
    if ($back) { break }
    $r = Invoke-Kata 'PATCH' "/api/v1/components/$($form.p)" ([ordered]@{ uniqueKey = $PROBE })
    Say "4-$($form.n)" "PATCH via $($form.n) path -> slug" $r ''
    if (Find-InTree $PROBE) { $back = $true; $current = $PROBE }
}
Say '4' 'RENAMED BACK?' @{Code='—'} ("reversible=" + $back)

# ── 5) items still reachable? ───────────────────────────────────────────────
Write-Host "`n[5] are its items still reachable?" -ForegroundColor Cyan
$c = Find-InTree $current
Say '5' 'items visible in the tree' @{Code='—'} ("count=" + @($c.subContent).Count)

# ── 6) URN — the path-safe IRI ──────────────────────────────────────────────
Write-Host "`n[6] URN as the key (an IRI with no '/')" -ForegroundColor Cyan
$urn = "urn:lomdot:metodica:720active:math:percent:02:$PROBE"
$r = Invoke-Kata 'PATCH' "/api/v1/components/$current" ([ordered]@{ uniqueKey = $urn })
Say '6a' 'PATCH {uniqueKey: <URN>}' $r ''
if (Find-InTree $urn) { $current = $urn }
Say '6b' 'GET /components/<URN>' (Invoke-Kata 'GET' "/api/v1/components/$([uri]::EscapeDataString($urn))") ''
$r = Invoke-Kata 'PATCH' "/api/v1/components/$([uri]::EscapeDataString($urn))" ([ordered]@{ uniqueKey = $PROBE })
Say '6c' 'PATCH URN -> slug (reversible?)' $r ''
if (Find-InTree $PROBE) { $current = $PROBE }

# ── cleanup, against the key the component ACTUALLY has ─────────────────────
Write-Host "`n[cleanup]" -ForegroundColor Magenta
Write-Host "  component is currently keyed: $current"
foreach ($p in @([uri]::EscapeDataString($current), $current)) {
    $r = Invoke-Kata 'DELETE' "/api/v1/components/$p"
    Say 'C' "DELETE /components/<$(if ($p -eq $current) { 'raw' } else { 'escaped' })>" $r ''
    if ($r.Code -match '^2\d\d$') { break }
}
$still = Find-InTree $current
Say 'C!' 'GONE?' @{Code='—'} ("removed=" + ($null -eq $still))
if ($still) { Write-Host "  ⚠ LEFTOVER — delete component '$current' manually." -ForegroundColor Red }

Write-Host "`n--- verdict ---" -ForegroundColor Cyan
$stored = ($results | Where-Object Id -eq '2').Observed
$rev    = ($results | Where-Object Id -eq '4').Observed
Write-Host "  IRI accepted and stored : $stored"
Write-Host "  reversible              : $rev"
Write-Host "  -> if reversible=False, setting this on a live component CANNOT BE UNDONE." -ForegroundColor Yellow
