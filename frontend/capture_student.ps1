$outputDir = "C:\Users\Nithish Ranjan\.gemini\antigravity\brain\1f4d65b0-8bb5-41ae-9f7e-845bece0349b\screenshots"
$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$frontendDir = "C:\Users\Nithish Ranjan\.gemini\antigravity\scratch\classsphere\frontend"

# Start preview server
$serverProc = Start-Process node -ArgumentList "capture_server.cjs" -WorkingDirectory $frontendDir -PassThru
Start-Sleep -Seconds 2

$shots = @(
    @{ Name="student_01_overview_desktop_1440.png"; Width=1440; Height=900; Url="http://127.0.0.1:4173/student/overview?demo=student" },
    @{ Name="student_02_companion_desktop_1440.png"; Width=1440; Height=900; Url="http://127.0.0.1:4173/student/companion?demo=student" },
    @{ Name="student_03_attendance_desktop_1440.png"; Width=1440; Height=900; Url="http://127.0.0.1:4173/student/attendance?demo=student" },
    @{ Name="student_04_subject_attendance_desktop_1440.png"; Width=1440; Height=900; Url="http://127.0.0.1:4173/student/attendance/subject-wise?demo=student" },
    @{ Name="student_05_activity_desktop_1440.png"; Width=1440; Height=900; Url="http://127.0.0.1:4173/student/activity?demo=student" },
    @{ Name="student_06_activity_comparison_desktop_1440.png"; Width=1440; Height=900; Url="http://127.0.0.1:4173/student/activity/comparison?demo=student" },
    @{ Name="student_07_sos_desktop_1440.png"; Width=1440; Height=900; Url="http://127.0.0.1:4173/student/sos?demo=student" },
    @{ Name="student_08_companion_mobile_390.png"; Width=390; Height=844; Url="http://127.0.0.1:4173/student/companion?demo=student" },
    @{ Name="student_09_activity_mobile_390.png"; Width=390; Height=844; Url="http://127.0.0.1:4173/student/activity?demo=student" },
    @{ Name="student_10_attendance_mobile_360.png"; Width=360; Height=780; Url="http://127.0.0.1:4173/student/attendance?demo=student" },
    @{ Name="student_11_sos_mobile_390.png"; Width=390; Height=844; Url="http://127.0.0.1:4173/student/sos?demo=student" },
    @{ Name="student_12_updated_login_1440.png"; Width=1440; Height=900; Url="http://127.0.0.1:4173/login" }
)

foreach ($s in $shots) {
    $targetFile = Join-Path $outputDir $s.Name
    Write-Host "Capturing $($s.Name)..."
    cmd /c """$chrome"" --headless --disable-gpu --virtual-time-budget=2500 --window-size=$($s.Width),$($s.Height) --screenshot=""$targetFile"" $($s.Url)"
}

Stop-Process -Id $serverProc.Id -Force
Write-Host "Student screens capture complete."
