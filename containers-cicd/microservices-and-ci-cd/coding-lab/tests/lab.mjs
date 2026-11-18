// Shared readers and rule checks for the public lab tests. They read files as
// text and YAML; nothing here builds an image, starts a container, runs
// Python or calls any network. Each rule returns null when the project
// satisfies it, or one stable message saying what is wrong.
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';

// The learner project: the starter folder, or LAB_PROJECT when set (for a copy elsewhere).
export const PROJECT = path.resolve(process.env.LAB_PROJECT || path.join(import.meta.dirname, '..', 'starter'));

const has = (dir, rel) => existsSync(path.join(dir, rel));
const read = (dir, rel) => (has(dir, rel) ? readFileSync(path.join(dir, rel), 'utf8') : '');

export const RULES = {};
// A rule that reads a YAML file first reports a parse error in that file, so a
// broken indent never shows up as "missing" content.
const rule = (id, yamlRel, fn) => {
  RULES[id] = (dir) => loadYaml(dir, yamlRel).error ?? fn(dir);
};

// ---------- shared YAML helpers ----------

function loadYaml(dir, rel) {
  if (!rel || !has(dir, rel)) return { doc: {}, error: null };
  try {
    const doc = parse(read(dir, rel));
    return { doc: doc && typeof doc === 'object' ? doc : {}, error: null };
  } catch (e) {
    const line = e?.linePos?.[0]?.line;
    return {
      doc: {},
      error: `${rel} is not valid YAML${line ? ` (the parser stops at line ${line})` : ''}: indent with spaces, never tabs, and when you uncomment a draft delete only the # at the start of each line`,
    };
  }
}
const yamlFile = (dir, rel) => loadYaml(dir, rel).doc;
export const compose = (dir) => yamlFile(dir, 'compose.yaml');
const services = (dir) => compose(dir).services || {};

export function env(service) {
  const e = service?.environment;
  if (Array.isArray(e)) {
    return Object.fromEntries(e.map((x) => { const t = String(x); const i = t.indexOf('='); return i < 0 ? [t, undefined] : [t.slice(0, i), t.slice(i + 1)]; }));
  }
  return e && typeof e === 'object' ? e : {};
}

// KEY=VALUE lines of an env file; comments and blank lines skipped, surrounding quotes removed.
export function envFileValues(dir, rel) {
  if (!has(dir, rel)) return null;
  const out = {};
  for (const line of read(dir, rel).split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return out;
}

// ${VAR} inside a longer string, resolved from .env; a literal passes through.
const INTERP = /^\$\{([A-Za-z_][A-Za-z0-9_]*)(?::?\?[^}]*)?\}$/;
function resolvedPart(dir, value) {
  const m = String(value ?? '').match(INTERP);
  if (!m) return /\$/.test(String(value ?? '')) ? { ok: false, why: 'interp' } : { ok: true, literal: true, value: String(value ?? '') };
  const dot = envFileValues(dir, '.env');
  return dot && dot[m[1]] ? { ok: true, value: dot[m[1]], name: m[1], from: '.env' } : { ok: false, why: 'missing-var', name: m[1] };
}

