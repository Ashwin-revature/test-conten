// Shared readers and rule checks for the public lab tests. They read files as
// text and YAML; nothing here builds an image, starts a container, runs
// Python or calls any network. Each rule returns null when the project
// satisfies it, or one stable message saying what is wrong.
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';

// The learner project: the starter folder, or LAB_PROJECT when set (for a copy elsewhere).
export const PROJECT = path.resolve(process.env.LAB_PROJECT || path.join(import.meta.dirname, '..', 'starter'));

const posix = path.posix;
const has = (dir, rel) => existsSync(path.join(dir, rel));
const read = (dir, rel) => (has(dir, rel) ? readFileSync(path.join(dir, rel), 'utf8') : '');

export const RULES = {};
const rule = (id, fn) => { RULES[id] = fn; };

// ---------- shared YAML helpers ----------

function yamlFile(dir, rel) {
  try { return parse(read(dir, rel)) || {}; } catch { return {}; }
}
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
  return dot && dot[m[1]] ? { ok: true, value: dot[m[1]], from: '.env' } : { ok: false, why: 'missing-var', name: m[1] };
}

const buildContext = (s) => String(typeof s?.build === 'string' ? s.build : s?.build?.context || '').replace(/^\.\//, '').replace(/\/$/, '');
// The reviews service's own database: a postgres service other than the shop's db.
const reviewsDbName = (dir) => Object.keys(services(dir))
  .find((k) => k !== 'db' && /^postgres:/.test(String(services(dir)[k]?.image || '')));

// ---------- compose.yaml ----------

rule('compose-reviews-service', (dir) => {
  const sv = services(dir);
  return buildContext(sv.reviews) === 'reviews'
    ? null : 'add a service named reviews with build: ./reviews, next to the provided api and db services';
});

rule('compose-reviews-db', (dir) => {
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

rule('compose-reviews-env', (dir) => {
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
  const dbPw = resolvedPart(dir, env(sv[name]).POSTGRES_PASSWORD);
  if (dbPw.literal) return 'POSTGRES_PASSWORD on the reviews database is a literal: use the same ${...} reference as DATABASE_URL';
  if (!dbPw.ok || dbPw.value !== pw.value) return 'the reviews database must receive the same password value that DATABASE_URL carries';
  const dbName = resolvedPart(dir, env(sv[name]).POSTGRES_DB);
  const user = resolvedPart(dir, env(sv[name]).POSTGRES_USER);
  return dbName.ok && m[5] === dbName.value && user.ok && m[1] === user.value
    ? null : 'the DATABASE_URL user and database name must match the POSTGRES_USER and POSTGRES_DB the reviews database service creates';
});

rule('compose-reviews-depends', (dir) => {
  const name = reviewsDbName(dir);
  const sv = services(dir);
  const t = name && sv[name]?.healthcheck?.test;
  const list = Array.isArray(t) ? t.map(String) : (t ? ['CMD-SHELL', String(t)] : []);
  if (!['CMD', 'CMD-SHELL'].includes(list[0]) || !list.slice(1).join(' ').includes('pg_isready')) {
    return 'give the reviews database a healthcheck whose test runs pg_isready, as the db service already shows';
  }
  const dep = sv.reviews?.depends_on;
  return dep && !Array.isArray(dep) && dep[name]?.condition === 'service_healthy'
    ? null : 'make reviews wait for its own database with depends_on and condition: service_healthy';
});

rule('compose-api-base-url', (dir) => {
  return String(env(services(dir).reviews).API_BASE_URL || '') === 'http://api:8080'
    ? null : 'set API_BASE_URL on reviews to http://api:8080: the api service name and its container port, never localhost or a published host port';
});

rule('compose-reviews-ports', (dir) => {
  const sv = services(dir);
  const local = (p) => (typeof p === 'object' ? ['127.0.0.1', '::1'].includes(String(p.host_ip)) : /^(127\.0\.0\.1|\[::1\]):\d+:\d+/.test(String(p)));
  if (!(sv.reviews?.ports || []).length) return 'publish the reviews port so a browser on this machine can reach it';
  const published = [sv.reviews, reviewsDbName(dir) ? sv[reviewsDbName(dir)] : null]
    .flatMap((s) => s?.ports || []);
  return published.every(local)
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
    const args = m[2];
    if (op === 'FROM') {
      const f = args.split(/\s+/).filter((w) => !w.startsWith('--'));
      stages.push({ image: (f[0] || '').toLowerCase(), name: /^as$/i.test(f[1] || '') ? (f[2] || '').toLowerCase() : null, steps: [] });
      continue;
    }
    if (stages.at(-1)) stages.at(-1).steps.push({ op, args });
  }
  return stages;
}
function words(args) {
  const a = args.trim();
  if (a.startsWith('[')) {
    try { return JSON.parse(a).map(String); } catch { return []; }
  }
  return a.split(/\s+/).filter(Boolean);
}
const isCopy = (s) => s.op === 'COPY' || s.op === 'ADD';
const copyWords = (s) => words(s.args.replace(/--\S+/g, ''));

rule('reviews-image', (dir) => {
  const s = dockerfile(dir, 'reviews/Dockerfile');
  if (!s.length || !/^python:3/.test(s[0].image)) return 'reviews/Dockerfile must start FROM a tagged Python 3 image, such as python:3.14-slim';
  return s[0].steps.some((x) => x.op === 'WORKDIR')
    ? null : 'set a WORKDIR so the copy and start steps have a stable folder';
});

rule('reviews-deps-order', (dir) => {
  const steps = dockerfile(dir, 'reviews/Dockerfile')[0]?.steps ?? [];
  const req = steps.findIndex((x) => isCopy(x) && copyWords(x).slice(0, -1).some((w) => posix.basename(w) === 'requirements.txt'));
  const install = steps.findIndex((x, i) => i > req && x.op === 'RUN' && /\bpip3?\b[^&|;]*\binstall\b/.test(x.args) && /requirements\.txt/.test(x.args));
  const app = steps.findIndex((x, i) => i > install && isCopy(x) && copyWords(x).slice(0, -1).some((w) => /^(\.\/)?(app\/?|\.)$/.test(w)));
  return req >= 0 && install > req && app > install
    ? null : 'COPY requirements.txt, RUN pip install -r requirements.txt, then COPY the app folder, in that order, so the dependency layer stays cached';
});

rule('reviews-listen', (dir) => {
  const s = dockerfile(dir, 'reviews/Dockerfile');
  const start = s.length ? [...s.at(-1).steps].reverse().find((x) => x.op === 'ENTRYPOINT' || x.op === 'CMD') : null;
  if (!start) return 'start the server with a CMD or ENTRYPOINT instruction';
  const w = words(start.args);
  if (w.includes('fastapi')) {
    if (w.includes('dev')) return 'fastapi dev listens on 127.0.0.1, which no other container can reach: use fastapi run';
    const host = w.indexOf('--host');
    return w.includes('run') && (host < 0 || w[host + 1] === '0.0.0.0')
      ? null : 'start with fastapi run so the server listens on 0.0.0.0';
  }
  if (w.some((x) => /uvicorn/.test(x))) {
    const host = w.indexOf('--host');
    return host >= 0 && w[host + 1] === '0.0.0.0'
      ? null : 'uvicorn defaults to 127.0.0.1: pass --host 0.0.0.0 so published and service-to-service ports work';
  }
  return 'start the FastAPI app with fastapi run (or uvicorn --host 0.0.0.0)';
});

function ignoreEntries(dir, rel) {
  return read(dir, rel).split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))
    .map((l) => l.replace(/^\.\//, '').replace(/^\/+/, '').replace(/^\*\*\//, '').replace(/\/+$/, ''));
}
rule('reviews-ignore', (dir) => {
  const have = new Set(ignoreEntries(dir, 'reviews/.dockerignore'));
  return ['__pycache__', '.git', '.env'].every((n) => have.has(n))
    ? null : 'reviews/.dockerignore must list __pycache__, .git and .env';
});

// ---------- reviews/app/main.py (read as text; never executed) ----------

const mainPy = (dir) => read(dir, 'reviews/app/main.py');

rule('reviews-timeouts', (dir) => {
  const text = mainPy(dir);
  const call = text.match(/httpx\.Timeout\s*\(([^)]*)\)/);
  if (!call) return 'build an httpx.Timeout(...) with explicit limits and pass it as the timeout argument of the outgoing call';
  const args = call[1];
  const hasConnect = /\bconnect\s*=/.test(args);
  // httpx.Timeout needs a default (first positional or timeout=) or all four
  // limits set explicitly; anything else raises ValueError at runtime.
  const hasDefault = /^\s*[0-9.]+\s*(,|$)/.test(args) || /\btimeout\s*=/.test(args);
  const allFour = ['connect', 'read', 'write', 'pool'].every((k) => new RegExp(`\\b${k}\\s*=`).test(args));
  if (!hasConnect || !(hasDefault || allFour)) {
    return 'set an explicit connect limit plus a read limit httpx accepts: give Timeout a default that covers read, for example httpx.Timeout(3.0, connect=2.0), or set all four of connect, read, write and pool';
  }
  if (/timeout\s*=\s*None/.test(text)) return 'timeout=None disables every limit, so a hanging api would hang reviews: remove it';
  return /timeout\s*=/.test(text.replace(/httpx\.Timeout/g, 'HT'))
    ? null : 'pass your httpx.Timeout object as the timeout argument of the call';
});

rule('reviews-auth-forward', (dir) => {
  const text = mainPy(dir);
  if (/["']Bearer\s+[A-Za-z0-9._-]+["']/.test(text)) return 'a bearer token is hard-coded: forward the caller\'s Authorization header instead of writing a token into the source';
  return /["']Authorization["']\s*:\s*authorization\b/.test(text)
    ? null : 'send the incoming authorization parameter on as the outgoing Authorization header';
});

rule('reviews-error-mapping', (dir) => {
  const text = mainPy(dir);
  const timeout = /except[^\n:]*httpx\.TimeoutException[^\n:]*:/.test(text) && /HTTPException\(\s*(status_code\s*=\s*)?504\b/.test(text);
  if (!timeout) return 'catch httpx.TimeoutException and answer 504 Gateway Timeout, as the topic page shows';
  const refused = /except[^\n:]*httpx\.(ConnectError|RequestError)[^\n:]*:/.test(text) && /HTTPException\(\s*(status_code\s*=\s*)?50[23]\b/.test(text);
  return refused
    ? null : 'catch the refused-connection case (httpx.ConnectError or httpx.RequestError) and answer 502 or 503 instead of letting the exception escape';
});

// ---------- .github/workflows/ci.yml ----------

const workflow = (dir) => yamlFile(dir, '.github/workflows/ci.yml');
const jobs = (dir) => workflow(dir).jobs || {};
const steps = (job) => (Array.isArray(job?.steps) ? job.steps : []);
const runText = (dir) => steps(jobs(dir).test).concat(steps(jobs(dir).build))
  .map((s) => String(s?.run ?? '')).filter(Boolean);

rule('ci-trigger', (dir) => {
  const on = workflow(dir).on;
  const names = typeof on === 'string' ? [on] : Array.isArray(on) ? on.map(String) : on && typeof on === 'object' ? Object.keys(on) : [];
  return names.includes('push')
    ? null : 'the workflow must run on push (pull_request may be listed too); workflow_dispatch alone never runs for a commit';
});

rule('ci-test-job', (dir) => {
  const job = jobs(dir).test;
  if (!job || job['runs-on'] !== 'ubuntu-latest') return 'keep a test job with runs-on: ubuntu-latest';
  const hasCheckout = steps(job).some((s) => /^actions\/checkout@\S+$/.test(String(s?.uses ?? '')));
  if (!hasCheckout) return 'the runner starts empty: the test job needs an actions/checkout step before it can run the tests';
  return steps(job).some((s) => /\b(mvnw|mvn|npm)\b[^\n]*\btest\b/.test(String(s?.run ?? '')))
    ? null : 'after checkout, the test job must run the tests, for example ./mvnw test';
});

rule('ci-needs', (dir) => {
  const needs = jobs(dir).build?.needs;
  const list = Array.isArray(needs) ? needs.map(String) : needs ? [String(needs)] : [];
  return list.includes('test')
    ? null : 'give the build job needs: test, so an image is only built after the tests succeed';
});

rule('ci-build-push', (dir) => {
  const step = steps(jobs(dir).build).find((s) => /^docker\/build-push-action@\S+$/.test(String(s?.uses ?? '')));
  if (!step || !step.with || !('context' in step.with)) return 'build the image with a pinned docker/build-push-action step whose with block sets the build context';
  const push = String(step.with.push ?? '');
  const conditional = /\$\{\{[^}]*github\.(ref|event_name)[^}]*\}\}/;
  if (conditional.test(push)) return null;
  if (push === 'true' && conditional.test(String(step.if ?? ''))) return null;
  return 'push must depend on where the run came from, for example push: ${{ github.event_name != \'pull_request\' }}; an unconditional true pushes every experiment and false never publishes at all';
});

rule('ci-secret-refs', (dir) => {
  const text = read(dir, '.github/workflows/ci.yml');
  const refs = ['REGISTRY_USERNAME', 'REGISTRY_PASSWORD']
    .every((n) => new RegExp(`\\$\\{\\{\\s*secrets\\.${n}\\s*\\}\\}`).test(text));
  if (!refs) return 'take the registry credentials from the secrets context: ${{ secrets.REGISTRY_USERNAME }} and ${{ secrets.REGISTRY_PASSWORD }}';
  for (const run of runText(dir)) {
    const p = run.match(/(?:^|\s)(?:-p|--password)[=\s]+(.+)$/m);
    if (!p) continue;
    if (/\$/.test(p[1])) return 'the password is passed as a command-line argument, where it lands in history and process lists: pipe it to docker login --password-stdin instead';
    return 'a literal credential is written after -p in a run step: it belongs in a repository secret, never in the workflow file';
  }
  return null;
});

rule('ci-pinned-actions', (dir) => {
  const all = [...steps(jobs(dir).test), ...steps(jobs(dir).build)]
    .map((s) => String(s?.uses ?? '')).filter(Boolean);
  if (!all.length) return 'the workflow has no uses: steps yet; add them, each pinned to a full commit SHA';
  for (const uses of all) {
    if (uses.startsWith('./')) continue;
    if (!/^[^@]+@[0-9a-f]{40}$/.test(uses)) {
      return `${uses.split('@')[0]} is not pinned: a branch, floating or version tag can change under you, so pin every action to its full 40-character commit SHA and keep the release tag in a trailing comment`;
    }
  }
  return null;
});

rule('ci-no-secret-prints', (dir) => {
  for (const run of runText(dir)) {
    if (/\b(echo|printf|cat)\b/.test(run) && /\$\{\{\s*secrets\./.test(run) && !run.includes('add-mask')) {
      return 'a run step prints a secret: redaction is best effort, not a permission boundary, so delete the printing step';
    }
  }
  return null;
});

rule('ci-permissions', (dir) => {
  const p = workflow(dir).permissions;
  if (!p || typeof p !== 'object') return 'add a top-level permissions block so GITHUB_TOKEN gets the least access this workflow needs';
  if (p.contents !== 'read') return 'the workflow only reads the repository: set permissions to contents: read';
  return Object.values(p).every((v) => v !== 'write')
    ? null : 'no permission here needs write: anything you do not list already becomes none';
});

// ---------- decisions.yaml ----------

const decisions = (dir) => yamlFile(dir, 'decisions.yaml');
const whyOk = (section) => String(section?.why ?? '').trim().length >= 20;

rule('decide-image-reference', (dir) => {
  const d = decisions(dir).image_reference || {};
  return d.registry === 'ghcr.io' && d.repository === 'pepshop/reviews' && d.tag === '1.4.2'
    ? null : 'split the reference in fixtures/briefs/image-reference.txt into registry, repository and tag exactly as written';
});

rule('decide-gateway-discovery', (dir) => {
  const d = decisions(dir).gateway_and_discovery || {};
  if (d.shared_concern_at_gateway !== 'authentication') return 'shared_concern_at_gateway: the brief wants login tokens checked once before any service is reached; pick the concern a gateway centralises';
  if (d.discovery_setup_a !== 'the-calling-service') return 'discovery_setup_a: reread setup A and ask who talks to the registry';
  if (d.discovery_setup_b !== 'a-router-in-front') return 'discovery_setup_b: reread setup B and ask who talks to the registry';
  if (d.compose_service_names_are !== 'a-simple-form-of-service-discovery') return 'compose_service_names_are: a stable name resolved by DNS to a changing address is which of the three?';
  return whyOk(d) ? null : 'write at least a sentence of your own reasoning in gateway_and_discovery.why';
});

rule('decide-architecture', (dir) => {
  const d = decisions(dir).architecture || {};
  if (d.redeploys_everything_for_one_change !== 'monolith') return 'redeploys_everything_for_one_change: the brief\'s price-fix incident shows which architecture ships everything together';
  if (d.scales_only_the_busy_part !== 'microservices') return 'scales_only_the_busy_part: the promotion incident shows which architecture can add capacity for one part without copying everything';
  if (d.keeps_a_reviews_crash_away_from_checkout !== 'microservices') return 'keeps_a_reviews_crash_away_from_checkout: the heap incident shows what one process means for failure isolation';
  if (d.cost_in_the_brief !== 'operational-overhead') return 'cost_in_the_brief: reread the two first-week problems and ask which taught cost both of them are examples of';
  if (d.reviews_reading_shop_tables_directly !== 'forbidden') return 'reviews_reading_shop_tables_directly: database-per-service says another service\'s tables are reached only through its API';
  return whyOk(d) ? null : 'write at least a sentence of your own reasoning in architecture.why';
});

rule('decide-data-stores', (dir) => {
  const d = decisions(dir).data_stores || {};
  if (d.cart_sessions !== 'key-value') return 'cart_sessions: whole-value reads and writes by one id, with expiry, fit which store?';
  if (d.order_history !== 'relational') return 'order_history: multi-row transactions and reporting joins fit which store?';
  if (d.review_bodies !== 'document') return 'review_bodies: nested records with changing fields, filtered by fields, fit which store?';
  if (d.different_store_types_are_enabled_by !== 'database-per-service') return 'different_store_types_are_enabled_by: which taught pattern lets each service pick its own store?';
  return whyOk(d) ? null : 'write at least a sentence of your own reasoning in data_stores.why';
});

const CONTRAST = {
  relational: { schema: 'declared-up-front', querying: 'rich-sql-with-joins', consistency: 'acid-across-rows' },
  document: { schema: 'flexible-per-record', querying: 'by-fields-inside-a-record', consistency: 'often-narrower-transaction-scope' },
  key_value: { schema: 'none-for-the-value', querying: 'get-and-put-by-key', consistency: 'varies-simple-operations' },
};
rule('decide-store-contrast', (dir) => {
  const d = decisions(dir).store_contrast || {};
  for (const [store, expected] of Object.entries(CONTRAST)) {
    for (const [question, value] of Object.entries(expected)) {
      if (d[store]?.[question] !== value) return `store_contrast.${store}.${question}: reread the SQL vs NoSQL page's comparison of the three store types on ${question}`;
    }
  }
  return whyOk(d) ? null : 'write at least a sentence of your own reasoning in store_contrast.why';
});

rule('decide-delivery', (dir) => {
  const d = decisions(dir).delivery || {};
  if (d.jenkinsfile_stages_run !== 'in-listed-order') return 'jenkinsfile_stages_run: the topic page names the one ordering difference between stages and jobs';
  if (d.github_actions_jobs_run !== 'in-parallel-unless-needs') return 'github_actions_jobs_run: what do jobs do without a needs line?';
  if (d.keeps_three_replicas_running !== 'deployment') return 'keeps_three_replicas_running: which Kubernetes object declares a desired replica count?';
  if (d.gives_pods_one_stable_address !== 'service') return 'gives_pods_one_stable_address: which Kubernetes object fronts changing Pods with one stable way in?';
  if (d.manual_approval_before_production !== 'continuous-delivery') return 'manual_approval_before_production: staging updates automatically and a lead approves production; the topic page names this practice';
  return whyOk(d) ? null : 'write at least a sentence of your own reasoning in delivery.why';
});

// Assert helper for the public tests: message is the rule's own stable text.
export const check = (id, dir = PROJECT) => RULES[id](dir);
