# effect-attio

## 0.3.3

### Patch Changes

- 071bd46: fix: add BaseAttribute fields to attribute types and use DateTimeUtc

  The BaseAttribute fields (active_from, active_until, created_by_actor) were being added at runtime but weren't visible at the type level. This patch ensures these metadata fields are properly reflected in the TypeScript types. Also updates active_from and active_until from String to DateTimeUtc for proper timestamp handling.

- 0267dd9: fix: make entry update/patch data parameter partial

  Allow partial updates for entry values in update and patch methods by changing the data parameter type from requiring full entry_values to accepting Partial<Schema.Schema.Type<TInput>>

- 7a604bd: Add support for uniqueness_conflict error

  - Added `AttioUniquenessConflictError` class to handle API responses with status 400 and code "uniqueness_conflict"
  - Added error transform for mapping API uniqueness conflict errors to the typed error class
  - Added error handling to `assert` and `create` methods in both entries and records services
  - This error occurs when attempting to create or update records with attribute values that violate uniqueness constraints

## 0.3.2

### Patch Changes

- 732a616: Fix timestamp decoding in API responses by using typeSchema to prevent double transformation

## 0.3.1

### Patch Changes

- 4d5ff3c: fix select with type not being returned

## 0.3.0

### Minor Changes

- 5aa4d32: fix types being removed in build process
