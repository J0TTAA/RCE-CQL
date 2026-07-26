[CmdletBinding()]
param(
    [string]$Root
)

$ErrorActionPreference = "Stop"
if ([string]::IsNullOrWhiteSpace($Root)) {
    $Root = Split-Path -Parent $PSScriptRoot
}
$errors = [System.Collections.Generic.List[string]]::new()

function Read-RequiredFile {
    param([string]$RelativePath)

    $path = Join-Path $Root $RelativePath
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
        $errors.Add("Missing required file: $RelativePath")
        return ""
    }
    return Get-Content -LiteralPath $path -Raw
}

$requirements = Read-RequiredFile "docs/REQUIREMENTS.md"
$design = Read-RequiredFile "docs/DESIGN.md"
$tasks = Read-RequiredFile "docs/TASKS.md"
$traceability = Read-RequiredFile "docs/TRACEABILITY.md"

$requirementPattern = 'REQ-(?:F|I|D|NF)-\d{3}'
$definedRequirements = [regex]::Matches($requirements, "(?m)^\|\s*($requirementPattern)\s*\|") |
    ForEach-Object { $_.Groups[1].Value }
$duplicateRequirements = $definedRequirements | Group-Object | Where-Object Count -gt 1
foreach ($duplicate in $duplicateRequirements) {
    $errors.Add("Duplicate requirement id: $($duplicate.Name)")
}

$knownRequirements = [System.Collections.Generic.HashSet[string]]::new([string[]]$definedRequirements)
$referencedRequirements = [regex]::Matches("$design`n$tasks`n$traceability", $requirementPattern) |
    ForEach-Object Value |
    Sort-Object -Unique
foreach ($requirement in $referencedRequirements) {
    if (-not $knownRequirements.Contains($requirement)) {
        $errors.Add("Unknown requirement reference: $requirement")
    }
}

$taskRows = [regex]::Matches(
    $tasks,
    '(?m)^\|\s*(TASK-\d+\.\d+)\s*\|.*\|\s*(TODO|IN_PROGRESS|BLOCKED|REVIEW|DONE)\s*\|\s*$'
)
$taskIds = $taskRows | ForEach-Object { $_.Groups[1].Value }
$duplicateTasks = $taskIds | Group-Object | Where-Object Count -gt 1
foreach ($duplicate in $duplicateTasks) {
    $errors.Add("Duplicate task id: $($duplicate.Name)")
}

$inProgress = $taskRows | Where-Object { $_.Groups[2].Value -eq "IN_PROGRESS" }
if ($inProgress.Count -gt 1) {
    $errors.Add("Only one task may be IN_PROGRESS; found $($inProgress.Count)")
}

$requiredRootFiles = @(
    "README.md",
    "AGENTS.md",
    ".gitignore",
    "docs/COMPATIBILITY_MATRIX.md",
    "docs/DEVELOPMENT.md",
    "docs/WORKFLOW.md",
    "docs/RISK_REGISTER.md",
    "docs/work-orders/WO-0001-M0-ARCHITECTURE-SPIKE.md",
    "docs/work-orders/WO-0002-BACKEND-FOUNDATION.md"
)
foreach ($relativePath in $requiredRootFiles) {
    if (-not (Test-Path -LiteralPath (Join-Path $Root $relativePath) -PathType Leaf)) {
        $errors.Add("Missing project-control file: $relativePath")
    }
}

$markdownFiles = Get-ChildItem -LiteralPath $Root -Recurse -Filter "*.md" -File |
    Where-Object {
        $_.FullName -notmatch '[\\/](?:\.git|node_modules|dist|build|coverage)[\\/]'
    }
foreach ($markdownFile in $markdownFiles) {
    $markdown = Get-Content -LiteralPath $markdownFile.FullName -Raw
    $links = [regex]::Matches($markdown, '\[[^\]]+\]\(([^)]+)\)')
    foreach ($link in $links) {
        $target = $link.Groups[1].Value.Trim('<', '>')
        if ($target -match '^(?:https?://|mailto:|#)') {
            continue
        }
        $pathPart = $target.Split('#')[0]
        if ([string]::IsNullOrWhiteSpace($pathPart)) {
            continue
        }
        $resolvedTarget = Join-Path $markdownFile.DirectoryName $pathPart
        if (-not (Test-Path -LiteralPath $resolvedTarget)) {
            $relativeSource = $markdownFile.FullName.Substring($Root.Length).TrimStart('\', '/')
            $errors.Add("Broken local link in ${relativeSource}: $target")
        }
    }
}

$summary = [ordered]@{
    requirementsDefined = $definedRequirements.Count
    requirementReferences = $referencedRequirements.Count
    tasksDefined = $taskIds.Count
    tasksInProgress = $inProgress.Count
    markdownFilesChecked = $markdownFiles.Count
    errors = $errors.Count
}

$summary | ConvertTo-Json
if ($errors.Count -gt 0) {
    $errors | ForEach-Object { Write-Error $_ }
    exit 1
}

Write-Host "SDD validation passed."
