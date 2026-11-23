const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const distDir = path.join(__dirname, 'dist');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outputDir = 'C:\\Users\\Nithish Ranjan\\.gemini\\antigravity\\brain\\1f4d65b0-8bb5-41ae-9f7e-845bece0349b\\screenshots';
const tmpUserData = path.join(os.tmpdir(), 'chrome_stu_prof_' + Date.now());

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json',
};

const server = http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0];
  let filePath = path.join(distDir, urlPath);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
    fs.createReadStream(filePath).pipe(res);
  } else {
    const indexHtml = path.join(distDir, 'index.html');
    res.writeHead(200, { 'Content-Type': 'text/html' });
    fs.createReadStream(indexHtml).pipe(res);
  }
});

server.listen(4173, '127.0.0.1', () => {
  console.log('Static preview server active on http://127.0.0.1:4173');

  const shots = [
    { name: 'student_01_overview_desktop_1440.png', width: 1440, height: 900, url: 'http://127.0.0.1:4173/student/overview?demo=student' },
    { name: 'student_02_companion_desktop_1440.png', width: 1440, height: 900, url: 'http://127.0.0.1:4173/student/companion?demo=student' },
    { name: 'student_03_attendance_desktop_1440.png', width: 1440, height: 900, url: 'http://127.0.0.1:4173/student/attendance?demo=student' },
    { name: 'student_04_subject_attendance_desktop_1440.png', width: 1440, height: 900, url: 'http://127.0.0.1:4173/student/attendance/subject-wise?demo=student' },
    { name: 'student_05_activity_desktop_1440.png', width: 1440, height: 900, url: 'http://127.0.0.1:4173/student/activity?demo=student' },
    { name: 'student_06_activity_comparison_desktop_1440.png', width: 1440, height: 900, url: 'http://127.0.0.1:4173/student/activity/comparison?demo=student' },
    { name: 'student_07_sos_desktop_1440.png', width: 1440, height: 900, url: 'http://127.0.0.1:4173/student/sos?demo=student' },
    { name: 'student_08_companion_mobile_390.png', width: 390, height: 844, url: 'http://127.0.0.1:4173/student/companion?demo=student' },
    { name: 'student_09_activity_mobile_390.png', width: 390, height: 844, url: 'http://127.0.0.1:4173/student/activity?demo=student' },
    { name: 'student_10_attendance_mobile_360.png', width: 360, height: 780, url: 'http://127.0.0.1:4173/student/attendance?demo=student' },
    { name: 'student_11_sos_mobile_390.png', width: 390, height: 844, url: 'http://127.0.0.1:4173/student/sos?demo=student' },
    { name: 'student_12_updated_login_1440.png', width: 1440, height: 900, url: 'http://127.0.0.1:4173/login' },
  ];

  for (const shot of shots) {
    const outFile = path.join(outputDir, shot.name);
    console.log(`Capturing ${shot.name} (${shot.width}x${shot.height})...`);
    try {
      execFileSync(chromePath, [
        '--headless=new',
        '--disable-gpu',
        '--no-sandbox',
        '--hide-scrollbars',
        `--user-data-dir=${tmpUserData}`,
        `--window-size=${shot.width},${shot.height}`,
        `--screenshot=${outFile}`,
        shot.url,
      ], { timeout: 15000 });
      const stats = fs.statSync(outFile);
      console.log(`✓ Saved ${shot.name} (${stats.size} bytes)`);
    } catch (err) {
      console.error(`✗ Error capturing ${shot.name}:`, err.message);
    }
  }

  try {
    fs.rmSync(tmpUserData, { recursive: true, force: true });
  } catch {}

  server.close(() => {
    console.log('All Student experience captures finished successfully.');
    process.exit(0);
  });
});
