# Python Fundamentals lab: the workshop sign-up desk

## Goal

The sign-up desk keeps its workshop records in a small Python package, and a volunteer asked for a one-line summary script.
In ten linked tasks you port two Java methods, clean and count the records, fix two aliasing bugs, raise and log a clear error, finish the summary script and write your own pytest tests.
Everything runs on your own computer: no cloud account, no Docker, no database.

About 45 minutes of your scheduled exercise block (an estimate); if you pass 60 minutes, pause and finish in self-study.

## What you edit

| File | Tasks |
| --- | --- |
| `starter/signups/records.py` | 1-8: the record functions, each marked with a `TODO Task N` comment |
| `starter/signups/cli.py` | 9: the summary script |
| `starter/test_signups.py` | 10: your own tests |

Leave `tests/`, `expected/`, `starter/signups/sample.py`, `starter/signups/__init__.py` and `starter/requirements.txt` as they are.
Each failing check names its task and the next action.

## Prerequisites

Python 3.12 or later. Check it in a terminal (on Windows, type `py` wherever this README says `python`):

```
python --version
```

## Setup (once, needs the internet)

Open a terminal in the lab folder (the folder that holds this README). Create and activate a virtual environment, then install the pinned test tools from the requirements file.

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

Then, on every system:

```
python -m pip install -r starter/requirements.txt
```

Activate the environment again in every new terminal before you run the tests.

## Tasks

Run the one test command from the lab folder after each task:

```
python -m pytest -q
```

Before you start, 11 tests fail: the ten `test_taskNN_...` checks and the example test in `starter/test_signups.py`.
Work in order; Task 9 uses the functions from Tasks 1-6, and Task 10 tests your Task 1 and Task 8 code.
Tasks 1-6 use the first day's topics (syntax, functions, collections, comprehensions) and Tasks 7-10 the second day's (mutability, modules, exceptions and logging, scripts, pytest), so the end of Task 6 is a natural place to stop between the two days.

### Task 1: port the Java desk methods (`records.py`)

The old Java desk had these two methods. Rewrite each as Python in `session_status` and `tables_needed`: indentation instead of braces, no type declarations, `elif` for `else if`, and keep the `while` loop.

```java
static String sessionStatus(int capacity, int taken) {
    if (taken >= capacity) {
        return "full";
    } else if (capacity - taken <= 2) {
        return "almost full";
    } else {
        return "open";
    }
}

static int tablesNeeded(int people, int tableSize) {
    int tables = 0;
    int seated = 0;
    while (seated < people) {
        tables++;
        seated += tableSize;
    }
    return tables;
}
```

Python has no `++`: write `tables += 1`.

### Task 2: look up one sign-up (`records.py`)

`find_signup(signups, email)` loops over the list with `for`, compares each `signup["email"]` with `==` and returns the first match; after the loop it returns `None`.
`describe(signups, email)` calls it and tests the result with `is None` (never `== None`, and there is no `null`): return `"<email> is not signed up"` for `None`, otherwise `"<email> is in <session>"`.

### Task 3: clean one raw row (`records.py`)

Give `normalize_signup` the default `default_session="general"` and type hints (`row: dict`, `default_session: str`, return `-> dict`).
Return a new dict: the email stripped and lower-cased (`.strip().lower()`), the name stripped and capitalised word by word (`.strip().title()`), and the row's session, or `default_session` when the row's session is the empty string.
The check calls it as `normalize_signup(row)` and as `normalize_signup(default_session="intro", row=row)`: keyword arguments may come in any order.
Type hints document the types; Python does not check them when the function runs.

### Task 4: one flexible report line (`records.py`)

Change the signature to `report_line(title, *values, **fields)`, so it takes any number of values and any keyword fields.
Return the title, `": "`, then the values joined with `", "`; when there are fields, add `" ("`, each field as `key=value` joined with `", "`, and `")"`.
`report_line("data", "1 signed up", "3 seats left", status="open")` returns `"data: 1 signed up, 3 seats left (status=open)"`.

### Task 5: counts and lookups (`records.py`)

- `count_by_session` raises `KeyError` the first time it meets a session. Fix the one line with `counts.get(signup["session"], 0) + 1`.
- `open_sessions(capacity, counts)` loops `for session, seats in capacity.items():` and keeps each session whose `counts.get(session, 0)` is below its seats, in `capacity` order.
- `cancel(emails, email)` removes the email from that same list with `.remove` and returns `True`; when the email is not in the list it returns `False`.

### Task 6: comprehensions and a slice (`records.py`)

- Rewrite the `emails_for` loop as one list comprehension: `[... for signup in signups if ...]`.
- `unique_emails` returns a set comprehension of the emails.
- `seats_left_by_session` returns a dict comprehension `{session: seats - counts.get(session, 0) for session, seats in capacity.items()}`.
- `latest(items, n)` returns the last `n` items with a negative slice. Careful: `items[-0:]` is the whole list, so return `[]` when `n` is 0.

