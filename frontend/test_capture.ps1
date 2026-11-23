$frontendDir = "C:\Users\Nithish Ranjan\.gemini\antigravity\scratch\classsphere\frontend"
$outputDir = "C:\Users\Nithish Ranjan\.gemini\antigravity\brain\1f4d65b0-8bb5-41ae-9f7e-845bece0349b\screenshots"
$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$target = Join-Path $outputDir "hod_01_review_desktop_1440.png"

$server = Start-Process node -ArgumentList "capture_server.cjs" -WorkingDirectory $frontendDir -PassThru
Start-Sleep -Seconds 2

& $chrome --headless --disable-gpu --virtual-time-budget=2500 --window-size="1440,1100" --screenshot="$target" "http://127.0.0.1:4173/hod/review?demo=hod"

Stop-Process -Id $server.Id -Force
Get-Item $target | Select-Object Name, Length
