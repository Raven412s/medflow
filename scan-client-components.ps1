$root = Get-Location
$outputFile = "CLIENT_COMPONENTS_REPORT.md"

"# Client Components Report" | Out-File $outputFile
"" | Out-File $outputFile -Append
"Generated: $(Get-Date)" | Out-File $outputFile -Append
"" | Out-File $outputFile -Append

Get-ChildItem -Path . -Recurse -Filter "*Client.tsx" |
ForEach-Object {

    $relativePath = Resolve-Path $_.FullName -Relative
    $content = Get-Content $_.FullName

    $lineCount = $content.Count

    $importCount = (
        $content |
        Select-String "^import "
    ).Count

    $usesRecharts = (
        $content |
        Select-String "recharts"
    ).Count -gt 0

    $usesMotion = (
        $content |
        Select-String "framer-motion"
    ).Count -gt 0

    $usesTable = (
        $content |
        Select-String "Table"
    ).Count -gt 0

    @"
## $($_.BaseName)

- Path: `$relativePath`
- Lines: $lineCount
- Imports: $importCount
- Uses Recharts: $usesRecharts
- Uses Framer Motion: $usesMotion
- Uses Table UI: $usesTable

"@ | Out-File $outputFile -Append
}

Write-Host ""
Write-Host "====================================="
Write-Host "Report Generated:"
Write-Host $outputFile
Write-Host "====================================="

