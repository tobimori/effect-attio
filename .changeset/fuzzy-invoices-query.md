---
"effect-attio": minor
---

Add typed native query parameters and type-safe `findMany` and `findFirst` query builders for configured records and list entries.

Return `Option` from `findFirst` to represent a missing record or list entry.

Native filter and sort paths validate relationship transitions, final attributes, constraints, and structured sort fields from the configured object graph.

List configurations now declare their parent object and attributes. Query builders support typed record-reference traversal through `.attributes` and expose list parents as a separate callback argument.

Limit relationship paths to Attio's five-segment maximum and restrict `$not` to the single comparison form accepted by Attio.

Match structured-field capabilities observed in the live API, including location country codes and email local specifiers.

Add missing standard Company and Person attributes and optional read-only attribute variants.