### Task 7: two aliasing bugs (`records.py`)

- `add_to_waitlist("a@example.com")` called twice without a waitlist returns `["a@example.com", "b@example.com"]` the second time, because the default list is created once and shared. Use `waitlist=None` and create a new list inside the function when it is `None`.
- `mark_checked_in` changes the caller's dict. Copy it first (`signup.copy()` or `dict(signup)`), then set `"checked_in"` on the copy.

### Task 8: a clear error for the seats column (`records.py`)

1. Under `import logging`, create the module logger: `logger = logging.getLogger(__name__)`.
2. Define `class SignupError(Exception):` with a one-line docstring as its body.
3. Rewrite `parse_seats(text)` with `try` / `except ValueError` / `else` / `finally`:
   - `try`: `seats = int(text)` (`int` accepts surrounding spaces).
   - `except ValueError`: log it with `logger.exception("could not parse seats %r", text)`, then `raise SignupError(f"seats must be a whole number, got {text!r}")`.
   - `else`: raise `SignupError(f"seats must be at least 1, got {seats}")` when `seats < 1`, otherwise return `seats`.
   - `finally`: `logger.debug("checked seats value %r", text)`.

Never use a bare `except:`; it would also catch mistakes you want to see. Python has no checked exceptions: nothing forces a caller to catch `SignupError`, so the message must say what went wrong.

### Task 9: the summary script (`cli.py`)

1. Import what you use: `from signups.records import count_by_session, normalize_signup, report_line, seats_left_by_session, session_status`.
2. In `main(argv)`:
   - when `len(argv) < 2`, print `usage: python -m signups.cli SESSION` to `sys.stderr` and return `2`;
   - when `argv[1]` is not a key of `CAPACITY`, print `unknown session: <name>` to `sys.stderr` and return `1`;
   - otherwise normalize every row of `SIGNUPS`, count them by session, build `parts = [f"{taken} signed up", f"{left} seats left"]` and `fields = {"status": ...}`, print `report_line(session, *parts, **fields)` and return `0`.
3. Replace the bare `main(sys.argv)` at the bottom with the guard `if __name__ == "__main__":` and `sys.exit(main(sys.argv))`, so importing the module runs nothing.

Try it from the `starter` folder, then read the exit status (`echo $?` on macOS and Linux, `echo $LASTEXITCODE` in PowerShell):

```
python -m signups.cli general
```

It prints `general: 3 signed up, 2 seats left (status=almost full)` and exits with status 0. Run it with no session and check that the status is 2.

### Task 10: your own tests (`test_signups.py`)

Add to `starter/test_signups.py`, using plain `assert` statements:

1. a `@pytest.fixture` named `room` that returns `{"capacity": 10}`;
2. one test decorated with `@pytest.mark.parametrize("taken, expected", [...])` with at least three cases, one each for `"open"`, `"almost full"` and `"full"`, that takes `room` as a parameter and checks `session_status(room["capacity"], taken)`;
3. a test that checks `parse_seats("two")` raises `SignupError`, using `with pytest.raises(SignupError):` (import `SignupError` from `signups.records`).

Run only your file while you work: `python -m pytest -q starter/test_signups.py`. When a test fails, pytest prints the failing `assert` line with the values it compared.
The Task 10 check runs your tests against your code, where they must pass, and then against three deliberately broken versions of `session_status` and `parse_seats`, where they must fail.

## Test

The one test command, run from the lab folder with the virtual environment active:

```
python -m pytest -q
```

When you finish, every test passes: the ten lab checks plus your own tests.

## Expected output

`expected/on-completion.txt` shows a completed run. The number of dots and tests depends on how many tests you wrote, and the time differs on every run.

## Offline note

Only the setup step uses the network. The tests, the summary script and your own tests run offline.

## Cleanup

The lab creates `.venv` and `.pytest_cache` in the lab folder and `__pycache__` folders under `starter/` and `tests/`. Deactivate the environment with `deactivate`, then delete them from the lab folder:

- macOS and Linux: `rm -rf .venv .pytest_cache starter/__pycache__ starter/signups/__pycache__ tests/__pycache__`
- Windows PowerShell: `Remove-Item -Recurse -Force .venv, .pytest_cache, starter\__pycache__, starter\signups\__pycache__, tests\__pycache__ -ErrorAction SilentlyContinue`

## Troubleshooting

- **`No module named pytest`**: the virtual environment is not active in this terminal. Activate it and run the test command again.
- **`ModuleNotFoundError: No module named 'signups'` when running the script**: run `python -m signups.cli ...` from the `starter` folder, not from the lab folder.
- **PowerShell refuses to run `Activate.ps1`**: run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once, then activate again.
- **A `SyntaxError` or `IndentationError` stops every test**: fix the file and line that pytest names first; one broken file stops the whole run.
- **You pass 60 minutes**: pause, note the task you are on, and finish in self-study; every check still names the task it belongs to.
