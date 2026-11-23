$outputDir = "C:\Users\Nithish Ranjan\.gemini\antigravity\brain\1f4d65b0-8bb5-41ae-9f7e-845bece0349b\screenshots"
$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$frontendDir = "C:\Users\Nithish Ranjan\.gemini\antigravity\scratch\classsphere\frontend"

if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

# Start preview server
$serverProc = Start-Process node -ArgumentList "capture_server.cjs" -WorkingDirectory $frontendDir -PassThru
Start-Sleep -Seconds 2

$shots = @(
    @{ Name="faculty_01_overview_desktop_1440.png"; Width=1440; Height=900; Url="http://127.0.0.1:4173/faculty/overview?demo=faculty" },
    @{ Name="faculty_02_today_classes_desktop_1440.png"; Width=1440; Height=900; Url="http://127.0.0.1:4173/faculty/today-classes?demo=faculty" },
    @{ Name="faculty_03_attendance_workflow_desktop_1440.png"; Width=1440; Height=900; Url="http://127.0.0.1:4173/faculty/attendance?demo=faculty" },
    @{ Name="faculty_04_class_log_desktop_1440.png"; Width=1440; Height=900; Url="http://127.0.0.1:4173/faculty/class-log?demo=faculty" },
    @{ Name="faculty_05_class_activity_desktop_1440.png"; Width=1440; Height=900; Url="http://127.0.0.1:4173/faculty/activity?demo=faculty" },
    @{ Name="faculty_06_complete_class_dashboard_desktop_1440.png"; Width=1440; Height=900; Url="http://127.0.0.1:4173/faculty/class-dashboard?demo=faculty" },
    @{ Name="faculty_07_complete_faculty_dashboard_desktop_1440.png"; Width=1440; Height=900; Url="http://127.0.0.1:4173/faculty/dashboard?demo=faculty" },
    @{ Name="faculty_08_daily_overview_desktop_1440.png"; Width=1440; Height=900; Url="http://127.0.0.1:4173/faculty/daily-overview?demo=faculty" },
    @{ Name="faculty_09_alerts_desktop_1440.png"; Width=1440; Height=900; Url="http://127.0.0.1:4173/faculty/alerts?demo=faculty" },
    @{ Name="faculty_10_sos_desktop_1440.png"; Width=1440; Height=900; Url="http://127.0.0.1:4173/faculty/sos?demo=faculty" },
    @{ Name="faculty_11_attendance_mobile_390.png"; Width=390; Height=844; Url="http://127.0.0.1:4173/faculty/attendance?demo=faculty" },
    @{ Name="faculty_12_overview_mobile_360.png"; Width=360; Height=780; Url="http://127.0.0.1:4173/faculty/overview?demo=faculty" },
    @{ Name="faculty_13_daily_overview_tablet_768.png"; Width=768; Height=1024; Url="http://127.0.0.1:4173/faculty/daily-overview?demo=faculty" },
    @{ Name="faculty_14_alerts_mobile_390.png"; Width=390; Height=844; Url="http://127.0.0.1:4173/faculty/alerts?demo=faculty" }
)

foreach ($s in $shots) {
    $targetFile = Join-Path $outputDir $s.Name
    Write-Host "Capturing $($s.Name) at $($s.Width)x$($s.Height)..."
    cmd /c """$chrome"" --headless --disable-gpu --virtual-time-budget=2500 --window-size=$($s.Width),$($s.Height) --screenshot=""$targetFile"" $($s.Url)"
}

Stop-Process -Id $serverProc.Id -Force
Write-Host "Faculty screens capture complete."
