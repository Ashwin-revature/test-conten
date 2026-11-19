// One-time setup, part 2 (npm run setup runs npm ci first): creates the lab's Python
// environment in ../.venv and installs the pinned packages from requirements.txt, so
// tests 24-26 can load the reviews service. Needs the network once; nothing else does.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { labPython } from './behavior.mjs';

const venv = path.join(import.meta.dirname, '..', '.venv');
const requirements = path.join(import.meta.dirname, 'requirements.txt');

function version(cmd, args) {
  const r = spawnSync(cmd, [...args, '-c', 'import sys; print("%d.%d" % sys.version_info[:2])'], { encoding: 'utf8' });
  if (r.error || r.status !== 0) return null;
  const [major, minor] = r.stdout.trim().split('.').map(Number);
  return { cmd, args, major, minor, text: r.stdout.trim() };
}

const candidates = process.platform === 'win32'
  ? [['py', ['-3']], ['python', []], ['python3', []]]
  : [['python3', []], ['python', []]];
const found = candidates.map(([c, a]) => version(c, a)).filter(Boolean);
const python = found.find((p) => p.major === 3 && p.minor >= 10);
if (!python) {
  const seen = found.map((p) => `${p.cmd} ${p.text}`).join(', ') || 'none';
  console.error(`setup needs Python 3.10 or later (found: ${seen}). Install it from python.org, then run npm run setup again.`);
  process.exit(1);
}
if (!existsSync(labPython())) {
  console.log(`creating the lab's Python environment with ${python.cmd} ${python.text} in .venv`);
  const r = spawnSync(python.cmd, [...python.args, '-m', 'venv', venv], { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
const pip = spawnSync(labPython(), ['-m', 'pip', 'install', '--disable-pip-version-check', '--quiet', '-r', requirements], { stdio: 'inherit' });
if (pip.status !== 0) process.exit(pip.status ?? 1);
console.log('setup done: the tests now run offline');
