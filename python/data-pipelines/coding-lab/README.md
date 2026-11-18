# Data Pipelines lab: the nightly sign-up load

## Goal

Every night the workshop desk exports sign-ups as a CSV file and a JSON Lines file. Build the pipeline that loads them:
stream the records, load them into PostgreSQL with an upsert, summarise them in SQL, validate and deduplicate them, and enrich them with an AI model without sending anyone's personal data.
In ten linked tasks across three files you write each step, and in the last task you write your own offline tests for the enrichment.
Everything runs on your own computer with your local PostgreSQL server: no cloud account, no Docker, and no live or paid AI call (a scripted fake model client stands in for the model).

About 55 minutes of your scheduled lab block (an estimate); if you pass 60 minutes, pause and finish in self-study.

## What you edit

| File | Tasks |
| --- | --- |
| `starter/pipeline/records.py` | 1, 5, 6: extract, validate and deduplicate in Python |
| `starter/pipeline/database.py` | 2, 3, 4, 7: connect, upsert, transform and deduplicate in SQL |
| `starter/pipeline/enrich.py` | 8, 9: minimize and enrich |
| `starter/test_enrich.py` | 10: your own tests |

Leave `tests/`, `fixtures/`, `expected/`, `starter/pipeline/schema.sql`, `starter/pipeline/fake_model.py`, `starter/pipeline/__init__.py` and `starter/requirements.txt` as they are.
Each failing check names its task and the next action.

## Prerequisites

- Python 3.12 or later: `python --version` (on Windows, type `py` wherever this README says `python`).
- The PostgreSQL server (16 or later) and `psql` from the SQL course, running on your computer. Your PostgreSQL user must be allowed to create a schema in the database you use.

## Setup (once, needs the internet)

Open a terminal in the lab folder (the folder that holds this README).

1. Create and activate a virtual environment.

   macOS and Linux:

   ```
   python -m venv .venv
   source .venv/bin/activate
   ```

   Windows PowerShell:

   ```
   py -m venv .venv
   .venv\Scripts\Activate.ps1
   ```

2. Install the pinned packages (pytest, Pydantic and psycopg):

   ```
   python -m pip install -r starter/requirements.txt
   ```

3. Point the lab at your database with the `DATABASE_URL` environment variable, in the same terminal. Use your own port and database; add your PostgreSQL user as `postgresql://USER@localhost:5432/postgres` if it is not your login name.

   - macOS and Linux: `export DATABASE_URL=postgresql://localhost:5432/postgres`
   - Windows PowerShell: `$env:DATABASE_URL = "postgresql://localhost:5432/postgres"`

   Keep passwords out of the URL and out of every file: if your server asks for one, use the password file from the SQL course setup (`~/.pgpass`, or `%APPDATA%\postgresql\pgpass.conf` on Windows). Check the connection:

   ```
   psql "$DATABASE_URL" -c "SELECT version();"
   ```

   (in PowerShell: `psql $env:DATABASE_URL -c "SELECT version();"`). It prints one row starting `PostgreSQL`.

Activate the environment and set `DATABASE_URL` again in every new terminal before you run the tests.
The database checks create their own schema named `pipeline_lab_` plus 12 hex characters, create the tables from `starter/pipeline/schema.sql` inside it, and drop it when they finish; they never touch your other tables.

## Tasks

Run the one test command from the lab folder after each task:

```
python -m pytest -q
```

Before you start, all ten `test_taskNN_...` checks fail.
Tasks 1-4 are the first lab day (extract and load) and Tasks 5-10 the second (validate, deduplicate and enrich); the end of Task 4 is a natural place to stop between the days.
The checks give each task its own data, so a task passes on its own; open the fixture files in `fixtures/` to see the raw records.

### Task 1: stream the records (`records.py`)

1. `read_csv(path)`: `with open(path, encoding="utf-8", newline="") as f:` then `for row in csv.DictReader(f): yield row`. Every value arrives as a string.
2. `read_jsonl(path)`: open the file the same way (no `newline` needed), loop over its lines, skip blank lines (`if line.strip():`) and `yield json.loads(line)`.
3. `extract(paths)`: for each path, pick `read_csv` when `Path(path).suffix == ".csv"`, otherwise `read_jsonl`, and yield each record whose email is not blank (`(record.get("email") or "").strip()`); the CSV export has an empty row.

