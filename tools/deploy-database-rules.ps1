# Firebase Realtime Database kurallarini yukler. Ilk seferde tarayicide Google ile giris ister.
# Calistirma (PowerShell): cd "...\hesap-kitap"; .\tools\deploy-database-rules.ps1
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root
Write-Host "Proje: $root"
npx --yes firebase-tools@latest deploy --only database
