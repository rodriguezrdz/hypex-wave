$ErrorActionPreference = 'Stop'
$root = Join-Path $PSScriptRoot '..'
$invPath = Join-Path $root '_design\class-inventory.md'
$cssPath = Join-Path $root 'styles.css'
$htmlPath = Join-Path $root 'index.html'

function Test-Artifact([string]$t) {
  if ($t -match '[()''"?+|=]') { return $true }
  if ($t -match '^(c|cfg|m|r|t|S|statCls|roleColors)\.') { return $true }
  return $false
}

$inv = Get-Content -LiteralPath $invPath
# A linha dos tokens comeca com apostrofo (' · (c.status · ...) e fica apos o header '## Classes'
$classLineIdx = -1
for ($i = 0; $i -lt $inv.Count; $i++) {
  if ($inv[$i].TrimStart().StartsWith("'")) { $classLineIdx = $i; break }
}
if ($classLineIdx -lt 0) { throw 'Linha de classes nao encontrada no inventario' }
$rawLine = $inv[$classLineIdx].Trim()

$sep = [char]183
$tokens = $rawLine.Split($sep) | ForEach-Object { $_.Trim() } | Where-Object { $_.Length -gt 0 }
$classTokens = @($tokens | Where-Object { -not (Test-Artifact $_) })

$css = Get-Content -LiteralPath $cssPath -Raw

Write-Output ("Tokens de classe reais no inventario: " + $classTokens.Count)
$missing = @()
foreach ($t in $classTokens) {
  $needle = '.' + $t
  if ($css.IndexOf($needle, [System.StringComparison]::Ordinal) -lt 0) { $missing += $t }
}
Write-Output ("Classes SEM cobertura literal no CSS: " + $missing.Count)
foreach ($m in $missing) { Write-Output ("  FALTANDO: " + $m) }

# ---- IDs do inventario vs novo index.html ----
$idIdx = -1
for ($i = 0; $i -lt $inv.Count; $i++) { if ($inv[$i] -like '*IDs referenciados*') { $idIdx = $i + 1; break } }
$idRaw = $inv[$idIdx].Trim()
$ids = $idRaw.Split($sep) | ForEach-Object { $_.Trim() } | Where-Object { $_.Length -gt 0 }

# IDs criados dinamicamente pelas render functions do app.js (nunca existem no HTML estatico)
$dynamicOnly = @('addTestBtn','affTable','auditList','calGrid','calTitle','campGrid','creativesTbl','eventList','extratTbl','fnodes','fsvg','intGrid','kpiGrid','memberReport','prodContent','prodTable','recentSales','salesCount','salesFilterSel','salesKpis','salesTbl','teamTbl','testGrid')

$html = Get-Content -LiteralPath $htmlPath -Raw
$missingIds = @()
foreach ($i in $ids) {
  if ($dynamicOnly -contains $i) { continue }
  $needle = 'id="' + $i + '"'
  if ($html.IndexOf($needle, [System.StringComparison]::Ordinal) -lt 0) { $missingIds += $i }
}
Write-Output ("IDs AUSENTES no novo index.html (excluindo criacao dinamica do app.js): " + $missingIds.Count)
foreach ($m in $missingIds) { Write-Output ("  ID FALTANTE: " + $m) }

# ---- Handlers inline criticos (aspas duplas fora, simples dentro — como no arquivo real) ----
$criticalHandlers = @(
  'onkeydown="if(event.key===&#39;Enter&#39;)doLogin()"',
  'onclick="doGLogin()"',
  'onclick="toggleSignup()"',
  'onclick="doResetPwd()"',
  'onclick="navTo(&#39;financial&#39;)"'
)
# Usar aspas simples literais dentro de strings single-quoted dobradas
$h1 = 'onkeydown="if(event.key===' + "''" + 'Enter' + "''" + ')doLogin()"'.Replace("''","'")
# Construir de forma explicita e segura:
$q = [char]39   # '
$d = [char]34   # "
function InlineHandler([string]$attr, [string]$expr) {
  return 'on' + $attr + '=' + [string]$d + $expr.Replace('*', $q) + [string]$d
}
$critical = @(
  (InlineHandler 'keydown'  'if(event.key===*Enter*)doLogin()'),
  (InlineHandler 'click'    'doGLogin()'),
  (InlineHandler 'click'    'toggleSignup()'),
  (InlineHandler 'click'    'doResetPwd()'),
  (InlineHandler 'click'    'navTo(*financial*)'),
  (InlineHandler 'click'    'nav(this,*dashboard*)'),
  (InlineHandler 'click'    'toggleSidebar()'),
  (InlineHandler 'click'    'closeSidebar()'),
  (InlineHandler 'click'    'markAllSeen(event)'),
  (InlineHandler 'click'    'toggleAI()'),
  (InlineHandler 'click'    'doLogout()'),
  (InlineHandler 'click'    'closeM(*taskmod*)'),
  (InlineHandler 'click'    'addTask()'),
  (InlineHandler 'click'    'addEvent()'),
  (InlineHandler 'click'    'addProduct()'),
  (InlineHandler 'click'    'addCampaign()'),
  (InlineHandler 'click'    'sendInvite()'),
  (InlineHandler 'keydown'  'if(event.key===*Enter*)addTask()'),
  (InlineHandler 'click'    'createFunnel(*Emagrecimento*)'),
  (InlineHandler 'click'    'addTransaction()'),
  (InlineHandler 'click'    'addCreative()'),
  (InlineHandler 'click'    'addRole()'),
  (InlineHandler 'click'    'mobileNav(*dashboard*,this)'),
  (InlineHandler 'click'    'sendAI()')
)
$missH = @()
foreach ($h in $critical) {
  if ($html.IndexOf($h, [System.StringComparison]::Ordinal) -lt 0) { $missH += $h }
}
Write-Output ("Handlers inline criticos ausentes: " + $missH.Count)
foreach ($m in $missH) { Write-Output ("  HANDLER FALTANTE: " + $m) }

$appPos = $html.IndexOf('<script src="app.js"></script>')
$fxPos = $html.IndexOf('<script src="fx.js"></script>')
Write-Output ("fx.js presente e apos app.js: " + (($fxPos -gt $appPos) -and ($fxPos -gt 0)))
Write-Output ("theme-color #04060B: " + $html.Contains('content="#04060B"'))

$cssLines = (Get-Content -LiteralPath $cssPath).Count
$htmlLines = (Get-Content -LiteralPath $htmlPath).Count
Write-Output ("styles.css linhas: " + $cssLines)
Write-Output ("index.html linhas: " + $htmlLines)
