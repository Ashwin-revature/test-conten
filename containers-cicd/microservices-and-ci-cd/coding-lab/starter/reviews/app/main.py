"""The shop's reviews service.

It owns product reviews and calls the shop api for product details.
The tests in ../tests read this file as text; nothing here is executed by the
lab, so you do not need Python installed to finish it.
"""

import os

import httpx
from fastapi import FastAPI, Header, HTTPException

# Set by compose.yaml; the service name reaches the api container.
API_BASE_URL = os.environ.get("API_BASE_URL", "http://localhost:8080")

app = FastAPI()

# The service's own data, kept simple for this lab. In the real service it
# lives in reviews-db, never in the shop api's database.
REVIEWS = {
    1: [{"stars": 5, "text": "Great kettle, boils fast."}],
    2: [{"stars": 3, "text": "Decent mug, chips easily."}],
}


@app.get("/reviews/{product_id}")
def reviews_for_product(product_id: int, authorization: str | None = Header(default=None)):
    """Return the product from the shop api together with its reviews.

    TODO (README phase 4): this naive call breaks three taught rules.
    1. It hard-codes a bearer token instead of forwarding the caller's
       Authorization header (and it never checks that one arrived).
    2. It passes timeout=None, which turns off every limit, so a hanging api
       hangs this request too.
    3. A timed-out or refused call escapes as an unhandled exception instead
       of a clear error response.
    """
    response = httpx.get(
        f"{API_BASE_URL}/products/{product_id}",
        headers={"Authorization": "Bearer dev-token"},
        timeout=None,
    )
    response.raise_for_status()
    return {"product": response.json(), "reviews": REVIEWS.get(product_id, [])}