Because these are generators, only one record is in memory at a time, and nothing is read until a loop asks for the next record. A generator runs once: looping over it a second time gives nothing.

### Task 2: connect and query safely (`database.py`)

1. `connect()` returns `psycopg.connect(os.environ["DATABASE_URL"])`, so the address stays out of your code and a missing variable raises `KeyError`.
2. `signups_for_session(conn, session)`: in `with conn.cursor() as cur:`, run `cur.execute("SELECT email, seats FROM staging_signups WHERE session = %s ORDER BY email", (session,))` and return `cur.fetchall()`.

Never build the SQL with an f-string: the check passes the session `testing' OR 'x'='x`, which would rewrite a formatted query; as a `%s` parameter it is just a session name that matches nothing.

### Task 3: an idempotent batch upsert (`database.py`)

1. Write `UPSERT_SQL`: `INSERT INTO staging_signups (email, name, session, seats, signed_up_at) VALUES (%(email)s, %(name)s, %(session)s, %(seats)s, %(signed_up_at)s)` followed by `ON CONFLICT (email) DO UPDATE SET` each other column `= EXCLUDED.<column>`. The `email` column is the table's primary key, so it is the conflict target.
2. `load_staging(conn, records)`: in `with conn.cursor() as cur:`, send the whole batch with `cur.executemany(UPSERT_SQL, records)`. Each record is a dict, and the `%(email)s` placeholders take values from its keys.

Loading the same file twice now leaves one row per email instead of duplicates, so a rerun after a failed night is safe.

### Task 4: transform in SQL, all or nothing (`database.py`)

1. Write `TRANSFORM_SQL` as a common table expression that cleans the staged rows, then reshapes them into the summary:

   ```
   WITH cleaned AS (
       SELECT lower(trim(session)) AS session, seats
       FROM staging_signups
   )
   INSERT INTO session_summary (session, signups, seats)
   SELECT ...
   ```

   Finish the `SELECT`: per `session`, `count(*)` sign-ups and `sum(seats)` seats, with `GROUP BY session`.
2. `run_transform` deletes the old summary and inserts the new one. Put both statements inside `with conn.transaction():` so that a failed `INSERT` rolls back the `DELETE` too and yesterday's summary survives.

This is ELT: the raw rows were loaded first, and PostgreSQL does the transform where the data already is.

### Task 5: validate with Pydantic (`records.py`)

1. Give `Signup` its fields with type hints: `email: str`, `name: str`, `session: str` (required), `seats: int = 1`, `phone: str | None = None`, `signed_up_at: datetime` (required) and `comment: str = ""`.
2. Add a field validator that normalises the email:

   ```
   @field_validator("email")
   @classmethod
   def normalize_email(cls, value):
   ```

   Strip and lower-case `value`, raise `ValueError("email needs @")` when there is no `@`, and return it.
3. `validate_all(rows)`: for each row, `try:` to append `Signup(**row)` to `accepted`; `except ValidationError as err:` append `(row, err.errors())` to `rejected`. Return `accepted, rejected`.

Pydantic converts the text `"1"` to the integer `1` and `"2026-11-03T10:00:00"` to a `datetime`, but rejects `"two"` as seats.

### Task 6: deduplicate in Python (`records.py`)

`latest_per_email(signups)` keeps one sign-up per email, the one with the latest `signed_up_at`: use a dict keyed on `signup.email` and replace the kept sign-up when a later one arrives. Return the kept sign-ups ordered by email (`sorted(...)`).

### Task 7: deduplicate in SQL (`database.py`)

The door scanner logs every scan into `checkins (email, door, scanned_at)`. Write `LATEST_CHECKINS_SQL` to return each email's latest scan, ordered by email, with PostgreSQL's `SELECT DISTINCT ON (email) email, door, scanned_at FROM checkins ORDER BY email, scanned_at DESC`, or the portable `ROW_NUMBER() OVER (PARTITION BY email ORDER BY scanned_at DESC)` keeping row number 1.

### Task 8: keep personal data out of the prompt (`enrich.py`)

