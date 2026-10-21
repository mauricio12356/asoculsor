param(
    [int]$Port = 5500,
    [switch]$AbrirNavegador
)

$ErrorActionPreference = 'Stop'
$root = [System.IO.Path]::GetFullPath($PSScriptRoot)
$rootPrefix = $root.TrimEnd([System.IO.Path]::DirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")

$mimeTypes = @{
    '.css' = 'text/css; charset=utf-8'
    '.html' = 'text/html; charset=utf-8'
    '.js' = 'application/javascript; charset=utf-8'
    '.json' = 'application/json; charset=utf-8'
    '.png' = 'image/png'
    '.svg' = 'image/svg+xml'
    '.txt' = 'text/plain; charset=utf-8'
}

try {
    $listener.Start()
} catch {
    Write-Error "No se pudo iniciar el sitio en http://localhost:$Port. Cierra otra aplicación que use ese puerto y vuelve a intentarlo."
    exit 1
}

$url = "http://localhost:$Port/"
Write-Host "ASOCULSOR disponible en $url"
Write-Host 'Mantener esta ventana abierta. Pulsa Ctrl+C para detener el servidor.'
if ($AbrirNavegador) {
    Start-Process $url
}

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $response = $context.Response

        try {
            if ($context.Request.HttpMethod -notin @('GET', 'HEAD')) {
                $response.StatusCode = 405
            } else {
                $relativePath = [Uri]::UnescapeDataString($context.Request.Url.AbsolutePath.TrimStart('/'))
                if ([string]::IsNullOrWhiteSpace($relativePath)) {
                    $relativePath = 'index.html'
                }

                $filePath = [System.IO.Path]::GetFullPath((Join-Path $root $relativePath))
                if (-not $filePath.StartsWith($rootPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
                    $response.StatusCode = 403
                } elseif (-not (Test-Path -LiteralPath $filePath -PathType Leaf)) {
                    $response.StatusCode = 404
                } else {
                    $response.StatusCode = 200
                    $extension = [System.IO.Path]::GetExtension($filePath).ToLowerInvariant()
                    if ($mimeTypes.ContainsKey($extension)) {
                        $response.ContentType = $mimeTypes[$extension]
                    } else {
                        $response.ContentType = 'application/octet-stream'
                    }

                    if ($context.Request.HttpMethod -eq 'GET') {
                        $content = [System.IO.File]::ReadAllBytes($filePath)
                        $response.ContentLength64 = $content.Length
                        $response.OutputStream.Write($content, 0, $content.Length)
                    }
                }
            }
        } catch {
            Write-Warning "No se pudo atender la solicitud: $($_.Exception.Message)"
            $response.StatusCode = 500
        } finally {
            $response.Close()
        }
    }
} finally {
    $listener.Stop()
    $listener.Close()
}
