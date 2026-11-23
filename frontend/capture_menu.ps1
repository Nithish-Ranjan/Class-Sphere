$target = "C:\Users\Nithish Ranjan\.gemini\antigravity\brain\1f4d65b0-8bb5-41ae-9f7e-845bece0349b\screenshots\faculty_15_mobile_menu_open_390.png"
if (Test-Path $target) { Remove-Item $target -Force }
$server = Start-Process node -ArgumentList "capture_server.cjs" -WorkingDirectory "C:\Users\Nithish Ranjan\.gemini\antigravity\scratch\classsphere\frontend" -PassThru
Start-Sleep -Seconds 2
$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
cmd /c """$chrome"" --headless --disable-gpu --virtual-time-budget=2500 --window-size=390,844 --screenshot=""$target"" ""http://127.0.0.1:4173/faculty/overview?demo=faculty&mobileMenu=open"""
Stop-Process -Id $server.Id -Force
Get-Item $target | Select-Object LastWriteTime, Length
