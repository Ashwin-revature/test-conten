"""PostgreSQL steps of the pipeline (Tasks 2, 3, 4 and 7).

Every function takes an open psycopg connection, except connect(), which opens one.
The tables are in schema.sql.
"""

import os

import psycopg


# --- Task 2: connect and query safely ----------------------------------------


def connect():
    """Open a connection from the DATABASE_URL environment variable."""
    # TODO Task 2
    raise NotImplementedError("Task 2: write connect")


def signups_for_session(conn, session):
    """Return [(email, seats), ...] from staging_signups for `session`, ordered by email."""
    # TODO Task 2: a parameterized query; never put `session` into the SQL text yourself.
    raise NotImplementedError("Task 2: write signups_for_session")


# --- Task 3: load into the staging table with an upsert ----------------------

UPSERT_SQL = """
TODO Task 3
"""


def load_staging(conn, records):
    """Upsert every record (a dict with email, name, session, seats, signed_up_at) in one batch."""
    # TODO Task 3
    raise NotImplementedError("Task 3: write load_staging")


# --- Task 4: transform in SQL after loading ----------------------------------

TRANSFORM_SQL = """
TODO Task 4
"""


def run_transform(conn):
    """Rebuild session_summary from staging_signups: all or nothing."""
    conn.execute("DELETE FROM session_summary")
    conn.execute(TRANSFORM_SQL)  # TODO Task 4: make the DELETE and this INSERT one transaction.


# --- Task 7: deduplicate in SQL ----------------------------------------------

LATEST_CHECKINS_SQL = """
TODO Task 7
"""


def latest_checkins(conn):
    """Return [(email, door, scanned_at), ...]: each email's latest scan, ordered by email."""
    return conn.execute(LATEST_CHECKINS_SQL).fetchall()
