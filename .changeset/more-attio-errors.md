---
"effect-attio": minor
---

Map more Attio error responses to typed errors. Unknown error responses still become defects.

- Every method can fail with `AttioForbiddenError` for any 403 response, for example a missing scope (`unauthorized`), and with the new `AttioPaymentRequiredError` for a 402 response.
- The new `AttioInvalidRequestError` covers other 400 errors, such as `duplicate_values`, `limit_reached`, `merge_in_progress` and `self_merge`.
- **Breaking:** errors are now classified by Attio's error code and not by HTTP status, so each code maps to one error:
  - `not_found` and `value_not_found` give `AttioNotFoundError`. Before, a 400 `value_not_found` gave `AttioMissingValueError`, which now covers only `missing_value` and has no `code` field.
  - `uniqueness_conflict` gives `AttioUniquenessConflictError`, and `multiple_match_results` gives `AttioMultipleMatchError`, for both 400 and 409 responses.
  - `AttioConflictError` covers `slug_conflict` and `concurrent_write_conflict`. Its `code` is now a union of these literals.
- `AttioValidationError` also covers 413 responses, and `AttioFilterError` also covers `invalid_filter_operator`.
- Methods now map all errors that Attio documents for their endpoint.
