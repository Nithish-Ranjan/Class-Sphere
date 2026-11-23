const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const distDir = path.join(__dirname, 'dist');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outputDir = 'C:\\Users\\Nithish Ranjan\\.gemini\antigravity\\brain\\1f4d65b0-8bb5-41ae-9f7e-845bece0349b\\screenshots';
const tmpUserData = path.join(os.tmpdir(), 'chrome_test_profile_' + Date.now());

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
  console.log('Preview server ready at http://127.0.0.1:4173');

  const screenshots = [
    {
      name: '01_login_desktop_1440.png',
      url: 'http://127.0.0.1:4173/login',
      width: 1440,
      height: 900,
    },
    {
      name: '02_login_tablet_768.png',
      url: 'http://127.0.0.1:4173/login',
      width: 768,
      height: 1024,
    },
    {
      name: '03_login_mobile_390.png',
      url: 'http://127.0.0.1:4173/login',
      width: 390,
      height: 844,
    },
    {
      name: '04_login_mobile_360.png',
      url: 'http://127.0.0.1:4173/login',
      width: 360,
      height: 780,
    },
    {
      name: '05_student_desktop_1440.png',
      url: 'http://127.0.0.1:4173/student/overview?demo=student',
      width: 1440,
      height: 900,
    },
    {
      name: '06_student_desktop_1024.png',
      url: 'http://127.0.0.1:4173/student/overview?demo=student',
      width: 1024,
      height: 800,
    },
    {
      name: '07_student_tablet_768.png',
      url: 'http://127.0.0.1:4173/student/overview?demo=student',
      width: 768,
      height: 1024,
    },
    {
      name: '08_student_mobile_390.png',
      url: 'http://127.0.0.1:4173/student/overview?demo=student',
      width: 390,
      height: 844,
    },
    {
      name: '09_student_mobile_360.png',
      url: 'http://127.0.0.1:4173/student/overview?demo=student',
      width: 360,
      height: 780,
    },
    {
      name: '10_faculty_desktop_1440.png',
      url: 'http://127.0.0.1:4173/faculty/overview?demo=faculty',
      width: 1440,
      height: 900,
    },
    {
      name: '11_hod_desktop_1440.png',
      url: 'http://127.0.0.1:4173/hod/overview?demo=hod',
      width: 1440,
      height: 900,
    },
    {
      name: '12_not_found_1440.png',
      url: 'http://127.0.0.1:4173/unknown-path',
      width: 1440,
      height: 900,
    },
  ];

  for (const shot of screenshots) {
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
      console.log(`✓ Saved ${shot.name}`);
    } catch (err) {
      console.error(`✗ Error on ${shot.name}:`, err.message);
    }
  }

  // Cleanup tmpUserData
  try {
    fs.rmSync(tmpUserData, { recursive: true, force: true });
  } catch {}

  server.close(() => {
    console.log('All captures complete.');
    process.exit(0);
  });
});