1. Set `PERSONAL_FIELDS = {"email", "name", "phone"}`: the fields that identify a person.
2. `minimize_for_prompt(signup)` returns a new dict: `"ref"` set to `pseudonym(signup["email"])`, plus every key of `signup` that is not in `PERSONAL_FIELDS`. Do not change `signup`.

The pseudonym lets you match the model's answer back to the sign-up without the model ever seeing who it is.

### Task 9: validated enrichment with retry and reject (`enrich.py`)

1. Give `Enrichment` two fields limited to fixed values with `Literal` (add `from typing import Literal`): `interest: Literal["testing", "data", "web", "other"]` and `level: Literal["beginner", "intermediate", "advanced"]`. `build_prompt` puts this schema into the prompt.
2. `enrich(client, signups, max_attempts=2)`: for each sign-up, minimize it, then try up to `max_attempts` times:
   - `Enrichment.model_validate_json(client.complete(build_prompt(record)))`;
   - on `ValidationError` or `ModelError`, log `logger.warning("invalid or failed enrichment for %s (attempt %d)", record["ref"], attempt)` and try again;
   - on success, append `{"ref": record["ref"], **answer.model_dump()}` to `enriched` and stop trying.

   When every attempt failed, append the ref to `rejected` (a `for ... else:` or a flag). Return `enriched, rejected`.

Model output is untrusted input: anything that does not validate is never loaded. Log only the ref, never an email, name or phone number.

### Task 10: your own offline tests (`test_enrich.py`)

Add two tests to `starter/test_enrich.py`, each driving `enrich` with a `FakeModelClient` of scripted answers and the `SIGNUP` dict already in the file:

1. `FakeModelClient(["not json", VALID])`: the sign-up is enriched after one retry (one item in `enriched`, `rejected == []`).
2. Two invalid answers, such as `"not json"` and `'{"interest": "cooking", "level": "beginner"}'`: nothing is enriched and its ref is rejected.

Run only your file while you work: `python -m pytest -q starter/test_enrich.py`.
The Task 10 check runs your tests against your code, where they must pass, then against an `enrich` that accepts any answer and one that never retries, where they must fail.

## Test

The one test command, run from the lab folder with the virtual environment active and `DATABASE_URL` set:

```
python -m pytest -q
```

When you finish, every test passes: the ten lab checks plus your own tests.

## Expected output

`expected/on-completion.txt` shows a completed run. The number of dots and tests depends on how many tests you wrote, and the time differs on every run.

## Offline note

Only the setup step uses the network. The tests talk only to your local PostgreSQL server, and the model is the offline `FakeModelClient`: no AI service, API key or account is used.

## Cleanup

1. The checks drop their own `pipeline_lab_...` schema. If a run was interrupted, list leftovers with `psql "$DATABASE_URL" -c "\dn pipeline_lab_*"` and drop each one with `psql "$DATABASE_URL" -c "DROP SCHEMA pipeline_lab_<hex> CASCADE"`.
2. Deactivate the environment with `deactivate`, then delete the files the lab created, from the lab folder:
   - macOS and Linux: `rm -rf .venv .pytest_cache starter/__pycache__ starter/pipeline/__pycache__ tests/__pycache__`
   - Windows PowerShell: `Remove-Item -Recurse -Force .venv, .pytest_cache, starter\__pycache__, starter\pipeline\__pycache__, tests\__pycache__ -ErrorAction SilentlyContinue`

## Troubleshooting

- **Every database check errors with `Set DATABASE_URL ...`**: set `DATABASE_URL` in this terminal (Setup step 3).
- **`connection refused`**: your PostgreSQL server is not running, or the port in `DATABASE_URL` is wrong.
- **`password authentication failed`** or **`no password supplied`**: check the user in `DATABASE_URL` and your password file line.
- **`permission denied for database`**: your user may not create schemas there; use a database you own, or a user such as `postgres`.
- **`No module named pytest` or `psycopg`**: the virtual environment is not active in this terminal. Activate it and run the test command again.
- **PowerShell refuses to run `Activate.ps1`**: run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once, then activate again.
- **You pass 60 minutes**: pause, note the task you are on, and finish in self-study; every check still names the task it belongs to.
