# 本番 DB と車の写真を、保存先の日付フォルダへ書き出す
# 書き出したファイルには利用者のデータが含まれるため、保存先はリポジトリやクラウドの共有フォルダの外を推奨

param(
  [string]$Destination = (Join-Path ([Environment]::GetFolderPath("MyDocuments")) "milenote\backups")
)

$repo = Split-Path $PSScriptRoot -Parent
$base = [System.IO.Path]::GetFullPath($Destination)

# リポジトリ内に書き出すと git add で利用者のデータを公開してしまうため、実行前に止める
$repoPrefix = $repo.TrimEnd("\") + "\"
if (($base + "\").StartsWith($repoPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
  Write-Host "Failed: The destination is inside the repository ($base). Choose a folder outside it." -ForegroundColor Red
  exit 1
}

$dir = Join-Path $base (Get-Date -Format "yyyy-MM-dd")
# 同じ日に再実行しても前回分を上書きしないよう、時刻付きの別フォルダにする
if (Test-Path $dir) {
  $dir = Join-Path $base (Get-Date -Format "yyyy-MM-dd_HHmmss")
}

function Stop-Backup([string]$message) {
  Write-Host ""
  Write-Host "Failed: $message" -ForegroundColor Red
  if (Test-Path $dir) {
    Write-Host "Partial files remain. They are incomplete, so do not use them for restoring: $dir" -ForegroundColor Yellow
  }
  exit 1
}

# db dump は Docker の中で pg_dump を動かすため、Docker Desktop が起動していないと失敗する
docker info *> $null
if ($LASTEXITCODE -ne 0) {
  Stop-Backup "Docker Desktop is not running. Start it and run this again."
}

# リンク済みプロジェクトの情報（supabase/.temp）と、リポジトリに入っている版の Supabase CLI を使うため、リポジトリで実行する
Set-Location $repo

# ファイアウォールなどで DB のポートへの接続が遮断されていると、db dump はエラーを出さずに止まり続けるため、先に接続できるか確かめる
$poolerUrl = Get-Content "$repo\supabase\.temp\pooler-url" -ErrorAction SilentlyContinue
if ($poolerUrl -match '@([^:/]+):(\d+)') {
  $dbHost = $Matches[1]
  $dbPort = [int]$Matches[2]
  Write-Host "Checking the database connection..."
  $reachable = Test-NetConnection $dbHost -Port $dbPort -InformationLevel Quiet -WarningAction SilentlyContinue
  if (-not $reachable) {
    Stop-Backup "Cannot connect to the database (${dbHost}:${dbPort}). A firewall or proxy may block outbound connections to this port. Run this again on a network that allows them."
  }
}

New-Item -ItemType Directory -Force $dir | Out-Null

Write-Host "Destination: $dir"
Write-Host ""

Write-Host "[1/3] Dumping the schema..." -ForegroundColor Cyan
npx supabase db dump --linked -f "$dir\schema.sql"
if ($LASTEXITCODE -ne 0) { Stop-Backup "Could not dump the schema." }

Write-Host "[2/3] Dumping the data..." -ForegroundColor Cyan
npx supabase db dump --linked --data-only -f "$dir\data.sql"
if ($LASTEXITCODE -ne 0) { Stop-Backup "Could not dump the data." }

Write-Host "[3/3] Copying the car photos..." -ForegroundColor Cyan
# storage cp は保存先の "C:" をコピー元の "ss:" と同じ URL のスキームとして解釈して失敗するため、リポジトリからの相対パスで渡す
$storageDst = [System.IO.Path]::GetRelativePath($repo, "$dir\storage")
npx supabase storage cp -r ss:///cars "$storageDst" --linked --experimental
if ($LASTEXITCODE -ne 0) { Stop-Backup "Could not copy the car photos." }

$dataFile = Get-Item "$dir\data.sql" -ErrorAction SilentlyContinue
if (-not $dataFile -or $dataFile.Length -eq 0) {
  Stop-Backup "data.sql is empty."
}
$imageCount = @(Get-ChildItem "$dir\storage" -Recurse -File -ErrorAction SilentlyContinue).Count

Write-Host ""
Write-Host "Backup completed" -ForegroundColor Green
Write-Host "  data.sql: $([math]::Round($dataFile.Length / 1KB, 1)) KB"
Write-Host "  Photos: $imageCount"
Write-Host "  Destination: $dir"
