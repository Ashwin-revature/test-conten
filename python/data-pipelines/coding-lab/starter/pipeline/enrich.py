"""AI enrichment with validated outputs, without sending personal data (Tasks 8 and 9).

The model client has one method, complete(prompt) -> str. The tests use the offline
FakeModelClient from fake_model.py; nothing here makes a live or paid AI call.
"""

import hashlib
import json
import logging

from pydantic import BaseModel, ValidationError

from pipeline.fake_model import ModelError

logger = logging.getLogger(__name__)


def pseudonym(email):
    """Return a stable reference such as "p-1a2b3c4d5e" for an email, without revealing it."""
    digest = hashlib.sha256(("signups-lab:" + email).encode("utf-8")).hexdigest()
    return "p-" + digest[:10]


# --- Task 8: keep personal data out of the prompt ----------------------------

PERSONAL_FIELDS = set()  # TODO Task 8: the names of the personal fields of a Signup


def minimize_for_prompt(signup):
    """Return the dict that may go into a prompt: "ref" (the pseudonym) plus the non-personal fields.

    `signup` is a sign-up dict, such as Signup.model_dump() returns; it must not change.
    """
    # TODO Task 8
    raise NotImplementedError("Task 8: write minimize_for_prompt")


# --- Task 9: ask for JSON, validate it, retry or reject ----------------------


class Enrichment(BaseModel):
    """TODO Task 9: interest and level, each limited to the values listed in README.md."""


def build_prompt(record):
    """Return the prompt for one minimized record, asking for JSON that matches Enrichment."""
    schema = json.dumps(Enrichment.model_json_schema())
    return (
        "Classify this workshop sign-up. Answer only with JSON matching this schema: "
        f"{schema}\nSign-up: {json.dumps(record, default=str)}"
    )


def enrich(client, signups, max_attempts=2):
    """Enrich each sign-up dict in `signups`; return (enriched, rejected_refs).

    enriched: one {"ref": ..., "interest": ..., "level": ...} per sign-up whose answer validated.
    rejected_refs: the refs whose every attempt failed or was invalid.
    """
    # TODO Task 9
    raise NotImplementedError("Task 9: write enrich")
