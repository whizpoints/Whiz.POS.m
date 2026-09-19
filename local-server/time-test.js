import { spawn } from 'child_process';
const start = Date.now();
const proc = spawn('node', ['./node_modules/tsx/dist/cli.mjs', 'server/index.ts'], { env: { ...process.env, PORT: '5055' } });
proc.stdout.on('data', (d) => {
  console.log(`[${Date.now() - start}ms] ${d.toString().trim()}`);
  if (d.toString().includes('running')) {
    proc.kill();
    process.exit(0);
  }
});