const buildContext = (s) => String(typeof s?.build === 'string' ? s.build : s?.build?.context || '').replace(/^\.\//, '').replace(/\/$/, '');
// The reviews service's own database: a postgres service other than the shop's db.
const reviewsDbName = (dir) => Object.keys(services(dir))
  .find((k) => k !== 'db' && /^postgres:/.test(String(services(dir)[k]?.image || '')));

// ---------- compose.yaml ----------

rule('compose-reviews-service', 'compose.yaml', (dir) => {
  const sv = services(dir);
  return buildContext(sv.reviews) === 'reviews'
    ? null : 'add a service named reviews with build: ./reviews, next to the provided api and db services';
});

rule('compose-reviews-db', 'compose.yaml', (dir) => {
  const name = reviewsDbName(dir);
  const sv = services(dir);
  if (!name || !/^postgres:18(\b|-|$)/.test(String(sv[name].image))) {
    return 'give reviews its own database: a second service from the postgres:18 image, separate from the shop\'s db';
  }
  const declared = Object.keys(compose(dir).volumes || {});
  const mounts = (sv[name]?.volumes || []).map((v) => (typeof v === 'string' ? { source: v.split(':')[0], target: v.split(':')[1] } : v));
  const dbMounts = (sv.db?.volumes || []).map((v) => (typeof v === 'string' ? v.split(':')[0] : v?.source));
  const own = mounts.find((m) => declared.includes(m.source) && /^\/var\/lib\/postgresql\/?$/.test(m.target || ''));
  return own && !dbMounts.includes(own.source)
    ? null : 'mount a named volume of its own at /var/lib/postgresql on the reviews database service and declare it under the top-level volumes key';
});

rule('compose-reviews-env', 'compose.yaml', (dir) => {
  const name = reviewsDbName(dir);
  const sv = services(dir);
  const url = String(env(sv.reviews).DATABASE_URL || '');
  const m = url.match(/^postgresql:\/\/([^:/@]+):([^@]+)@([^:/@]+)(?::(\d+))?\/([^?\s]+)$/);
  if (!m) return 'give reviews a DATABASE_URL of the form postgresql://USER:${...}@<its own db service>:5432/DBNAME';
  if (!name || m[3] !== name || m[3] === 'db') return 'the DATABASE_URL host must be the reviews database\'s own service name, never the shop\'s db and never localhost';
  if ((m[4] ?? '5432') !== '5432') return 'the DATABASE_URL port is the container port 5432, not a published host port';
  const pw = resolvedPart(dir, m[2]);
  if (pw.literal) return 'the password inside DATABASE_URL is a literal: use ${REVIEWS_DB_PASSWORD} filled from the local .env file';
  if (!pw.ok) return pw.why === 'missing-var' ? `DATABASE_URL uses \${${pw.name}}, but no .env file in the project sets ${pw.name}` : 'the password inside DATABASE_URL must be exactly one ${NAME} reference filled from .env';
  const shopPw = String(env(sv.db).POSTGRES_PASSWORD ?? '').match(INTERP)?.[1];
  if (shopPw && pw.name === shopPw) return `the reviews database reuses the shop's ${shopPw}: database-per-service gives it its own password variable, REVIEWS_DB_PASSWORD`;
  const dbPw = resolvedPart(dir, env(sv[name]).POSTGRES_PASSWORD);
  if (dbPw.literal) return 'POSTGRES_PASSWORD on the reviews database is a literal: use the same ${...} reference as DATABASE_URL';
  if (!dbPw.ok || dbPw.value !== pw.value) return 'the reviews database must receive the same password value that DATABASE_URL carries';
  const user = resolvedPart(dir, env(sv[name]).POSTGRES_USER ?? 'postgres');
  // The postgres image names the database after the user when POSTGRES_DB is not set.
  const dbName = env(sv[name]).POSTGRES_DB === undefined ? user : resolvedPart(dir, env(sv[name]).POSTGRES_DB);
  return dbName.ok && m[5] === dbName.value && user.ok && m[1] === user.value
    ? null : 'the DATABASE_URL user and database name must match the user and database the reviews database service creates';
});

rule('compose-reviews-depends', 'compose.yaml', (dir) => {
  const name = reviewsDbName(dir);
  const sv = services(dir);
  const t = name && sv[name]?.healthcheck?.test;
  const list = Array.isArray(t) ? t.map(String) : (t ? ['CMD-SHELL', String(t)] : []);
  const command = list.slice(1).join(' ');
  if (!['CMD', 'CMD-SHELL'].includes(list[0]) || !command.includes('pg_isready')) {
    return 'give the reviews database a healthcheck whose test runs pg_isready, as the db service already shows';
  }
  if (/(^|[^$])\$\{?POSTGRES_/.test(command)) {
    return 'in the healthcheck, write $${POSTGRES_USER} with two dollar signs: $$ lets the container expand the variable, while a single $ makes Compose substitute it from your shell or .env first';
  }
  const dep = sv.reviews?.depends_on;
  return dep && !Array.isArray(dep) && dep[name]?.condition === 'service_healthy'
    ? null : 'make reviews wait for its own database with depends_on and condition: service_healthy';
});

rule('compose-api-base-url', 'compose.yaml', (dir) => {
  return String(env(services(dir).reviews).API_BASE_URL || '') === 'http://api:8080'
    ? null : 'set API_BASE_URL on reviews to the api service name and its container port, never localhost or a published host port';
});

function portParts(p) {
  if (p && typeof p === 'object') return { host: String(p.host_ip ?? ''), target: String(p.target ?? '') };
  const parts = String(p).replace(/\/(tcp|udp)$/, '').split(':');
  if (parts.length === 3) return { host: parts[0], target: parts[2] };
  if (parts.length === 4 && parts[0].startsWith('[')) return { host: '[::1]', target: parts[3] };
  return { host: '', target: parts.at(-1) };
}
rule('compose-reviews-ports', 'compose.yaml', (dir) => {
  const sv = services(dir);
  const reviewsPorts = (sv.reviews?.ports || []).map(portParts);
  if (!reviewsPorts.length) return 'publish the reviews port so a browser on this machine can reach it';
  if (!reviewsPorts.some((p) => p.target === '8000')) return 'publish the reviews container port 8000, the port the service listens on inside its container';
  const added = [...reviewsPorts, ...(reviewsDbName(dir) ? (sv[reviewsDbName(dir)]?.ports || []).map(portParts) : [])];
  return added.every((p) => ['127.0.0.1', '::1', '[::1]'].includes(p.host))
    ? null : 'every ports entry you add must name the host address 127.0.0.1, for example "127.0.0.1:8000:8000"';
});

// ---------- reviews/Dockerfile ----------

function dockerfile(dir, rel) {
  const lines = read(dir, rel).replace(/\\\r?\n/g, ' ').split(/\r?\n/)
    .map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  const stages = [];
  for (const line of lines) {
    const m = line.match(/^(\S+)\s*(.*)$/);
    const op = m[1].toUpperCase();
    if (op === 'FROM') { stages.push({ steps: [] }); continue; }
    if (stages.at(-1)) stages.at(-1).steps.push({ op, args: m[2] });
  }
  return stages;
}
function words(args) {
  const a = args.trim();
  if (a.startsWith('[')) {
    try { return { exec: true, list: JSON.parse(a).map(String) }; } catch { return { exec: true, list: [] }; }
  }
  return { exec: false, list: a.split(/\s+/).filter(Boolean) };
}
function hostOf(list) {
  for (let i = 0; i < list.length; i += 1) {
    if (list[i] === '--host') return list[i + 1] ?? '';
    if (list[i].startsWith('--host=')) return list[i].slice('--host='.length);
  }
  return null;
}

rule('reviews-listen', null, (dir) => {
  const s = dockerfile(dir, 'reviews/Dockerfile');
  const steps = s.length ? s.at(-1).steps : [];
  const entry = [...steps].reverse().find((x) => x.op === 'ENTRYPOINT');
  const cmd = [...steps].reverse().find((x) => x.op === 'CMD');
  if (!entry && !cmd) return 'start the server with a CMD or ENTRYPOINT instruction';
  // An exec-form ENTRYPOINT takes the CMD words as its arguments.
  const e = entry ? words(entry.args) : null;
  const w = e ? (e.exec && cmd ? [...e.list, ...words(cmd.args).list] : e.list) : words(cmd.args).list;
  const host = hostOf(w);
  if (w.includes('fastapi')) {
    if (w.includes('dev')) return 'the server still starts with fastapi dev: reread the adding-FastAPI page for the command an image should use, and why';
    if (!w.includes('run')) return 'start the FastAPI app with the fastapi command an image should use';
    return host === null || host === '0.0.0.0'
      ? null : `the server is told to listen on ${host}: reread the adding-FastAPI page on the address a server in a container must listen on`;
  }
  if (w.some((x) => /uvicorn/.test(x))) {
    if (host === '0.0.0.0') return null;
    return host === null
      ? 'uvicorn without --host uses its default address: reread the adding-FastAPI page on the address a server in a container must listen on'
      : `the server is told to listen on ${host}: reread the adding-FastAPI page on the address a server in a container must listen on`;
  }
  return 'start the FastAPI app with the fastapi command an image should use (or uvicorn with an explicit --host)';
});

// ---------- reviews/app/main.py (read as text; never executed) ----------

// The source with comments and triple-quoted strings (docstrings) removed, so
// only code counts. Ordinary one-line strings are kept.
export function pythonCode(text) {
  let out = '';
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    const three = text.slice(i, i + 3);
    if (three === '"""' || three === "'''") {
      const end = text.indexOf(three, i + 3);
      i = end < 0 ? text.length : end + 3;
      out += '""';
      continue;
    }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < text.length && text[j] !== c && text[j] !== '\n') j += text[j] === '\\' ? 2 : 1;
      out += text.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    if (c === '#') {
      while (i < text.length && text[i] !== '\n') i += 1;
      continue;
    }
    out += c;
    i += 1;
  }
  return out;
}
const mainPy = (dir) => pythonCode(read(dir, 'reviews/app/main.py'));

