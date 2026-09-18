# ストア提出用のzipを作る。配布に不要なファイルは入れない。
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

$items = @(
  'manifest.json',
  'retro.css',
  'bridge.js',
  'shadow.js',
  'overlay.js',
  'background.js',
  'popup.html',
  'popup.js',
  'icons',
  '_locales'
)

$version = (Get-Content manifest.json -Raw | ConvertFrom-Json).version
$stage = 'build/internet-old'
$zip = "build/internet-old-$version.zip"

if (Test-Path build) { Remove-Item build -Recurse -Force }
New-Item -ItemType Directory -Path $stage -Force | Out-Null
foreach ($i in $items) { Copy-Item $i -Destination $stage -Recurse }

Compress-Archive -Path "$stage/*" -DestinationPath $zip -Force
Write-Output "$zip ($((Get-Item $zip).Length) bytes)"
