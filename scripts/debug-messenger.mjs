import { spawn } from 'child_process';
import { chromium } from 'playwright';

const port = 4325;
const url = `http://127.0.0.1:${port}/Other/Show/Outlaws-and-Bandits`;
const messengerUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/MessengerForiOS;FBAV/434.1.0.29.120;FBBV/524541088;FBDV/iPhone14,3;FBMD/iPhone;FBSN/iOS;FBSV/16.6;FBSS/3;FBCR/;FBID/phone;FBLC/en_US;FBOP/5;FBIA/1]';

function startAstro() {
  return new Promise((resolve, reject) => {
    const isWindows = process.platform === 'win32';
    const binary = isWindows ? 'cmd.exe' : 'npx';
    const args = isWindows
      ? ['/c', 'npx', 'astro', 'dev', '--host', '127.0.0.1', '--port', String(port)]
      : ['astro', 'dev', '--host', '127.0.0.1', '--port', String(port)];
    const proc = spawn(binary, args, { cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'] });

    const onData = (chunk) => {
      const text = chunk.toString();
      process.stdout.write(`[astro] ${text}`);
      if (text.includes(`http://127.0.0.1:${port}/`)) {
        proc.stdout.off('data', onData);
        resolve(proc);
      }
    };

    proc.stdout.on('data', onData);
    proc.stderr.on('data', (chunk) => {
      process.stderr.write(`[astro:err] ${chunk}`);
    });
    proc.on('error', reject);
    proc.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`astro dev exited early with code ${code}`));
      }
    });
  });
}

async function main() {
  console.log(`[debug] starting astro dev on port ${port}`);
  const astroProc = await startAstro();

  console.log('[debug] launching chromium for', url);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ userAgent: messengerUA, viewport: { width: 1170, height: 2532 } });

  page.on('console', (msg) => {
    console.log(`[console:${msg.type()}]`, msg.text());
  });

  page.on('pageerror', (err) => {
    console.log('[pageerror]', err.message);
  });

  page.on('response', (resp) => {
    if (resp.status() >= 400) {
      console.log('[response]', resp.status(), resp.url());
    }
  });

  await page.goto(url, { waitUntil: 'networkidle' });

  const diagnostics = await page.evaluate(() => {
    const root = document.querySelector('.picture-show-content');
    const rootRect = root?.getBoundingClientRect();
    return {
      hasRoot: Boolean(root),
      textSample: root ? root.textContent?.slice(0, 160) : null,
      bodyChildCount: document.body.childElementCount,
      rootRect,
    };
  });

  console.log('[diagnostics]', diagnostics);

  await page.waitForTimeout(3000);
  await browser.close();

  astroProc.kill('SIGTERM');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
