
# HAMSTER.IO - Serveur local rapide (HTTP sur port 8080)
# Lance ce script puis ouvre http://localhost:8080 dans Chrome
# Pour installer la PWA depuis localhost: les 3 points > "Installer Hamster.io"

$port = 8080
$root = $PSScriptRoot
if (-not $root) { $root = Split-Path $MyInvocation.MyCommand.Path }

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()

Write-Host ""
Write-Host "  ========================================" -ForegroundColor Cyan
Write-Host "   HAMSTER.IO - Serveur local demarre !" -ForegroundColor Yellow
Write-Host "  ========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Ouvrez Chrome et allez sur :" -ForegroundColor White
Write-Host "   http://localhost:$port" -ForegroundColor Green
Write-Host ""
Write-Host "   Pour installer comme application :" -ForegroundColor White
Write-Host "   Cliquez sur les 3 points en haut a droite" -ForegroundColor Gray
Write-Host "   puis 'Installer Hamster.io'" -ForegroundColor Gray
Write-Host ""
Write-Host "   Appuyez Ctrl+C pour arreter le serveur." -ForegroundColor Red
Write-Host ""

$mimes = @{
  '.html' = 'text/html; charset=utf-8'
  '.css'  = 'text/css; charset=utf-8'
  '.js'   = 'application/javascript; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'
  '.png'  = 'image/png'
  '.ico'  = 'image/x-icon'
  '.webp' = 'image/webp'
}

while ($listener.IsListening) {
  try {
    $ctx = $listener.GetContext()
    $req = $ctx.Request
    $res = $ctx.Response

    $path = $req.Url.LocalPath
    if ($path -eq '/' -or $path -eq '') { $path = '/index.html' }

    $filePath = Join-Path $root $path.TrimStart('/')

    if (Test-Path $filePath -PathType Leaf) {
      $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
      $mime = if ($mimes.ContainsKey($ext)) { $mimes[$ext] } else { 'application/octet-stream' }
      $bytes = [System.IO.File]::ReadAllBytes($filePath)
      $res.ContentType = $mime
      $res.ContentLength64 = $bytes.Length
      # Service Worker needs this header
      if ($filePath -like '*sw.js') {
        $res.Headers.Add("Service-Worker-Allowed", "/")
        $res.Headers.Add("Cache-Control", "no-cache")
      }
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $res.StatusCode = 404
      $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $path")
      $res.OutputStream.Write($msg, 0, $msg.Length)
    }

    $res.OutputStream.Close()
  } catch {
    if ($_.Exception.Message -notlike '*thread abort*') {
      Write-Host "Erreur serveur: $_" -ForegroundColor Red
    }
  }
}