// The body of the indented block that starts on lines[i] (text after its colon included).
function blockBody(lines, i) {
  const indent = lines[i].match(/^(\s*)/)[1].length;
  let body = lines[i].slice(lines[i].indexOf(':') + 1);
  for (let j = i + 1; j < lines.length; j += 1) {
    if (lines[j].trim() === '') continue;
    if (lines[j].match(/^(\s*)/)[1].length <= indent) break;
    body += `\n${lines[j]}`;
  }
  return body;
}

// Each `key=value` keyword argument inside a call, with the name of the call
// whose parentheses enclose it. A statement-level `key = ...` is not one.
function keywordArgs(code, key) {
  const out = [];
  const stack = [];
  const re = new RegExp(`${key}\\s*=(?!=)\\s*`, 'y');
  for (let i = 0; i < code.length; i += 1) {
    const c = code[i];
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < code.length && code[j] !== c && code[j] !== '\n') j += code[j] === '\\' ? 2 : 1;
      i = j;
      continue;
    }
    if (c === '(') { stack.push(code.slice(0, i).match(/([A-Za-z_][\w.]*)\s*$/)?.[1] ?? ''); continue; }
    if (c === ')') { stack.pop(); continue; }
    if (stack.length && !/[\w.]/.test(code[i - 1] ?? '')) {
      re.lastIndex = i;
      if (re.exec(code)) out.push({ at: i, callee: stack.at(-1), value: code.slice(re.lastIndex).match(/^[^,)\n]*/)[0].trim() });
    }
  }
  return out;
}

// Index of the parenthesis that closes the one opened at code[open].
function parenEnd(code, open) {
  let depth = 0;
  for (let j = open; j < code.length; j += 1) {
    if (code[j] === '(') depth += 1;
    else if (code[j] === ')') { depth -= 1; if (!depth) return j; }
  }
  return code.length;
}
// httpx clients the code creates, by the name they are bound to (`with ... as name` or `name = ...`).
function httpxClients(code) {
  const out = {};
  for (const m of code.matchAll(/httpx\.(?:Async)?Client\s*\(/g)) {
    const open = m.index + m[0].length - 1;
    const end = parenEnd(code, open);
    const name = code.slice(end + 1).match(/^\s*as\s+([A-Za-z_]\w*)/)?.[1] ?? code.slice(0, m.index).match(/([A-Za-z_]\w*)\s*=\s*$/)?.[1];
    if (name) out[name] = { start: open + 1, end, args: code.slice(open + 1, end) };
  }
  return out;
}
// The outgoing call to the shop api: a request made with httpx, directly (httpx.get
// and friends) or through an httpx client the code creates. The one aimed at
// API_BASE_URL wins (in its arguments, through a variable built from it, or
// through the client's base_url); otherwise the first httpx request.
function outgoingCall(code) {
  const clients = httpxClients(code);
  const derived = [...code.matchAll(/^\s*([A-Za-z_]\w*)\s*=[^\n]*API_BASE_URL/gm)].map((x) => x[1]);
  const aimed = (text) => /API_BASE_URL/.test(text) || derived.some((n) => new RegExp(`\\b${n}\\b`).test(text));
  const calls = [];
  for (const m of code.matchAll(/\b(httpx|[A-Za-z_]\w*)\.(get|post|put|patch|delete|head|options|request|stream|send)\s*\(/g)) {
    if (m[1] !== 'httpx' && !clients[m[1]]) continue;
    const open = m.index + m[0].length - 1;
    const end = parenEnd(code, open);
    calls.push({ at: m.index, start: open + 1, end, args: code.slice(open + 1, end), client: clients[m[1]] ?? null });
  }
  return calls.find((c) => aimed(c.args) || aimed(c.client?.args ?? '')) ?? calls[0] ?? null;
}
const within = (span, at) => span && at >= span.start && at < span.end;

// A timeout limit: a number or a named constant (never None).
const LIMIT = '(?!None\\b)(?:[0-9.]+|[A-Za-z_][\\w.]*)(?![\\w.]*\\s*=)';
const SINGLE_NUMBER = 'a single number sets one limit for every phase: build an httpx.Timeout with a separate connect limit and pass that';
rule('reviews-timeouts', null, (dir) => {
  const code = mainPy(dir);
  const call = outgoingCall(code);
  if (!call) return 'make the call to the shop api with httpx, as the starter does';
  // Only a timeout= keyword of the outgoing call, or of the client that makes it, passes a timeout.
  // A per-request timeout replaces the client's default, so the call's own one decides when present.
  const own = keywordArgs(code, 'timeout').filter((a) => !/(^|\.)Timeout$/.test(a.callee));
  const onCall = own.filter((a) => within(call, a.at));
  const passedArgs = onCall.length ? onCall : own.filter((a) => within(call.client, a.at));
  const plainNumber = passedArgs.some((a) => /^[0-9.]+$/.test(a.value));
  if (passedArgs.some((a) => a.value === 'None')) return 'the call passes timeout=None: reread what the service-to-service page says that does, then pass explicit limits';
  const made = [...code.matchAll(/(?:\b([A-Za-z_]\w*)\s*=\s*)?httpx\.Timeout\s*\(([^)]*)\)/g)];
  if (!made.length) return plainNumber ? SINGLE_NUMBER : 'build an httpx.Timeout with an explicit connect limit and an explicit read limit, and pass it as the call\'s timeout';
  for (const [, , args] of made) {
    if (/\b(connect|read)\s*=\s*None\b/.test(args)) return 'a None for connect or read inside httpx.Timeout turns that limit off: give both a real limit';
    const explicit = (k) => new RegExp(`\\b${k}\\s*=\\s*${LIMIT}`).test(args);
    if (/^\s*None\s*(,|$)/.test(args) || /\btimeout\s*=\s*None\b/.test(args)) {
      if (explicit('connect') && explicit('read')) continue;
      return 'a None default leaves every limit you do not set switched off: with a None default, set both connect and read';
    }
    // httpx.Timeout needs a default (first positional or timeout=) covering read, or all four limits.
    const hasDefault = new RegExp(`^\\s*${LIMIT}\\s*(,|$)`).test(args) || explicit('timeout');
    const allFour = ['connect', 'read', 'write', 'pool'].every(explicit);
    if (!explicit('connect') || !(hasDefault || allFour)) {
      return 'httpx.Timeout needs an explicit connect limit and a read limit it accepts: a default that covers read plus connect=..., or all four of connect, read, write and pool';
    }
  }
  const names = made.map((m) => m[1]).filter(Boolean);
  if (passedArgs.some((a) => a.value.startsWith('httpx.Timeout(') || names.includes(a.value))) return null;
  return plainNumber ? SINGLE_NUMBER : 'your httpx.Timeout is built but never used: pass it as the timeout argument of the outgoing call (or its client)';
});

const AUTH_PAIR = /["']authorization["']\s*:\s*authorization\b/i;
function forwardsToken(code, call) {
  for (const args of [call.args, call.client?.args ?? '']) {
    const literal = args.match(/\bheaders\s*=\s*(\{[^}]*\})/);
    if (literal && AUTH_PAIR.test(literal[1])) return true;
    const name = args.match(/\bheaders\s*=\s*([A-Za-z_]\w*)\s*(?:[,)]|$)/)?.[1];
    if (name && (new RegExp(`\\b${name}\\s*=\\s*\\{[^}]*["']authorization["']\\s*:\\s*authorization\\b`, 'i').test(code)
      || new RegExp(`\\b${name}\\s*\\[\\s*["']authorization["']\\s*\\]\\s*=\\s*authorization\\b`, 'i').test(code))) return true;
  }
  return false;
}
// raise HTTPException(...) with 401 anywhere in its arguments (positional, status_code= in any order, or the status constant).
const RAISE_401 = /\braise\s+HTTPException\s*\([^)]*(?:\b401\b|HTTP_401_UNAUTHORIZED)/;
const indentOf = (line) => line.match(/^(\s*)/)[1].length;
// Line index just past the indented block that starts on lines[i].
function blockEnd(lines, i) {
  let j = i + 1;
  while (j < lines.length && (lines[j].trim() === '' || indentOf(lines[j]) > indentOf(lines[i]))) j += 1;
  return j;
}

