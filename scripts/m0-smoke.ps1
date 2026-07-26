[CmdletBinding()]
param(
    [string]$HapiBaseUrl = "http://localhost:8080/fhir",
    [string]$TranslatorBaseUrl = "http://localhost:8081",
    [string]$Root
)

$ErrorActionPreference = "Stop"
if ([string]::IsNullOrWhiteSpace($Root)) {
    $Root = Split-Path -Parent $PSScriptRoot
}
$timestamp = (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ")
$evidenceDir = Join-Path $Root "docs/evidence/M0/runs/$timestamp"
New-Item -ItemType Directory -Path $evidenceDir -Force | Out-Null

$summary = [ordered]@{
    runId = $timestamp
    startedAt = (Get-Date).ToUniversalTime().ToString("o")
    hapiBaseUrl = $HapiBaseUrl
    translatorBaseUrl = $TranslatorBaseUrl
    status = "running"
    checks = [ordered]@{}
}

function Save-Text {
    param([string]$Name, [string]$Content)
    [System.IO.File]::WriteAllText((Join-Path $evidenceDir $Name), $Content, [System.Text.UTF8Encoding]::new($false))
}

function Save-Json {
    param([string]$Name, $Value)
    Save-Text $Name ($Value | ConvertTo-Json -Depth 100)
}

try {
    $metadataResponse = Invoke-WebRequest -UseBasicParsing -Uri "$HapiBaseUrl/metadata" -Headers @{ Accept = "application/fhir+json" }
    Save-Text "capability-statement.json" $metadataResponse.Content
    $metadata = $metadataResponse.Content | ConvertFrom-Json
    $resourceTypes = @($metadata.rest.resource.type)
    $operations = @($metadata.rest.operation.name) + @($metadata.rest.resource.operation.name)
    $summary.checks.hapiMetadata = [ordered]@{
        status = "passed"
        httpStatus = [int]$metadataResponse.StatusCode
        fhirVersion = $metadata.fhirVersion
        softwareVersion = $metadata.software.version
        hasLibrary = $resourceTypes -contains "Library"
        hasPlanDefinition = $resourceTypes -contains "PlanDefinition"
        applyAdvertised = @($operations | Where-Object { $_ -match 'apply' }).Count -gt 0
    }

    $cqlPath = Join-Path $Root "spikes/m0/fixtures/cql/RceAdultPatient.cql"
    $cql = Get-Content -LiteralPath $cqlPath -Raw
    $translatorUri = "$TranslatorBaseUrl/cql/translator?annotations=true&locators=true&result-types=true&detailed-errors=true&strict=true"
    $translationResponse = Invoke-WebRequest -UseBasicParsing -Method Post -Uri $translatorUri -ContentType "application/cql" -Headers @{ Accept = "application/elm+json" } -Body $cql
    Save-Text "translated-elm.json" $translationResponse.Content
    $elm = $translationResponse.Content | ConvertFrom-Json
    $definitionNames = @($elm.library.statements.def.name)
    if ($elm.library.identifier.id -ne "RceAdultPatient" -or -not ($definitionNames -contains "Is Adult")) {
        throw "Translator returned ELM without the expected library or expression."
    }
    $summary.checks.cqlTranslation = [ordered]@{
        status = "passed"
        httpStatus = [int]$translationResponse.StatusCode
        libraryId = $elm.library.identifier.id
        libraryVersion = $elm.library.identifier.version
        expression = "Is Adult"
    }

    foreach ($fixtureName in @("patient-adult.json", "patient-minor.json")) {
        $fixturePath = Join-Path $Root "spikes/m0/fixtures/fhir/$fixtureName"
        $patientText = Get-Content -LiteralPath $fixturePath -Raw
        $patient = $patientText | ConvertFrom-Json
        $patientResponse = Invoke-WebRequest -UseBasicParsing -Method Put -Uri "$HapiBaseUrl/Patient/$($patient.id)" -ContentType "application/fhir+json" -Headers @{ Accept = "application/fhir+json" } -Body $patientText
        Save-Text "$($patient.id).response.json" $patientResponse.Content
        $summary.checks["patient:$($patient.id)"] = [ordered]@{
            status = "passed"
            httpStatus = [int]$patientResponse.StatusCode
            location = $patientResponse.Headers["Location"]
        }
    }

    $summary.status = "passed"
}
catch {
    $summary.status = "failed"
    $summary.error = [ordered]@{
        message = $_.Exception.Message
        type = $_.Exception.GetType().FullName
    }
    if ($null -ne $_.Exception.Response) {
        try {
            $responseStream = $_.Exception.Response.GetResponseStream()
            $reader = [System.IO.StreamReader]::new($responseStream)
            Save-Text "error-response.txt" $reader.ReadToEnd()
            $reader.Dispose()
        }
        catch {
            Save-Text "error-response-capture.txt" $_.Exception.Message
        }
    }
    Save-Text "error.txt" ($_ | Out-String)
}
finally {
    $summary.finishedAt = (Get-Date).ToUniversalTime().ToString("o")
    Save-Json "summary.json" $summary
    Write-Output ($summary | ConvertTo-Json -Depth 20)
}

if ($summary.status -ne "passed") {
    exit 1
}
