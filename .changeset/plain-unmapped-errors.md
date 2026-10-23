---
"effect-attio": patch
---

Fail with the `HttpClientError` when an error response matches none of an endpoint's mapped errors, instead of dying. A 500 or 503 from Attio is now a typed, recoverable error.
