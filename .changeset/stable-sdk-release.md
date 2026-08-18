---
"effect-attio": major
---

Release effect-attio 1.0 with a stable, typed API for configured Attio objects and lists.

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
			contains(parent.name, "Acme"),
		),
})
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
