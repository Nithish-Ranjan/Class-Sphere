$outputDir = "C:\Users\Nithish Ranjan\.gemini\antigravity\brain\1f4d65b0-8bb5-41ae-9f7e-845bece0349b\screenshots"
if (!(Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$frontendDir = "C:\Users\Nithish Ranjan\.gemini\antigravity\scratch\classsphere\frontend"

# Start preview server
$serverProc = Start-Process node -ArgumentList "capture_server.cjs" -WorkingDirectory $frontendDir -PassThru
Start-Sleep -Seconds 2

$shots = @(
    @{ Name="01_login_desktop_1440.png"; Width=1440; Height=900; Url="http://127.0.0.1:4173/login" },
    @{ Name="02_login_tablet_768.png"; Width=768; Height=1024; Url="http://127.0.0.1:4173/login" },
    @{ Name="03_login_mobile_390.png"; Width=390; Height=844; Url="http://127.0.0.1:4173/login" },
    @{ Name="04_login_mobile_360.png"; Width=360; Height=780; Url="http://127.0.0.1:4173/login" },
    @{ Name="05_student_desktop_1440.png"; Width=1440; Height=900; Url="http://127.0.0.1:4173/student/overview?demo=student" },
    @{ Name="06_student_desktop_1024.png"; Width=1024; Height=768; Url="http://127.0.0.1:4173/student/overview?demo=student" },
    @{ Name="07_student_tablet_768.png"; Width=768; Height=1024; Url="http://127.0.0.1:4173/student/overview?demo=student" },
    @{ Name="08_student_mobile_390.png"; Width=390; Height=844; Url="http://127.0.0.1:4173/student/overview?demo=student" },
    @{ Name="09_student_mobile_360.png"; Width=360; Height=780; Url="http://127.0.0.1:4173/student/overview?demo=student" },
    @{ Name="10_faculty_desktop_1440.png"; Width=1440; Height=900; Url="http://127.0.0.1:4173/faculty/overview?demo=faculty" },
    @{ Name="11_hod_desktop_1440.png"; Width=1440; Height=900; Url="http://127.0.0.1:4173/hod/overview?demo=hod" },
    @{ Name="12_not_found_1440.png"; Width=1440; Height=900; Url="http://127.0.0.1:4173/nonexistent-route" },
    @{ Name="13_student_mobile_menu_open_390.png"; Width=390; Height=844; Url="http://127.0.0.1:4173/student/overview?demo=student^&mobileMenu=open" }
)

foreach ($s in $shots) {
    $targetFile = Join-Path $outputDir $s.Name
    Write-Host "Capturing $($s.Name)..."
    cmd /c """$chrome"" --headless --disable-gpu --virtual-time-budget=2500 --window-size=$($s.Width),$($s.Height) --screenshot=""$targetFile"" $($s.Url)"
}

Stop-Process -Id $serverProc.Id -Force
Write-Host "Done all captures."
