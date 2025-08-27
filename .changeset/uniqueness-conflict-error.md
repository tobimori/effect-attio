---
"effect-attio": patch
---

Add support for uniqueness_conflict error

- Added `AttioUniquenessConflictError` class to handle API responses with status 400 and code "uniqueness_conflict"
- Added error transform for mapping API uniqueness conflict errors to the typed error class
- Added error handling to `assert` and `create` methods in both entries and records services
- This error occurs when attempting to create or update records with attribute values that violate uniqueness constraints