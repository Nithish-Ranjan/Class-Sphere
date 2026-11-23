$outputDir = "C:\Users\Nithish Ranjan\.gemini\antigravity\brain\1f4d65b0-8bb5-41ae-9f7e-845bece0349b\screenshots"
$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$frontendDir = "C:\Users\Nithish Ranjan\.gemini\antigravity\scratch\classsphere\frontend"

if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

# Start static preview server in background
$serverProc = Start-Process node -ArgumentList "capture_server.cjs" -WorkingDirectory $frontendDir -PassThru
Start-Sleep -Seconds 2

$shots = @(
    @{ Name="hod_01_review_desktop_1440.png"; Width=1440; Height=1100; Url="http://127.0.0.1:4173/hod/review?demo=hod" },
    @{ Name="hod_02_timetable_pipeline_desktop_1440.png"; Width=1440; Height=1150; Url="http://127.0.0.1:4173/hod/timetable?demo=hod" },
    @{ Name="hod_03_students_cohort_desktop_1440.png"; Width=1440; Height=1050; Url="http://127.0.0.1:4173/hod/students?demo=hod" },
    @{ Name="hod_04_faculty_workload_desktop_1440.png"; Width=1440; Height=1050; Url="http://127.0.0.1:4173/hod/faculty?demo=hod" },
    @{ Name="hod_05_class_scheduling_desktop_1440.png"; Width=1440; Height=1050; Url="http://127.0.0.1:4173/hod/classes?demo=hod" },
    @{ Name="hod_06_dashboard_desktop_1440.png"; Width=1440; Height=1050; Url="http://127.0.0.1:4173/hod/dashboard?demo=hod" },
    @{ Name="hod_07_attendance_audit_desktop_1440.png"; Width=1440; Height=1050; Url="http://127.0.0.1:4173/hod/attendance?demo=hod" },
    @{ Name="hod_08_activity_telemetry_desktop_1440.png"; Width=1440; Height=1050; Url="http://127.0.0.1:4173/hod/activity?demo=hod" },
    @{ Name="hod_09_alerts_console_desktop_1440.png"; Width=1440; Height=1050; Url="http://127.0.0.1:4173/hod/alerts?demo=hod" },
    @{ Name="hod_10_sos_escalations_desktop_1440.png"; Width=1440; Height=1050; Url="http://127.0.0.1:4173/hod/sos?demo=hod" },
    @{ Name="hod_11_admin_review_desktop_1440.png"; Width=1440; Height=1050; Url="http://127.0.0.1:4173/hod/admin-review?demo=hod" },
    @{ Name="hod_12_review_tablet_768.png"; Width=768; Height=1024; Url="http://127.0.0.1:4173/hod/review?demo=hod" },
    @{ Name="hod_13_timetable_mobile_390.png"; Width=390; Height=844; Url="http://127.0.0.1:4173/hod/timetable?demo=hod" },
    @{ Name="hod_14_alerts_mobile_390.png"; Width=390; Height=844; Url="http://127.0.0.1:4173/hod/alerts?demo=hod" },
    @{ Name="hod_15_mobile_menu_open_390.png"; Width=390; Height=844; Url="http://127.0.0.1:4173/hod/review?demo=hod&mobileMenu=open" },
    @{ Name="hod_16_review_small_mobile_360.png"; Width=360; Height=780; Url="http://127.0.0.1:4173/hod/review?demo=hod" },
    @{ Name="hod_17_conflict_modal_desktop_1440.png"; Width=1440; Height=1050; Url="http://127.0.0.1:4173/hod/timetable?demo=hod&step=5&injectConflict=true&showConflictModal=true" }
)

foreach ($s in $shots) {
    $targetFile = Join-Path $outputDir $s.Name
    if (Test-Path $targetFile) { Remove-Item $targetFile -Force }
    Write-Host "Capturing $($s.Name) ($($s.Width)x$($s.Height))..."
    cmd /c """$chrome"" --headless --disable-gpu --virtual-time-budget=2500 --window-size=$($s.Width),$($s.Height) --screenshot=""$targetFile"" ""$($s.Url)"""
}

# Copy updated screenshots to root artifact directory as well
$rootArtifactDir = "C:\Users\Nithish Ranjan\.gemini\antigravity\brain\1f4d65b0-8bb5-41ae-9f7e-845bece0349b"
Get-ChildItem -Path $outputDir -Filter "hod_*.png" | ForEach-Object {
    Copy-Item $_.FullName -Destination (Join-Path $rootArtifactDir $_.Name) -Force
}

Stop-Process -Id $serverProc.Id -Force
Write-Host "All 17 HOD screenshots captured and copied successfully."
