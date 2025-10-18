#!/usr/bin/env node
const net = require('net');
const { spawn } = require('child_process');
const path = require('path');

async function findFreePort(start = 3000, max = 3100) {
  function tryPort(port) {
    return new Promise((resolve) => {
      const server = net.createServer();
      server.once('error', () => resolve(false));
      server.once('listening', () => {
        server.close(() => resolve(true));
      });
      server.listen(port, '0.0.0.0');
    });
  }

  let port = Number(process.env.PORT) || start;
  while (port <= max) {
    // eslint-disable-next-line no-await-in-loop
    const ok = await tryPort(port);
    if (ok) return port;
    port += 1;
  }
  throw new Error(`No free port found between ${start}-${max}`);
}

(async () => {
  try {
    const port = await findFreePort(3000, 3010);
    const isWin = process.platform === 'win32';
    console.log(`Starting Next on 0.0.0.0:${port} (auto-selected)`);
    process.env.HOST = '0.0.0.0';

    // Use local next binary for better reliability
    const nextPath = path.join(__dirname, '..', 'node_modules', '.bin', 'next');
    const bin = isWin ? `${nextPath}.cmd` : nextPath;
    const args = ['dev', '-H', '0.0.0.0', '-p', String(port)];
    const child = spawn(bin, args, {
      stdio: 'inherit',
      env: process.env,
      shell: isWin,
    });
    child.on('exit', (code) => process.exit(code || 0));
  } catch (err) {
    console.error('Failed to start dev server:', err.message || err);
    process.exit(1);
  }
})();