rule('reviews-auth-forward', null, (dir) => {
  const code = mainPy(dir);
  if (/["']Bearer\s+[A-Za-z0-9._~+/-]+=*["']/.test(code) || /Bearer\s*\{\s*["'][^"']+["']\s*\}/.test(code)) {
    return 'a bearer token is written into the source: forward the token the caller sent instead';
  }
  const call = outgoingCall(code);
  if (!call) return 'no httpx request to the shop api was found: make the call with httpx (directly or through an httpx client), as the starter does';
  if (!forwardsToken(code, call)) return 'send the incoming authorization value on as the outgoing Authorization header of the call to the shop api';
  const optional = /\bauthorization\s*:[^=\n]*=\s*(Header\s*\(\s*(default\s*=\s*)?None|None\b)/.test(code);
  if (!optional) return null;
  const lines = code.split(/\r?\n/);
  const callLine = code.slice(0, call.at).split(/\r?\n/).length - 1;
  const before = lines.map((l, i) => i).filter((i) => i < callLine && /^\s*if\s/.test(lines[i]));
  // A missing-token check before the call: `if not authorization:` / `if authorization is None:` raising 401.
  const negative = before.filter((i) => /\bnot\s+authorization\b|\bauthorization\s+(?:is|==)\s+None\b/.test(lines[i]));
  if (negative.some((i) => RAISE_401.test(blockBody(lines, i)))) return null;
  // Or `if authorization:` (wrapping the call or ahead of it) with an else that raises 401.
  const positive = before.filter((i) => /^\s*if\s+authorization(\s+is\s+not\s+None)?\s*:/.test(lines[i]));
  for (const i of positive) {
    const e = blockEnd(lines, i);
    if (e < lines.length && indentOf(lines[e]) === indentOf(lines[i]) && /^\s*else\s*:/.test(lines[e]) && RAISE_401.test(blockBody(lines, e))) return null;
  }
  if (negative.length || positive.length) return 'your missing-token check does not raise HTTPException with 401, so a request without a token is not refused: raise it there';
  return 'a request with no token is not refused before the call: answer 401 when authorization is missing';
});

// except clauses with the exception names they catch and the status their body raises.
function handlers(code) {
  const lines = code.split(/\r?\n/);
  const out = [];
  lines.forEach((line, i) => {
    const m = line.match(/^(\s*)except\b([^:]*):/);
    if (!m) return;
    const names = [...m[2].replace(/\bas\s+\w+\s*$/, '').matchAll(/(?:httpx\.)?([A-Za-z_]\w*)/g)].map((x) => x[1]);
    const body = blockBody(lines, i);
    const s = body.match(/HTTPException\s*\(\s*(?:status_code\s*=\s*)?(?:status\.HTTP_)?(\d{3})/) || body.match(/status_code\s*=\s*(\d{3})/);
    out.push({ line: i, names: names.length ? names : ['<bare>'], status: s ? s[1] : null });
  });
  return out;
}
const SUPER_OF_TIMEOUT = ['RequestError', 'TransportError', 'HTTPError', 'Exception', 'BaseException', '<bare>'];
// Everything that catches httpx.ConnectError: itself, its superclasses, or a bare except.
const CATCHES_CONNECT = ['ConnectError', 'NetworkError', 'TransportError', 'RequestError', 'HTTPError', 'Exception', 'BaseException', '<bare>'];

rule('reviews-error-mapping', null, (dir) => {
  const hs = handlers(mainPy(dir));
  const timeout = hs.find((h) => h.names.includes('TimeoutException'));
  if (!timeout) return 'catch HTTPX\'s timeout exception around the call and answer with the status the service-to-service page gives for a timeout';
  const shadow = hs.find((h) => h.line < timeout.line && h.names.some((n) => SUPER_OF_TIMEOUT.includes(n)));
  if (shadow) return `the ${shadow.names.join(', ')} handler comes before the TimeoutException one and catches timeouts first: Python runs the first matching except, so put TimeoutException first`;
  if (timeout.status !== '504') return 'the TimeoutException handler does not answer the status the service-to-service page gives when no timely response arrived';
  // Python runs the first except clause that matches, so that clause decides a refused connection's status.
  const refused = hs.find((h) => h.names.some((n) => CATCHES_CONNECT.includes(n)));
  if (!refused) return 'also catch the refused-connection case and answer with a status the service-to-service page allows for it, instead of letting the exception escape';
  if (['502', '503'].includes(refused.status)) return null;
  return refused === timeout
    ? 'your timeout handler also catches refused connections, so they get the timeout status: give the refused case its own handler with a status the service-to-service page allows for it'
    : `the first handler that catches a refused connection (${refused.names.join(', ')}) answers ${refused.status ?? 'no status'}: Python runs the first matching except, and a refused connection needs a status the service-to-service page allows for it`;
});

// ---------- .github/workflows/ci.yml ----------

const CI = '.github/workflows/ci.yml';
const workflow = (dir) => yamlFile(dir, CI);
const jobs = (dir) => workflow(dir).jobs || {};
const steps = (job) => (Array.isArray(job?.steps) ? job.steps : []);
const allSteps = (dir) => Object.values(jobs(dir)).flatMap((j) => steps(j).map((s) => ({ job: j, step: s })));

// A tiny evaluator for GitHub expressions over github.event_name / github.ref.
const RUNS = {
  'a pull request': { event_name: 'pull_request', ref: 'refs/pull/7/merge', ref_name: '7/merge' },
  'a push to main': { event_name: 'push', ref: 'refs/heads/main', ref_name: 'main' },
};
function evaluate(expr, ctx) {
  const src = String(expr).trim().replace(/^\$\{\{([\s\S]*)\}\}$/, '$1');
  const tokens = src.match(/'(?:[^']|'')*'|&&|\|\||==|!=|[!(),]|[A-Za-z_][\w.-]*|\S/g) || [];
  let k = 0;
  const peek = () => tokens[k];
  const take = (t) => { if (t && tokens[k] !== t) throw new Error('syntax'); return tokens[k++]; };
  function primary() {
    const t = take();
    if (t === undefined) throw new Error('syntax');
    if (t === '!') return !truthy(primary());
    if (t === '(') { const v = orExpr(); take(')'); return v; }
    if (t.startsWith("'")) return t.slice(1, -1).replace(/''/g, "'");
    if (t === 'true') return true;
    if (t === 'false') return false;
    if (/^(startsWith|endsWith|contains)$/i.test(t)) {
      take('('); const a = String(orExpr()); take(','); const b = String(orExpr()); take(')');
      const [x, y] = [a.toLowerCase(), b.toLowerCase()];
      return /^startsWith$/i.test(t) ? x.startsWith(y) : /^endsWith$/i.test(t) ? x.endsWith(y) : x.includes(y);
    }
    const m = t.match(/^github\.(event_name|ref|ref_name)$/);
    if (m) return ctx[m[1]];
    throw new Error(`unknown ${t}`);
  }
  const truthy = (v) => v !== false && v !== '' && v !== null && v !== undefined;
  function cmp() {
    let v = primary();
    while (peek() === '==' || peek() === '!=') {
      const op = take(); const r = primary();
      v = op === '==' ? String(v).toLowerCase() === String(r).toLowerCase() : String(v).toLowerCase() !== String(r).toLowerCase();
    }
    return v;
  }
  function andExpr() { let v = cmp(); while (peek() === '&&') { take(); const r = cmp(); v = truthy(v) ? r : v; } return v; }
  function orExpr() { let v = andExpr(); while (peek() === '||') { take(); const r = andExpr(); v = truthy(v) ? v : r; } return v; }
  const v = orExpr();
  if (k !== tokens.length) throw new Error('syntax');
  return truthy(v);
}
const runs = (cond, ctx) => (cond === undefined || cond === null ? true : typeof cond === 'boolean' ? cond : evaluate(cond, ctx));

function triggers(dir) {
  const on = workflow(dir).on;
  return typeof on === 'string' ? [on] : Array.isArray(on) ? on.map(String) : on && typeof on === 'object' ? Object.keys(on) : [];
}
rule('ci-trigger', CI, (dir) => {
  const t = triggers(dir);
  return t.includes('push') && t.includes('pull_request')
    ? null : 'the workflow must run for every pushed commit and for every pull request: reread the GitHub Actions pipeline page\'s on: block';
});

const isTestRun = (s) => /\bmvnw?\b[^\n]*\btest\b|\bnpm\b[^\n]*\btest\b|\bpytest\b/.test(String(s?.run ?? ''));
rule('ci-test-job', CI, (dir) => {
  const job = jobs(dir).test;
  if (!job || job['runs-on'] !== 'ubuntu-latest') return 'keep a test job with runs-on: ubuntu-latest';
  const list = steps(job);
  const checkout = list.findIndex((s) => /^actions\/checkout@\S+$/.test(String(s?.uses ?? '')));
  const tests = list.findIndex(isTestRun);
  if (tests < 0) return 'the test job must run the tests';
  if (checkout < 0) return 'the runner starts empty: the test job must get the repository\'s code before it can run the tests';
  return checkout < tests ? null : 'the checkout step comes after the test step, so the tests run on an empty runner: check out first';
});

rule('ci-needs', CI, (dir) => {
  const needs = jobs(dir).build?.needs;
  const list = Array.isArray(needs) ? needs.map(String) : needs ? [String(needs)] : [];
  return list.includes('test')
    ? null : 'the build job must run only after the test job succeeds: reread how the GitHub Actions pipeline page orders jobs';
});

rule('ci-build-push', CI, (dir) => {
  const job = jobs(dir).build;
  const step = steps(job).find((s) => /^docker\/build-push-action@\S+$/.test(String(s?.uses ?? '')));
  if (!step || !step.with) return 'build the image with a docker/build-push-action step in the build job';
  const context = String(step.with.context ?? '').replace(/^\.\//, '').replace(/\/$/, '');
  if (context !== 'reviews') return 'the build context must be the folder that holds the reviews Dockerfile, so the image the step tags is the reviews service';
  const result = {};
  try {
    for (const [name, ctx] of Object.entries(RUNS)) {
      const push = step.with.push;
      const pushes = push === undefined ? false : typeof push === 'boolean' ? push : String(push).trim() === 'true' ? true : String(push).trim() === 'false' ? false : evaluate(push, ctx);
      result[name] = runs(job.if, ctx) && runs(step.if, ctx) && pushes;
    }
  } catch {
    return 'write the push condition as an expression on github.event_name or github.ref, for example the one on the GitHub Actions pipeline page';
  }
  if (result['a pull request']) {
    return triggers(dir).includes('pull_request')
      ? 'as written, a pull request run would push an image: push must be off for pull requests'
      : 'once the workflow also runs on pull requests (test 1), this push setting would push their images too: push must be off for pull requests';
  }
  return result['a push to main']
    ? null : 'as written, a push to main never publishes the image: push must be on for a push to main';
});

// Variables a step can see whose value comes from the secrets context.
function secretVars(dir, job, step) {
  const out = {};
  for (const scope of [workflow(dir).env, job?.env, step?.env]) {
    for (const [k, v] of Object.entries(scope || {})) {
      const m = String(v ?? '').match(/\$\{\{\s*secrets\.([A-Za-z0-9_]+)\s*\}\}/);
      if (m) out[k] = m[1];
    }
  }
  return out;
}
// Shell commands of a run script, with backslash continuations and lines ending in a pipe joined first.
const commands = (run) => String(run ?? '')
  .replace(/\\\r?\n[ \t]*/g, ' ')
  .replace(/(^|[^|])\|[ \t]*\r?\n[ \t]*/g, '$1| ')
  .split(/\n|;|&&|\|\|/).map((c) => c.trim()).filter(Boolean);
// A secret-mapped variable used as $NAME, ${NAME} or the env context ${{ env.NAME }}.
const envContext = (v) => `\\$\\{\\{\\s*env\\.${v}\\s*\\}\\}`;
const refersTo = (text, vars) => Object.keys(vars).find((v) => new RegExp(`\\$\\{?${v}\\b|${envContext(v)}`).test(text));
const inlineSecret = (text, vars) => /\$\{\{\s*secrets\./.test(text) || Object.keys(vars).some((v) => new RegExp(envContext(v)).test(text));
const ARGV_PASSWORD = /(^|\s)(-p\S*|--password(?!-stdin)\S*)/;

rule('ci-secret-refs', CI, (dir) => {
  for (const { step } of allSteps(dir)) {
    const loginParts = commands(step?.run).flatMap((c) => c.split('|')).filter((c) => /\bdocker\s+login\b/.test(c));
    if (loginParts.some((c) => ARGV_PASSWORD.test(c))) {
      return 'a password is given on the docker login command line (-p or --password), where it lands in the workflow file, process lists or the log: pipe it to --password-stdin from a repository secret';
    }
  }
  const logins = allSteps(dir).filter(({ step }) => /\bdocker\s+login\b/.test(String(step?.run ?? '')) || /^docker\/login-action@/.test(String(step?.uses ?? '')));
  if (!logins.length) return 'keep a registry login step in the build job, signed in with the REGISTRY_USERNAME and REGISTRY_PASSWORD repository secrets';
  for (const { job, step } of logins) {
    if (step.uses) {
      const ok = /secrets\.REGISTRY_USERNAME/.test(String(step.with?.username ?? '')) && /secrets\.REGISTRY_PASSWORD/.test(String(step.with?.password ?? ''));
      if (!ok) return 'the login action\'s username and password must come from the REGISTRY_USERNAME and REGISTRY_PASSWORD repository secrets: Docker Hub is not GitHub, so GITHUB_TOKEN cannot sign in there';
      continue;
    }
    const run = String(step.run);
    const vars = secretVars(dir, job, step);
    if (inlineSecret(run, vars)) return 'the login command writes a ${{ ... }} expression into the command text, which puts the secret itself into the script: map each secret into the step\'s env and use the shell variable, as the secrets page shows';
    const line = commands(run).find((c) => /\bdocker\s+login\b/.test(c)) ?? '';
    // A pipeline of any length whose last stage is docker login: everything before it is the feed.
    const stages = line.split('|').map((x) => x.trim());
    const login = stages.length > 1 ? stages.at(-1) : undefined;
    const feed = stages.slice(0, -1).join(' | ');
    if (!login && /--password-stdin\b/.test(line)) return 'pipe the password into docker login with echo or printf and |, the form this lab checks (a here-string or file redirect is not accepted here)';
    if (!login || !/--password-stdin\b/.test(login)) return 'feed the password to docker login through --password-stdin';
    const pwVar = refersTo(feed, vars);
    if (!pwVar || vars[pwVar] !== 'REGISTRY_PASSWORD') return 'the password piped to docker login must be an env variable mapped from secrets.REGISTRY_PASSWORD';
    const user = login.match(/(?:-u|--username)(?:=|\s+)("?)([^\s"]+)\1/);
    const userVar = user && refersTo(user[2], vars);
    if (!userVar || vars[userVar] !== 'REGISTRY_USERNAME') return 'the username given to docker login must be an env variable mapped from secrets.REGISTRY_USERNAME';
  }
  return null;
});

rule('ci-pinned-actions', CI, (dir) => {
  const all = allSteps(dir).map(({ step }) => String(step?.uses ?? '')).filter(Boolean);
  if (!all.length) return 'the workflow has no uses: steps yet; add them, each pinned to a full commit SHA';
  for (const uses of all) {
    if (uses.startsWith('./')) continue;
    if (!/^[^@]+@[0-9a-f]{40}$/.test(uses)) {
      return `${uses.split('@')[0]} is not pinned: a branch or version tag can change under you, so pin every action to its full 40-character commit SHA and keep the release tag in a trailing comment`;
    }
  }
  return null;
});

// Commands that write or encode what they are given (arguments, a here-string or a redirect).
const PRINTERS = /^(echo|printf|cat|print|tee|base64|xxd|od|hexdump|openssl)\b/;
const PRINTS_SECRET = 'a run step writes a secret (directly, through an env variable or encoded) to the run log: reread the secrets page on why a workflow never prints one, and delete that output';
// Here-documents in a run script: the command line that opens each one, and its body.
// A quoted delimiter stops the shell expanding $NAME, but ${{ }} is filled in by Actions first.
function heredocs(run) {
  const out = [];
  for (const m of String(run ?? '').matchAll(/^([^\n]*?)<<-?[ \t]*(['"]?)([A-Za-z_]\w*)\2[^\n]*\n([\s\S]*?)^[ \t]*\3[ \t]*$/gm)) {
    out.push({ command: m[1].trim(), quoted: m[2] !== '', body: m[4] });
  }
  return out;
}
rule('ci-no-secret-prints', CI, (dir) => {
  for (const { job, step } of allSteps(dir)) {
    const vars = secretVars(dir, job, step);
    for (const command of commands(step?.run)) {
      if (/::add-mask::/.test(command)) continue;
      const parts = command.split('|').map((x) => x.trim());
      // A pipeline that ends in docker login --password-stdin hands the value to docker, not to the log.
      const last = parts.at(-1);
      const intoLogin = parts.length > 1 && /\bdocker\s+login\b/.test(last) && /--password-stdin\b/.test(last);
      if (intoLogin) {
        // tee copies what it passes on to stdout, stderr or the terminal, which all reach the log.
        if (parts.slice(1, -1).some((p) => /^tee\b/.test(p) && (/\/dev\/(stdout|stderr|tty|fd\/[12])\b/.test(p) || /^tee(\s+-\S+)*\s*$/.test(p)))) return PRINTS_SECRET;
        continue;
      }
      if (parts.some((part) => PRINTERS.test(part) && (inlineSecret(part, vars) || refersTo(part, vars)))) return PRINTS_SECRET;
    }
    for (const doc of heredocs(step?.run)) {
      const into = doc.command.split('|').map((x) => x.trim());
      if (!PRINTERS.test(into[0])) continue;
      if (/\bdocker\s+login\b/.test(into.at(-1)) && /--password-stdin\b/.test(into.at(-1))) continue;
      if (inlineSecret(doc.body, vars) || (!doc.quoted && refersTo(doc.body, vars))) return PRINTS_SECRET;
    }
  }
  return null;
});

function leastAccess(p) {
  if (typeof p === 'string') return `permissions: ${p} is not least access: list each permission the workflow needs as key: value, starting with contents`;
  if (!p || typeof p !== 'object') return 'add a permissions block so GITHUB_TOKEN gets the least access this workflow needs';
  if (p.contents !== 'read') return 'this workflow only reads the repository\'s code: give GITHUB_TOKEN that read access, as the secrets page\'s least-access rule says';
  return Object.entries(p).every(([k, v]) => k === 'contents' || v === 'none')
    ? null : 'grant GITHUB_TOKEN nothing beyond reading the code: the Docker Hub login uses stored secrets, not GITHUB_TOKEN, and anything you do not list becomes none';
}
rule('ci-permissions', CI, (dir) => {
  const top = workflow(dir).permissions;
  const all = Object.values(jobs(dir));
  const has = (p) => p !== undefined && p !== null;
  if (has(top)) {
    // A job-level block replaces the top-level one for that job, so each must also be least access.
    for (const p of [top, ...all.map((j) => j?.permissions).filter(has)]) {
      const problem = leastAccess(p);
      if (problem) return problem;
    }
    return null;
  }
  // Without a top-level block, every job must carry its own.
  if (!all.length || all.some((j) => !has(j?.permissions))) {
    return 'add a top-level permissions block, as the secrets page shows, so GITHUB_TOKEN gets the least access this workflow needs';
  }
  for (const j of all) {
    const problem = leastAccess(j.permissions);
    if (problem) return problem;
  }
  return null;
});

// ---------- decisions.yaml ----------

const DECISIONS = 'decisions.yaml';
const decisions = (dir) => yamlFile(dir, DECISIONS);
const whyOk = (section) => String(section?.why ?? '').trim().length >= 20;
// The first field whose value differs from the expected one, as a reread hint.
function firstWrong(section, expected, hints) {
  for (const [field, value] of Object.entries(expected)) {
    if (String(section?.[field] ?? '').trim() !== value) return `${field}: ${hints[field]}`;
  }
  return null;
}

rule('decide-architecture', DECISIONS, (dir) => {
  const d = decisions(dir).architecture || {};
  return firstWrong(d, {
    redeploys_everything_for_one_change: 'monolith',
    keeps_a_reviews_crash_away_from_checkout: 'microservices',
    scales_only_the_busy_part: 'microservices',
    cost_in_the_brief: 'operational-overhead',
    reviews_reading_shop_tables_directly: 'forbidden',
  }, {
    redeploys_everything_for_one_change: 'reread incident 2 in the brief and the monolith page\'s deployment question',
    keeps_a_reviews_crash_away_from_checkout: 'reread incident 1 and what the page says fails together',
    scales_only_the_busy_part: 'reread incident 3 and what the page says can be scaled alone',
    cost_in_the_brief: 'reread the two first-week problems and match them to one of the page\'s three costs',
    reviews_reading_shop_tables_directly: 'reread the database-per-service rule on the monolith page',
  }) ?? (whyOk(d) ? null : 'write at least a sentence of your own reasoning in architecture.why');
});

rule('decide-data-stores', DECISIONS, (dir) => {
  const d = decisions(dir).data_stores || {};
  return firstWrong(d, {
    request_counters: 'key-value',
    order_history: 'relational',
    review_bodies: 'document',
    different_store_types_are_enabled_by: 'database-per-service',
  }, {
    request_counters: 'reread how the brief says these are read and written, then the SQL vs NoSQL page',
    order_history: 'reread how the brief says these are read and written, then the SQL vs NoSQL page',
    review_bodies: 'reread how the brief says these are read and written, then the SQL vs NoSQL page',
    different_store_types_are_enabled_by: 'reread the SQL vs NoSQL page\'s side effect of one taught pattern',
  }) ?? (whyOk(d) ? null : 'write at least a sentence of your own reasoning in data_stores.why');
});

rule('decide-store-contrast', DECISIONS, (dir) => {
  const d = decisions(dir).store_contrast || {};
  const want = {
    schema: { relational: 'declared-up-front', document: 'flexible-per-record', key_value: 'none-for-the-value' },
    querying: { relational: 'rich-sql-with-joins', document: 'by-fields-inside-a-record', key_value: 'get-and-put-by-key' },
    consistency: { relational: 'acid-across-rows', document: 'often-narrower-transaction-scope', key_value: 'varies-with-simple-operations' },
  };
  for (const [question, stores] of Object.entries(want)) {
    for (const [store, value] of Object.entries(stores)) {
      if (String(d[question]?.[store] ?? '').trim() !== value) return `store_contrast.${question}.${store}: reread the SQL vs NoSQL page's comparison of the three store types on ${question}`;
    }
  }
  return null;
});

rule('decide-gateway-discovery', DECISIONS, (dir) => {
  const d = decisions(dir).gateway_and_discovery || {};
  return firstWrong(d, {
    shared_concern_at_gateway: 'authentication',
    discovery_setup_a: 'client-side-discovery',
    discovery_setup_b: 'server-side-discovery',
    compose_service_names_are: 'a-simple-form-of-service-discovery',
  }, {
    shared_concern_at_gateway: 'reread what the brief wants done once, before any service is reached',
    discovery_setup_a: 'reread setup A and ask who talks to the registry',
    discovery_setup_b: 'reread setup B and ask who talks to the registry',
    compose_service_names_are: 'a stable name resolved by DNS to a changing address: reread the last part of the gateways page',
  }) ?? (whyOk(d) ? null : 'write at least a sentence of your own reasoning in gateway_and_discovery.why');
});

rule('decide-service-calls', DECISIONS, (dir) => {
  const d = decisions(dir).service_calls || {};
  return firstWrong(d, {
    listening_on_127_0_0_1: 'only-processes-in-the-same-container',
    httpx_with_no_timeout_argument: 'stops-after-about-five-seconds',
    httpx_with_timeout_none: 'waits-with-no-limit',
    restclient_with_nothing_set: 'waits-with-no-limit',
    restclient_read_limit_is_set_on: 'the-request-factory',
  }, {
    listening_on_127_0_0_1: 'reread the adding-FastAPI page on the two listen addresses',
    httpx_with_no_timeout_argument: 'reread the service-to-service page on HTTPX\'s documented default',
    httpx_with_timeout_none: 'reread what timeout=None does on the service-to-service page',
    restclient_with_nothing_set: 'reread the service-to-service page on a JDK-backed RestClient with nothing set',
    restclient_read_limit_is_set_on: 'reread the RestClient example on the service-to-service page',
  });
});

rule('decide-image-reference', DECISIONS, (dir) => {
  const d = decisions(dir).image_reference || {};
  return firstWrong(d, {
    registry: 'docker.io',
    repository: 'pepshop/reviews',
    tag: '1.4.2',
    short_reference_registry: 'docker.io',
    short_reference_tag: 'latest',
    a_registry_stores: 'images-in-repositories',
  }, {
    registry: 'split the pushed reference in fixtures/briefs/image-reference.txt as the Jenkins, registries, CD and Kubernetes reading shows',
    repository: 'split the pushed reference in fixtures/briefs/image-reference.txt as the reading shows',
    tag: 'split the pushed reference in fixtures/briefs/image-reference.txt as the reading shows',
    short_reference_registry: 'reread what Docker assumes when a reference leaves out the registry',
    short_reference_tag: 'reread what Docker assumes when a reference leaves out the tag',
    a_registry_stores: 'reread the reading\'s first sentence about registries',
  });
});

rule('decide-secrets-in-logs', DECISIONS, (dir) => {
  const d = decisions(dir).secrets_in_logs || {};
  return firstWrong(d, {
    log_redaction_is: 'best-effort',
    hide_a_derived_value_by: 'register-it-with-add-mask',
    fork_pull_request_run_receives: 'only-github-token',
  }, {
    log_redaction_is: 'reread how the secrets page describes GitHub\'s redaction',
    hide_a_derived_value_by: 'reread how the secrets page hides a value derived from a secret',
    fork_pull_request_run_receives: 'reread the secrets page on runs triggered from a fork',
  });
});

rule('decide-delivery', DECISIONS, (dir) => {
  const d = decisions(dir).delivery || {};
  return firstWrong(d, {
    github_actions_jobs_run: 'in-parallel-unless-needs',
    jenkinsfile_stages_run: 'in-listed-order',
    gives_pods_one_stable_address: 'service',
    keeps_three_replicas_running: 'deployment',
    release_policy_in_the_brief_is: 'continuous-deployment',
  }, {
    github_actions_jobs_run: 'reread how the GitHub Actions pipeline page orders jobs',
    jenkinsfile_stages_run: 'the reading names the one ordering difference between stages and jobs',
    gives_pods_one_stable_address: 'which Kubernetes object fronts changing Pods with one stable way in?',
    keeps_three_replicas_running: 'which Kubernetes object declares a desired replica count?',
    release_policy_in_the_brief_is: 'reread the brief\'s release policy and the reading\'s difference between the two practices',
  }) ?? (whyOk(d) ? null : 'write at least a sentence of your own reasoning in delivery.why');
});

// Assert helper for the public tests: message is the rule's own stable text.
export const check = (id, dir = PROJECT) => RULES[id](dir);
