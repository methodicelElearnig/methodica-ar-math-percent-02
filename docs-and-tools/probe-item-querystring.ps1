<#
.SYNOPSIS
    Can an item whose uniqueKey is a full URL IRI still be managed through the
    QUERY-STRING route — `/api/v1/components/{unique_key}/item?itemKey=…` — rather
    than the path route `/items/{item_key}`?

.DESCRIPTION
    This settles a mistake in my earlier probes. They only ever exercised
    `/components/{k}/items/{item_key}`, where the item key is a PATH segment, and
    concluded that an IRI item key strands the item exactly as it strands a component.

    But the live spec also exposes a SINGULAR `/item` route whose key is a query
    parameter:

        GET    /api/v1/components/{unique_key}/item?itemKey=…
        PATCH  /api/v1/components/{unique_key}/item?itemKey=…
        DELETE /api/v1/components/{unique_key}/item?itemKey=…

    A query parameter has no problem carrying '/' once percent-encoded. If that route
    works, an item CAN hold a full IRI and remain fully manageable — which is what the
    KATA team said, and which would make the item level a solved problem already.

    The component level is unaffected either way: `{unique_key}` is a path segment on
    every component route, with no query-string alternative.

    SAFETY: throwaway component, which keeps its slug key throughout so the parent
    DELETE can always cascade. Nothing live is touched.

.EXAMPLE
    pwsh -File docs-and-tools\probe-item-querystring.ps1
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
    Write-Host ("  {0,-6} {1,-46} HTTP {2}  {3}" -f $Id, $What, $R.Code, $Obs) -ForegroundColor $col
}
$enc = { param($s) [uri]::EscapeDataString($s) }
function Get-Tree { (Invoke-Kata 'GET' "/api/v1/content-units/$UnitKey").Json }
function Find-Item { param($CompKey, $ItemKey)
    $c = (Get-Tree).components | Where-Object { $_.uniqueKey -eq $CompKey } | Select-Object -First 1
    if (-not $c) { return $null }
    return ($c.subContent | Where-Object { $_.uniqueKey -eq $ItemKey } | Select-Object -First 1)
}

Write-Host "=== probe: the query-string /item route vs an IRI item key ===" -ForegroundColor Cyan

$sug = Invoke-Kata 'GET' "/api/v1/content/next-unique-key?entityType=component&unitKey=$UnitKey"
$C   = if ($sug.Json -and $sug.Json.uniqueKey) { $sug.Json.uniqueKey } else { "$UnitKey-00096" }
Say 'S1' 'create throwaway component (keeps its slug)' (Invoke-Kata 'POST' "/api/v1/content-units/$UnitKey/components" ([ordered]@{
    uniqueKey = $C; title = 'PROBE querystring — safe to delete'; componentPurpose = 'instruction'
    isAssessment = $false; isRequired = $false; relativeDifficulty = 1; order = 96
    depthLevel = 'core-curriculum-basic'; cognitiveLevels = @('process-thinking')
    languages = @('Hebrew'); skills = @(); estimatedTimeInMinutes = 1 })) $C

$slug = "$C-001"
Say 'S2' 'create item (slug key)' (Invoke-Kata 'POST' "/api/v1/components/$C/items" ([ordered]@{
    uniqueKey = $slug; title = 'PROBE item'; informationToBot = 'probe'
    contentType = 'practice'; mediaFormat = 'text'; order = 1 })) $slug

# Baseline: does the query-string route work at all, with an ordinary slug?
Write-Host "`n[0] baseline — does /item?itemKey= work with a plain slug?" -ForegroundColor Cyan
Say '0' 'GET /item?itemKey=<slug>' (Invoke-Kata 'GET' "/api/v1/components/$C/item?itemKey=$(& $enc $slug)") ''

# Now make the key a full URL IRI.
Write-Host "`n[1] set the item key to a full URL IRI" -ForegroundColor Cyan
$IRI = "$IriBase$C/$slug/"
Say '1' 'PATCH /items/<slug> {uniqueKey: <IRI>}' (Invoke-Kata 'PATCH' "/api/v1/components/$C/items/$slug" ([ordered]@{ uniqueKey = $IRI })) ''
$stored = $null -ne (Find-Item $C $IRI)
Say '1b' 'stored as the IRI?' @{Code='—'} "stored=$stored"

Write-Host "`n[2] PATH route (what my earlier probes tested)" -ForegroundColor Cyan
Say '2a' 'GET /items/<%-escaped IRI>' (Invoke-Kata 'GET' "/api/v1/components/$C/items/$(& $enc $IRI)") ''
Say '2b' 'GET /items/<raw IRI>'       (Invoke-Kata 'GET' "/api/v1/components/$C/items/$IRI") ''

Write-Host "`n[3] QUERY-STRING route — the one I failed to test" -ForegroundColor Cyan
$g = Invoke-Kata 'GET' "/api/v1/components/$C/item?itemKey=$(& $enc $IRI)"
Say '3a' 'GET /item?itemKey=<%-encoded IRI>' $g $(if ($g.Json) { "title=$($g.Json.title)  key=$($g.Json.uniqueKey)" } else { '' })
Say '3b' 'PATCH /item?itemKey=<IRI> {title}' (Invoke-Kata 'PATCH' "/api/v1/components/$C/item?itemKey=$(& $enc $IRI)" ([ordered]@{ title = 'PROBE item RENAMED via querystring' })) ''
$g = Invoke-Kata 'GET' "/api/v1/components/$C/item?itemKey=$(& $enc $IRI)"
Say '3c' 'did the PATCH apply?' $g $(if ($g.Json) { "title=$($g.Json.title)" } else { '' })

Write-Host "`n[4] REVERSIBILITY — rename the IRI key back to a slug via the query route" -ForegroundColor Cyan
Say '4' 'PATCH /item?itemKey=<IRI> {uniqueKey: <slug>}' (Invoke-Kata 'PATCH' "/api/v1/components/$C/item?itemKey=$(& $enc $IRI)" ([ordered]@{ uniqueKey = $slug })) ''
$back = $null -ne (Find-Item $C $slug)
Say '4b' 'REVERSIBLE?' @{Code='—'} "reversible=$back"

Write-Host "`n[5] can it be DELETED while IRI-keyed?" -ForegroundColor Cyan
if ($back) {
    Say '5' 'PATCH back to the IRI, to test DELETE' (Invoke-Kata 'PATCH' "/api/v1/components/$C/items/$slug" ([ordered]@{ uniqueKey = $IRI })) ''
    Say '5b' 'DELETE /item?itemKey=<IRI>' (Invoke-Kata 'DELETE' "/api/v1/components/$C/item?itemKey=$(& $enc $IRI)") ''
    Say '5c' 'gone from the tree?' @{Code='—'} ("removed=" + ($null -eq (Find-Item $C $IRI)))
}

Write-Host "`n[cleanup]" -ForegroundColor Magenta
Say 'C' 'DELETE component (cascades)' (Invoke-Kata 'DELETE' "/api/v1/components/$C") ''
Say 'C!' 'gone?' @{Code='—'} ("removed=" + ($null -eq ((Get-Tree).components | Where-Object { $_.uniqueKey -eq $C })))

Write-Host "`n--- verdict ---" -ForegroundColor Cyan
Write-Host "  If [3a] is 200, an IRI item key IS manageable — via ?itemKey=, not via the path."
Write-Host "  The component level has no such alternative: {unique_key} is a path segment on every route."
