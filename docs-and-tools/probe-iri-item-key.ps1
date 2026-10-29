<#
.SYNOPSIS
    Does the "IRI key makes the entity unreachable" problem apply to ITEMS as well as
    components — and does a URN (an IRI with no slashes) escape it at either level?

.DESCRIPTION
    720 v2.5 p.11 requires a component's and an item's id to be an IRI, and says an IRI
    is "לרוב מיוצג ככתובת אינטרנט מלאה - URL, או כ-URN". The URL form has already been
    shown to strand a component permanently: every write path is
    /api/v1/components/{unique_key}, a PATH segment, and a URL carries '/'.

    A URN does not. `urn:lomdot:metodica:...` is a legal IRI under the same sentence of
    the standard and contains no slash at all, so it should survive a path segment. If it
    does, the standard can be satisfied WITHOUT losing API control — which is the outcome
    worth knowing before anyone touches the live unit.

    SAFETY. Everything happens inside a throwaway component that KEEPS ITS SLUG KEY for
    the whole run, so it is always deletable and always cascades. The component-level URN
    rename is attempted ONLY if the item-level URN test proved reversible first — so the
    run cannot strand anything the way the previous probe did.

.EXAMPLE
    pwsh -File docs-and-tools\probe-iri-item-key.ps1
#>
[CmdletBinding()]
param(
    [string] $UnitKey = 'methodica-math-percent-02',
    [string] $ApiKey,
    [string] $BaseUrl = 'https://kata.cet.ac.il'
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
if (-not $ApiKey) { Write-Host 'No API key.' -ForegroundColor Red; exit 1 }

function Invoke-Kata {
    param([string] $Method, [string] $Path, $Body)
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
function Say { param([string] $Id, [string] $What, $R, [string] $Obs)
    $col = if ("$($R.Code)" -match '^2\d\d$') { 'Green' } elseif ("$($R.Code)" -eq '—') { 'Cyan' } else { 'Yellow' }
    Write-Host ("  {0,-6} {1,-44} HTTP {2}  {3}" -f $Id, $What, $R.Code, $Obs) -ForegroundColor $col
}
$esc = { param($s) [uri]::EscapeDataString($s) }

# The whole-tree GET is the only read that needs no key in a URL.
function Get-Tree { (Invoke-Kata 'GET' "/api/v1/content-units/$UnitKey").Json }
function Find-Item {
    param([string] $CompKey, [string] $ItemKey)
    $t = Get-Tree
    $c = $t.components | Where-Object { $_.uniqueKey -eq $CompKey } | Select-Object -First 1
    if (-not $c) { return $null }
    return ($c.subContent | Where-Object { $_.uniqueKey -eq $ItemKey } | Select-Object -First 1)
}

Write-Host "=== probe: IRI vs URN as an ITEM key (and then a component key) ===" -ForegroundColor Cyan

# ── setup ───────────────────────────────────────────────────────────────────
$sug = Invoke-Kata 'GET' "/api/v1/content/next-unique-key?entityType=component&unitKey=$UnitKey"
$C   = if ($sug.Json -and $sug.Json.uniqueKey) { $sug.Json.uniqueKey } else { "$UnitKey-00097" }
$compBody = [ordered]@{
    uniqueKey = $C; title = 'PROBE item-key — safe to delete'; componentPurpose = 'instruction'
    isAssessment = $false; isRequired = $false; relativeDifficulty = 1; order = 97
    depthLevel = 'core-curriculum-basic'; cognitiveLevels = @('process-thinking')
    languages = @('Hebrew'); skills = @(); estimatedTimeInMinutes = 1
}
Say 'S1' 'create throwaway component (KEEPS its slug)' (Invoke-Kata 'POST' "/api/v1/content-units/$UnitKey/components" $compBody) $C

function New-Item2 {
    param([string] $Key, [int] $Order)
    Invoke-Kata 'POST' "/api/v1/components/$C/items" ([ordered]@{
        uniqueKey = $Key; title = "PROBE $Key"; informationToBot = 'probe'
        contentType = 'practice'; mediaFormat = 'text'; order = $Order
    })
}

# ── TEST 1: URN as an item key ──────────────────────────────────────────────
Write-Host "`n[1] URN as an ITEM key — is it path-safe and reversible?" -ForegroundColor Cyan
$I1 = "$C-001"
Say '1.0' 'create item (slug)' (New-Item2 $I1 1) $I1
$urnI = "urn:lomdot:metodica:720active:math:percent:02:$C-001"
Say '1.1' 'PATCH item uniqueKey -> URN' (Invoke-Kata 'PATCH' "/api/v1/components/$C/items/$I1" ([ordered]@{ uniqueKey = $urnI })) ''
$storedUrnI = $null -ne (Find-Item $C $urnI)
Say '1.2' 'stored in the tree as the URN?' @{Code='—'} "stored=$storedUrnI"
$curI = if ($storedUrnI) { $urnI } else { $I1 }
$g = Invoke-Kata 'GET' "/api/v1/components/$C/items/$(& $esc $curI)"
Say '1.3' 'GET item by %-escaped URN' $g ''
$gr = Invoke-Kata 'GET' "/api/v1/components/$C/items/$curI"
Say '1.4' 'GET item by raw URN' $gr ''
$r = Invoke-Kata 'PATCH' "/api/v1/components/$C/items/$(& $esc $curI)" ([ordered]@{ uniqueKey = $I1 })
Say '1.5' 'PATCH URN -> slug (rename back)' $r ''
$urnReversible = $null -ne (Find-Item $C $I1)
Say '1.6' 'REVERSIBLE?' @{Code='—'} "reversible=$urnReversible"
if ($urnReversible) { $curI = $I1 }

# ── TEST 2: full URL IRI as an item key ─────────────────────────────────────
Write-Host "`n[2] full URL IRI as an ITEM key" -ForegroundColor Cyan
$I2 = "$C-002"
Say '2.0' 'create item (slug)' (New-Item2 $I2 2) $I2
$iriI = "$IriBase$C/$I2/"
Say '2.1' 'PATCH item uniqueKey -> full IRI' (Invoke-Kata 'PATCH' "/api/v1/components/$C/items/$I2" ([ordered]@{ uniqueKey = $iriI })) ''
$storedIriI = $null -ne (Find-Item $C $iriI)
Say '2.2' 'stored in the tree as the IRI?' @{Code='—'} "stored=$storedIriI"
Say '2.3' 'GET item by %-escaped IRI' (Invoke-Kata 'GET' "/api/v1/components/$C/items/$(& $esc $iriI)") ''
Say '2.4' 'GET item by raw IRI'       (Invoke-Kata 'GET' "/api/v1/components/$C/items/$iriI") ''
Say '2.5' 'GET item by old slug'      (Invoke-Kata 'GET' "/api/v1/components/$C/items/$I2") ''
Say '2.6' 'PATCH back to slug (escaped)' (Invoke-Kata 'PATCH' "/api/v1/components/$C/items/$(& $esc $iriI)" ([ordered]@{ uniqueKey = $I2 })) ''
$iriItemReversible = $null -ne (Find-Item $C $I2)
Say '2.7' 'REVERSIBLE?' @{Code='—'} "reversible=$iriItemReversible"
Say '2.8' 'DELETE the IRI-keyed item directly' (Invoke-Kata 'DELETE' "/api/v1/components/$C/items/$(& $esc $iriI)") ''

# ── TEST 3: URN as a COMPONENT key — only if URN proved reversible ─────────
Write-Host "`n[3] URN as a COMPONENT key" -ForegroundColor Cyan
$curC = $C
if (-not $urnReversible) {
    Write-Host '  SKIPPED — a URN item key was not reversible, so renaming a component to a URN could strand it.' -ForegroundColor Red
} else {
    $urnC = "urn:lomdot:metodica:720active:math:percent:02:$C"
    Say '3.1' 'PATCH component uniqueKey -> URN' (Invoke-Kata 'PATCH' "/api/v1/components/$curC" ([ordered]@{ uniqueKey = $urnC })) ''
    $storedUrnC = ((Get-Tree).components | Where-Object { $_.uniqueKey -eq $urnC }) -ne $null
    Say '3.2' 'stored as the URN?' @{Code='—'} "stored=$storedUrnC"
    if ($storedUrnC) { $curC = $urnC }
    Say '3.3' 'GET component by %-escaped URN' (Invoke-Kata 'GET' "/api/v1/components/$(& $esc $curC)") ''
    Say '3.4' 'are its items still reachable?' (Invoke-Kata 'GET' "/api/v1/components/$(& $esc $curC)/items/$curI") ''
    Say '3.5' 'PATCH component URN -> slug' (Invoke-Kata 'PATCH' "/api/v1/components/$(& $esc $curC)" ([ordered]@{ uniqueKey = $C })) ''
    if (((Get-Tree).components | Where-Object { $_.uniqueKey -eq $C })) { $curC = $C }
    Say '3.6' 'REVERSIBLE?' @{Code='—'} "reversible=$($curC -eq $C)"
}

# ── cleanup: the component is slug-keyed unless test 3 stranded it ─────────
Write-Host "`n[cleanup]" -ForegroundColor Magenta
Write-Host "  component currently keyed: $curC"
foreach ($p in @((& $esc $curC), $curC)) {
    $r = Invoke-Kata 'DELETE' "/api/v1/components/$p"
    Say 'C' 'DELETE component' $r ''
    if ($r.Code -match '^2\d\d$') { break }
}
$left = (Get-Tree).components | Where-Object { $_.uniqueKey -eq $curC }
Say 'C!' 'GONE?' @{Code='—'} ("removed=" + ($null -eq $left))
if ($left) { Write-Host "  ⚠ LEFTOVER: $curC" -ForegroundColor Red }

Write-Host "`n--- verdict ---" -ForegroundColor Cyan
Write-Host "  item key = full URL IRI : stored=$storedIriI  reversible=$iriItemReversible"
Write-Host "  item key = URN          : stored=$storedUrnI  reversible=$urnReversible"
