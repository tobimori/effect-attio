---
"effect-attio": minor
---

Add typed native query parameters and type-safe `findMany` and `findFirst` query builders for configured records and list entries.

Add lazy `findManyStream` and `listStream` methods that automatically paginate configured records and list entries with Effect `Stream`.

Return `Option` from `findFirst` to represent a missing record or list entry.

Accept Effect `DateTime` values in date and timestamp query-builder comparisons.

Native filter and sort paths validate relationship transitions, final attributes, constraints, and structured sort fields from the configured object graph.

List configurations now declare their parent object and attributes. Query builders support typed record-reference traversal through `.attributes` and expose list parents as a separate callback argument.

Limit relationship paths to Attio's five-segment maximum and restrict `$not` to the single comparison form accepted by Attio.

Match structured-field capabilities observed in the live API, including location country codes and email local specifiers.

Add missing standard Company and Person attributes and optional read-only attribute variants.

Implement every active endpoint in Attio's public REST OpenAPI specification, including attribute configuration, record search and merge, historic attribute writes, SQL, emails, meetings, call recordings, and files. The deprecated standalone call-transcript endpoint is excluded.
