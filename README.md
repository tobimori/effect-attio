# Effect Attio SDK

A strongly-typed, schema-driven SDK for the [Attio REST API](https://docs.attio.com/rest-api/overview) based on [Effect](https://effect.website)'s `HttpClient`

Requires Effect v4 RC

## Installation

```bash
npm install effect-attio effect
# or
pnpm add effect-attio effect
```

## Quick Start

```typescript
import { Effect, Layer, Redacted, Stream } from "effect"
import { FetchHttpClient } from "effect/unstable/http"
import { AttioClient, Attributes } from "effect-attio"

// define your attio client with your custom objects and attributes
class MyAttioClient extends AttioClient<MyAttioClient>()("MyAttioClient", {
	objects: {
		// use standard objects with built-in attributes
		companies: true,
		people: true,

		// define custom objects with specific attributes
		invoices: {
			invoice_number: Attributes.Text.Required,
			download_url: Attributes.Text,
			amount: Attributes.Currency.Required,
			due_date: Attributes.Date,
			paid: Attributes.Checkbox,
			customer: Attributes.CompanyRecordReference,
		},
	},
	lists: {
		// define custom lists with specific attributes
		opportunities: {
			parent: "companies",
			attributes: {
				title: Attributes.Text.Required,
				value: Attributes.Currency,
				probability: Attributes.Number,
				expected_close_date: Attributes.Date,
				stage: Attributes.Select.Required,
				notes: Attributes.Text,
			},
		},
	},
}) {}

// create a program using the client
const program = Effect.gen(function* () {
	const attio = yield* MyAttioClient
	const recoverCompanyConflict = Effect.fn("recoverCompanyConflict")(
		function* (error: { readonly message: string }) {
			yield* Effect.log(`Company already exists: ${error.message}`)
			const existing = yield* attio.companies.list({
				filter: { domains: "acme.com" },
			})
			return existing[0]
		},
	)

	// create a new company (or get existing if domain already exists)
	const company = yield* attio.companies
		.create({
			name: "Acme Corp",
			domains: ["acme.com"],
		})
		.pipe(Effect.catchTag("AttioConflictError", recoverCompanyConflict))

	// create an invoice linked to the company
	const invoice = yield* attio.invoices.create({
		invoice_number: "INV-2024-001",
		amount: 1500.0,
		due_date: "2024-12-31",
		customer: company.id.record_id,
	})

	// create a new opportunity list entry for the company
	const opportunity = yield* attio.lists.opportunities.create({
		parent_record_id: company.id.record_id,
		parent_object: "companies",
		entry_values: {
			title: "Enterprise Deal Q1 2025",
			value: 50000,
			stage: "negotiation",
		},
	})

	return { company, invoice, opportunity }
})

// run the program with configuration
Effect.runPromise(
	program.pipe(
		Effect.provide(
			MyAttioClient.layerConfig.pipe(Layer.provide(FetchHttpClient.layer)),
		),
	),
)
```

## Query builder

Configured objects and lists have a Drizzle-style query builder:

```typescript
const findInvoices = attio.invoices.findMany({
	where: (invoice, { and, eq, gte, startsWith }) =>
		and(
			startsWith(invoice.invoice_number, "INV-"),
			gte(invoice.amount, 1000),
			eq(invoice.customer.target_record_id, companyId),
			startsWith(invoice.customer.attributes.name, "Acme"),
		),
	orderBy: (invoice, { asc, desc }) => [
		desc(invoice.amount),
		asc(invoice.invoice_number),
	],
	limit: 50,
})
```

Record references expose the related object under `.attributes`.

For lists, the second callback argument contains the parent object's attributes. The builder converts these accesses to Attio paths.

```typescript
const findOpportunities = attio.lists.opportunities.findMany({
	where: (opportunity, parent, { and, contains }) =>
		and(
			contains(opportunity.title, "Enterprise"),
			contains(parent.name, "Acme"),
		),
})
```

Use `findFirst` when only one result is needed. It returns `Option.none()` when
no record or entry matches.

```typescript
const findInvoice = attio.invoices.findFirst({
	where: (invoice, { eq }) => eq(invoice.invoice_number, "INV-2024-001"),
})
```

Use `findManyStream` to lazily read all matching results with automatic pagination. Use `Stream.take` to limit the total number of emitted results. The stream starts at `offset` when it is specified.

```typescript
const invoices = attio.invoices
	.findManyStream({
		where: (invoice, { gte }) => gte(invoice.amount, 1000),
	})
	.pipe(Stream.take(100))
```

Use `listStream` for the same behavior with Attio's native query format:

```typescript
const invoices = attio.invoices.listStream({
	filter: { amount: { $gte: 1000 } },
})
```

Both stream methods use Attio's documented default page size of 500 items. This is an SDK page size, not a documented Attio maximum. The methods do not accept `limit` because `Stream.take` controls the total result count.

Available comparison functions are `eq`, `inArray`, `isNotEmpty`, `contains`, `startsWith`, `endsWith`, `lt`, `lte`, `gt`, and `gte`. Filters can be combined with `and` and `or`. Use `not` to negate one comparison. Date and timestamp comparisons accept ISO strings or Effect `DateTime` values. The builder formats `DateTime` values as `YYYY-MM-DD` for dates and UTC ISO strings for timestamps.

The native `list({ filter, sorts })` API is also type-safe. Use it when direct access to Attio's JSON query format is preferred:

```typescript
const findInvoices = attio.invoices.list({
	filter: {
		$and: [
			{ invoice_number: { $starts_with: "INV-" } },
			{
				path: [
					["invoices", "customer"],
					["companies", "domains"],
				],
				constraints: { root_domain: { $ends_with: ".com" } },
			},
		],
	},
	sorts: [
		{ attribute: "amount", direction: "desc" },
		{
			direction: "asc",
			path: [
				["invoices", "customer"],
				["companies", "name"],
			],
		},
	],
})
```

## Custom object references

Use `RecordReference.For` to create a reference with a specific custom object target:

```typescript
class MyAttioClient extends AttioClient<MyAttioClient>()("MyAttioClient", {
	objects: {
		invoices: {
			company: Attributes.CompanyRecordReference,
			project: Attributes.RecordReference.For("projects"),
			related_projects: Attributes.RecordReference.For("projects").Multiple,
		},
	},
}) {}

const program = Effect.gen(function* () {
	const attio = yield* MyAttioClient
	yield* attio.invoices.create({
		company: companyRecordId,
		project: projectRecordId,
		related_projects: [firstProjectRecordId, secondProjectRecordId],
	})
})
```
