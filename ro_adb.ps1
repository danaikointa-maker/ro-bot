#!/bin/env bash
# Windows PowerShell wrapper for ADB commands
# Usage: .\ro_adb.ps1 [deviceId] [command]

param(
    [string]$DeviceId = "",
    [string]$Command = "devices"
)

# Check ADB
$adbPath = Get-Command adb -ErrorAction SilentlyContinue
if (-not $adbPath) {
    Write-Host "ADB not found! Install from: https://developer.android.com/studio/releases/platform-tools"
    Write-Host "Or add C:\platform-tools to PATH"
    exit 1
}

# If device specified, target it
$target = if ($DeviceId) { "-s $DeviceId" } else { "" }

Write-Host "=== RO Bot ADB Command ==="
Write-Host "Device: $DeviceId"
Write-Host "Command: $Command"
Write-Host ""

# Execute
$cmdStr = "adb $target $Command"
Write-Host "Running: $cmdStr"
Invoke-Expression $cmdStr

# Special commands for RO Bot
if ($Command -eq "screen_size") {
    Write-Host "Screen size detected. Update your dashboard config."
}

if ($Command -eq "screenshot") {
    Write-Host "Screenshot saved. Refresh web dashboard to see."
}

Write-Host "=== Done ==="
