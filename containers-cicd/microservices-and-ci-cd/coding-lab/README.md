# Lab: grow the shop into services and automate it

## Goal

The shop from the Containers and Compose lab gets its first microservice and its first pipeline.
A teammate drafted the pieces; you repair and complete them.
Twenty-six public tests read your files as text and YAML.
Nothing builds an image, starts a container, runs Python or triggers a workflow, so you need no container engine and no CI runner.

## What you edit

All paths are under `starter/`. Each file names its phase in a `TODO` or header comment.

| File | What you do | Phase |
| --- | --- | --- |
| `.env` | Create it by copying `fixtures/.env.example` unchanged | 1 |
| `compose.yaml` | Uncomment the `reviews` draft and repair it | 2 |
| `reviews/Dockerfile` | Fix the start command only | 3 |
| `reviews/app/main.py` | Make the call to the shop api safe | 4 |
| `decisions.yaml` | Answer the design questions | 5 and 7 |
| `.github/workflows/ci.yml` | Repair the pipeline | 6 |

Leave everything else alone: `tests/`, `fixtures/`, `expected/`, `reviews/requirements.txt`, `reviews/.dockerignore`, the rest of `reviews/Dockerfile`, and the provided `api` and `db` services in `compose.yaml`.
Each failing test names the file and the rule to fix next.

## Timing

These are authoring estimates for a learner who has read the day's topic pages. They are not a timer, and nothing fails on time.

- **S38, about 35 minutes:** phases 1-5.
- **S39, about 20 minutes:** the Jenkins reading, then phases 6 and 7.

The worst case allows about five extra failed runs of a minute each, which brings the total to 60 minutes.
If you pass 60 minutes, pause and finish in self-study.
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

Read the S38 topic pages first: monolith vs microservices, adding the FastAPI service to Compose, service-to-service calls, SQL vs NoSQL, and API gateways and service discovery.

### Phase 1: orient (about 4 minutes)

1. Copy `fixtures/.env.example` to `starter/.env`. It holds two disposable local passwords, one per database.
2. Run the tests once. All 26 fail.

### Phase 2: repair the reviews services in Compose (about 8 minutes)

In `starter/compose.yaml`, uncomment the `reviews` and `reviews-db` draft.
Delete only the `#` at the start of each draft line, so `reviews:` lines up with `db:`.
Then repair the defects the header comment lists, using the `notifier` example on the adding-FastAPI page as your model.
The reviews service listens on container port 8000. Its database password variable is `REVIEWS_DB_PASSWORD`.

### Phase 3: fix the start command (about 2 minutes)

The rest of `starter/reviews/Dockerfile` is provided.
Its start command runs a server that no other container can reach. Replace it with the start command the adding-FastAPI page gives for an image.

### Phase 4: a safe service-to-service call (about 8 minutes)

The docstring in `starter/reviews/app/main.py` lists the three rules the call breaks. Fix each one using the service-to-service page:

1. Forward the caller's token. If no token arrived, answer 401 before calling the api.
2. Build an `httpx.Timeout` with an explicit connect limit and a read limit, and pass it as the call's `timeout`.
3. Answer a timeout with 504, and a refused connection with 502 or 503. Mind the order of your `except` clauses.

### Phase 5: the architecture and data review (about 12 minutes)

Read `fixtures/briefs/architecture-brief.md`.
Then fill the S38 sections of `starter/decisions.yaml`: `architecture`, `data_stores`, `store_contrast`, `gateway_and_discovery` and `service_calls`.
Each question lists its choices.

**End of S38:** run the tests. Tests 9-19 and 23-26 pass (15 of 26). The 11 still failing are the pipeline and the S39 worksheet sections.

## S39

Read the S39 topic pages first: the GitHub Actions pipeline and secrets in CI.
Also read "Reading (optional): Jenkins, registries, CD and Kubernetes" (about 4 minutes, counted in S39's time).
The calendar marks it optional, but phase 7 needs it, so this lab requires it.

### Phase 6: repair the pipeline (about 9 minutes)

Fix `starter/.github/workflows/ci.yml` without adding jobs, using the GitHub Actions pipeline and secrets in CI pages.

- The image goes to Docker Hub. Docker Hub is not part of GitHub, so `GITHUB_TOKEN` cannot sign in there. The login uses the `REGISTRY_USERNAME` and `REGISTRY_PASSWORD` repository secrets, passed through `env`.
- Pin every action to its full 40-character commit SHA, with the release tag in a trailing comment. The taught pins are:
  - `actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1`
  - `docker/build-push-action@c3c9e263c25d99ce0380d002d59b67737d91b0dc # v7.4.0`
- The build context is the folder that holds the reviews Dockerfile.
- Runs from a fork's pull request get no repository secrets. Guarding the login step with the same condition as `push` keeps those runs from failing. This is good practice, but the tests do not require it.

### Phase 7: the images, secrets and delivery review (about 5 minutes)

Fill the S39 sections of `starter/decisions.yaml`: `image_reference` (from `fixtures/briefs/image-reference.txt`), `secrets_in_logs` and `delivery`.

### Final pass (about 2 minutes)

Run the tests. When all 26 pass, your result lines match `expected/solved-summary.txt`.

## Expected output

- The shipped starter fails all 26 tests; the result lines match `expected/starter-summary.txt`.
- A finished lab ends with `# tests 26`, `# pass 26` and `# fail 0`. The `# duration_ms` line changes from run to run and is not compared.

## Cleanup

Delete `tests/node_modules` and `starter/.env`.
To start over, restore the starter files from Git.
The lab creates no image, container, database, volume or workflow run.

## Troubleshooting

- **`Cannot find package 'yaml'`:** run `npm ci` in `tests` first.
- **"is not valid YAML":** the message gives the line. Indent with two spaces, never tabs.
- **Past 60 minutes:** pause, note the next failing test, and continue in self-study.
