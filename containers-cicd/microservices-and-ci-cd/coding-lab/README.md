# Lab: grow the shop into services and automate it

## Goal

The shop from the Containers and Compose lab gets its first microservice and its first pipeline.
A teammate drafted the pieces; you repair and complete them.
Twenty-seven public tests read your files as text and YAML and check them against the rules this module taught.
Nothing in this lab builds an image, starts a container, runs Python or triggers a workflow, so you need no container engine and no CI runner.

Finish this module's topic pages before the matching phase: the S38 pages before phases 1-5, and the S39 pages (the GitHub Actions pipeline, secrets in CI, and the optional Jenkins, registries, CD and Kubernetes reading) before phases 6-7.
Phase 7 asks about that optional reading, so read it before phase 7.

## What you edit

All paths are under `starter/`. Each file carries a `TODO` or a header comment naming its phase.

| File | What you do | Phase |
| --- | --- | --- |
| `.env` | Create it by copying `fixtures/.env.example` unchanged | 1 |
| `compose.yaml` | Uncomment the `reviews` draft and repair it | 2 |
| `reviews/Dockerfile` | Repair the image build | 3 |
| `reviews/.dockerignore` | List what stays out of the build context | 3 |
| `reviews/app/main.py` | Make the call to the shop api safe | 4 |
| `decisions.yaml` | Answer the design questions from the brief | 5 and 7 |
| `.github/workflows/ci.yml` | Repair the pipeline | 6 |

Leave everything else alone: `tests/`, `fixtures/`, `expected/`, `reviews/requirements.txt`, and the provided `api` and `db` services in `compose.yaml`.
Each failing test names the file and the rule to fix next.

## Timing

These are authoring estimates, not a timer; nothing fails on time.

- **S38, about 39 minutes:** phases 1-5.
- **S39, about 16 minutes:** phases 6 and 7, then the final test pass.

If retries push the total past 60 minutes, pause and finish in self-study.
The one-time setup takes about 3 minutes and is not counted.

## Prerequisites

```sh
node --version   # v24.x
npm --version    # the npm bundled with Node.js 24
git --version    # any 2.x
```

## Setup (once, needs the network)

```sh
cd tests
npm ci
```

This installs one pinned YAML parser into `tests/node_modules`. After that, the tests run offline.

## How to test

From the `tests` folder:

```sh
node --test --test-reporter=tap
```

Read the `error:` text under each `not ok` line, change one thing, and run again.

## S38

### Phase 1: orient (about 3 minutes)

1. Open `starter/compose.yaml`. The `api` and `db` services are finished; the commented-out `reviews` draft is yours.
2. Copy `fixtures/.env.example` to `starter/.env`. It holds two disposable local passwords.
3. Run the tests once. All 27 fail; the messages are your checklist.

### Phase 2: repair the reviews services in Compose (about 8 minutes)

Uncomment `reviews` and `reviews-db` and fix them. The `notifier` example on the adding-FastAPI page is the model.

- `reviews` keeps `build: ./reviews` and publishes its container port 8000 on `127.0.0.1` only.
- `reviews-db` is the service's own database: give it its own named volume at `/var/lib/postgresql`, declared under the top-level `volumes`, never the shop's `db-data`.
- `DATABASE_URL` must name `reviews-db`, not `db`, on container port 5432.
- The password comes from `${REVIEWS_DB_PASSWORD}` in `DATABASE_URL` and `POSTGRES_PASSWORD`, never a literal.
- `API_BASE_URL: http://api:8080`: the api's service name and container port, never `localhost`.
- Give `reviews-db` a `pg_isready` healthcheck like the `db` one, and make `reviews` wait for it with `depends_on` and `condition: service_healthy`.

### Phase 3: repair the reviews image (about 5 minutes)

- Set a `WORKDIR`. Copy `requirements.txt` and run `pip install --no-cache-dir -r requirements.txt` before copying `app`, so the dependency layer stays cached.
- Replace `fastapi dev`, which listens on `127.0.0.1`, with `fastapi run`, which listens on `0.0.0.0`. `uvicorn` with `--host 0.0.0.0` also passes.
- In `.dockerignore`, list `__pycache__`, `.git` and `.env`.

### Phase 4: a safe service-to-service call (about 8 minutes)

The docstring in `starter/reviews/app/main.py` lists the three rules the call breaks:

1. Forward the caller's token: send the incoming `authorization` value as the outgoing `Authorization` header, not `"Bearer dev-token"`.
2. Set explicit limits, for example `httpx.Timeout(3.0, connect=2.0)`, and pass them as the call's `timeout`.
3. Catch `httpx.TimeoutException` and raise `HTTPException(status_code=504, ...)`. Catch `httpx.ConnectError` and raise 502 or 503.

### Phase 5: the architecture and data review (about 12 minutes)

Read `fixtures/briefs/architecture-brief.md`, then fill the S38 sections of `starter/decisions.yaml`: `gateway_and_discovery`, `architecture`, `data_stores` and `store_contrast`.
Each question lists its choices. Write a sentence of your own in each `why` field; the tests only check that it is there.
Run the tests and finish the S38 phases before you stop.

## S39

### Phase 6: repair the pipeline (about 10 minutes)

Fix `starter/.github/workflows/ci.yml` without adding jobs:

- Trigger on `push`; `pull_request` may be listed too.
- The `test` job needs `actions/checkout` before `./mvnw test`.
- `build` runs only after `test` succeeds: `needs: test`.
- Pin every action to its full 40-character commit SHA with the tag in a trailing comment:
  `actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1` and `docker/build-push-action@c3c9e263c25d99ce0380d002d59b67737d91b0dc # v7.4.0`.
- Push only when the run is not a pull request, for example `push: ${{ github.event_name != 'pull_request' }}`.
- Replace the literal password with `${{ secrets.REGISTRY_USERNAME }}` and `${{ secrets.REGISTRY_PASSWORD }}`, passed through `env` to `docker login --password-stdin`.
- Delete the step that echoes a secret.
- Add a top-level `permissions:` block with only `contents: read`.

### Phase 7: the images and delivery review (about 4 minutes)

Fill the S39 sections of `starter/decisions.yaml`: `image_reference` (from `fixtures/briefs/image-reference.txt`) and `delivery` (from the brief's Delivery section).

### Final pass (about 2 minutes)

Run the tests. When all 27 pass, your result lines match `expected/solved-summary.txt`.

## Expected output

- The shipped starter fails all 27 tests; the result lines match `expected/starter-summary.txt`.
- A finished lab ends with `# tests 27`, `# pass 27` and `# fail 0`. The `# duration_ms` line changes from run to run and is not compared.

## Cleanup

Delete `tests/node_modules` and `starter/.env`.
To start over, restore the starter files from Git.
The lab creates no image, container, database, volume or workflow run.

## Troubleshooting

- **`Cannot find package 'yaml'`:** run `npm ci` in `tests` first.
- **A YAML test fails although the file looks right:** indent with two spaces, never tabs, and remove the leading `#` from every draft line.
- **The DATABASE_URL test fails:** the host is the reviews database's service name, the port is 5432, and the user and database must match what `reviews-db` creates.
- **The push test fails:** `push: true` pushes every experiment and `push: false` never publishes; use an expression on `github.event_name` or `github.ref`.
- **The timeout test fails:** set both a connect and a read limit, and remove `timeout=None`.
- **Past 60 minutes:** pause, note the next failing test, and continue in self-study.
