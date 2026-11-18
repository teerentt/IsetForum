param([Parameter(Mandatory=$true)][string]$OutputPath, [Parameter(Mandatory=$true)][string]$Suffix)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.IO.Compression
$examplePath = Join-Path $PSScriptRoot '../../docs/examples/inscriptions-autorisees.xlsx'
$source = [System.IO.Compression.ZipFile]::OpenRead($examplePath)
$output = [System.IO.File]::Create($OutputPath)
$archive = New-Object System.IO.Compression.ZipArchive($output, [System.IO.Compression.ZipArchiveMode]::Create)
try {
    foreach ($entry in $source.Entries) {
        $inputStream = $entry.Open()
        $destination = $archive.CreateEntry($entry.FullName).Open()
        try {
            if ($entry.FullName -eq 'xl/sharedStrings.xml') {
                $reader = New-Object System.IO.StreamReader($inputStream)
                $xml = $reader.ReadToEnd()
                $xml = $xml.Replace('etudiant.exemple@isetforum.test', "etudiant.$Suffix@isetforum.test")
                $xml = $xml.Replace('prof.exemple@isetforum.test', "prof.$Suffix@isetforum.test")
                $writer = New-Object System.IO.StreamWriter($destination)
                try { $writer.Write($xml) } finally { $writer.Dispose(); $reader.Dispose() }
            } else { $inputStream.CopyTo($destination) }
        } finally { $inputStream.Dispose(); $destination.Dispose() }
    }
} finally { $archive.Dispose(); $output.Dispose(); $source.Dispose() }
