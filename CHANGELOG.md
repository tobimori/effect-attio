# effect-attio

## 1.3.0

### Minor Changes

- 394a896: Add `notes.update` to change the title and/or content of a note.
- be71148: Add `meetings.update` to replace the linked records of a meeting, `meetings.patch` to add linked records, and `meetings.delete` to delete a meeting.
- bf5060c: **Breaking:** `comments.create` now uses the input that Attio accepts: `format`, `content`, `author`, an optional `created_at`, and one of `thread_id`, `record` or `entry`. The old input always failed. Comments on list entries now decode `entry.entry_id`.
- 6fd7b46: **Breaking:** `meetings.create` requires at least one participant, because Attio rejects meetings without participants.
- 2dc0bb4: Add the `AttioSequences` service with `addUnsubscribedEmails` to add email addresses to the sequence unsubscribe list. The configured client exposes it as `sequences`.
- e59696e: Map more Attio error responses to typed errors. Unknown error responses still become defects.

  - Every method can fail with `AttioForbiddenError` for any 403 response, for example a missing scope (`unauthorized`), and with the new `AttioPaymentRequiredError` for a 402 response.
  - The new `AttioInvalidRequestError` covers other 400 errors, such as `duplicate_values`, `limit_reached`, `merge_in_progress` and `self_merge`.
  - **Breaking:** errors are now classified by Attio's error code and not by HTTP status, so each code maps to one error:
    - `not_found` and `value_not_found` give `AttioNotFoundError`. Before, a 400 `value_not_found` gave `AttioMissingValueError`, which now covers only `missing_value` and has no `code` field.
    - `uniqueness_conflict` gives `AttioUniquenessConflictError`, and `multiple_match_results` gives `AttioMultipleMatchError`, for both 400 and 409 responses.
    - `AttioConflictError` covers `slug_conflict` and `concurrent_write_conflict`. Its `code` is now a union of these literals.
  - `AttioValidationError` also covers 413 responses, and `AttioFilterError` also covers `invalid_filter_operator`.
  - Methods now map all errors that Attio documents for their endpoint.

- 017da0a: Add the `exclude_automated_participants` parameter to `emails.list`.
- e34d9e2: Add `objects.delete` to delete a custom object and all of its records.
- 1f55be3: Add `token_level` to the `meta.identify` response.
- 61555ca: **Breaking:** `threads.get` now returns one page of comments as `{ data, pagination }` and not the thread alone. Use the new `limit` and `cursor` parameters to page through comments, and `created_after` to get only newer comments. A thread from `threads.get` can have no comments when `created_after` excludes all of them. Threads from `threads.list` now include `has_more_comments`.

### Patch Changes

- 4247ae2: Map `validation_type` errors without `validation_errors` to `AttioValidationError` with an empty `errors` list.
- a654b69: Fix the standard object schemas to match Attio: remove `associated_users` from companies, which Attio does not have, and rename the deals `state` attribute to `stage`. Before, companies records failed to decode when the users object was enabled, and deal records always failed to decode.
- 1fdb471: Decode phone number values with `phone_number`, which Attio returns, and not `normalized_phone_number`. Accept the `meeting` and `activity` interaction types, so people and companies with calendar interactions decode.

## 1.2.1

### Patch Changes

- 621abad: Encode select option and status titles as single URL path segments when updating them.

## 1.2.0

### Minor Changes

- efbbb67: Require Effect 4.0 stable. Imports use the stable `effect/http` paths, which do not exist in the 4.0 release candidates, so the peer dependency is now `effect@^4.0.0`.

## 1.1.0

### Minor Changes

- 7c42e45: Add configured target objects to record reference IDs before sending requests.

## 1.0.0

### Major Changes

- a466d4a: Release effect-attio 1.0 with a stable, typed API for configured Attio objects and lists.

  ## Breaking changes

  ### List configuration now includes its parent object

  Each Attio list has one parent object. List configuration now records this relationship so list-entry inputs, parent filters, and parent query fields can use the correct object type.

  Change every list from the old attribute map:

  ```ts
  lists: {
    opportunities: {
      title: Attributes.Text.Required,
      value: Attributes.Currency,
    },
  }
  ```

  to a configuration with `parent` and `attributes`:

  ```ts
  lists: {
    opportunities: {
      parent: "companies",
      attributes: {
        title: Attributes.Text.Required,
        value: Attributes.Currency,
      },
    },
  }
  ```

  The parent must be an enabled object. Calls to `create` and `assert` now restrict `parent_object` to that configured parent. List query builders receive the typed parent as their second callback argument:

  ```ts
  attio.lists.opportunities.findMany({
    where: (opportunity, parent, { and, contains }) =>
      and(
        contains(opportunity.title, "Enterprise"),
        contains(parent.name, "Acme")
      ),
  });
  ```

  ### Configuration and native queries are stricter

  - Configured object and list attribute slugs must use snake case.
  - Configured object references only accept enabled object slugs.
  - Standard record-reference attributes are only included when their target object is enabled.
  - Record assertion matching attributes must be configured fields.
  - Native filters, relationship paths, structured fields, and sorts are checked against the configured object graph. Existing invalid or generic JSON query objects can now fail TypeScript checks.
  - `BEL` is no longer accepted as a currency code. Use the valid `BGN` code for Bulgarian lev.

  ### New root service names are reserved

  The configured client now exposes `attributes`, `emails`, `files`, `meetings`, `records`, and `sql` as root services. A custom object with one of these slugs is shadowed by the service with the same name. Rename such a custom object slug before upgrading.

  ## Query APIs

  - Add typed native query parameters for configured records and list entries.
  - Add Drizzle-style `findMany` and `findFirst` query builders.
  - Return `Option` from `findFirst` when no record or entry matches.
  - Add lazy `findManyStream` and `listStream` methods with automatic Effect `Stream` pagination.
  - Accept Effect `DateTime` values in date and timestamp comparisons.
  - Add typed traversal through record references and list parent objects.
  - Validate relationship transitions, final attributes, constraints, structured fields, and Attio's five-segment path limit.
  - Restrict `not` to the single-comparison form supported by Attio.

  ## REST API coverage

  - Implement every active endpoint in Attio's public REST OpenAPI specification.
  - Add attribute configuration, record search and merge, historic attribute writes, SQL, emails, meetings, call recordings, and files.
  - Add schema-validated object and list saved-view routes with cursor pagination.
  - Align existing record, entry, task, note, and query request contracts with the current Attio API.
  - Exclude the deprecated standalone call-transcript endpoint.

  ## Schema and type improvements

  - Return attribute-specific values from configured record and list `listAttributeValues` methods.
  - Add target-specific custom references through `Attributes.RecordReference.For(object)`.
  - Add missing standard Company and Person attributes and optional read-only attribute variants.
  - Add the current Attio currency codes.
  - Validate paired email and meeting filters, meeting input variants, pagination limits, and file inputs.
  - Add runtime request tests and type tests for TypeScript 5.9 and 6.0.

## 0.4.0

### Minor Changes

- 25b0a74: Migrate the SDK to Effect v4 and the consolidated Effect HTTP APIs. Service
  layers now use the idiomatic lowercase `layer` name instead of `Default`.

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
