import { Effect, Redacted, Stream } from "effect"
import type { Config, Layer } from "effect"
import type * as DateTime from "effect/DateTime"
import type * as Option from "effect/Option"
import type { HttpClient } from "effect/unstable/http"
import { AttioClient, Attributes } from "effect-attio"
import { describe, expect, it } from "tstyche"

class TestAttioClient extends AttioClient<TestAttioClient>()(
	"effect-attio/test/TestAttioClient",
	{
		objects: {
			companies: true,
			workspaces: true,
			invoices: {
				invoice_number: Attributes.Text.Required,
				amount: Attributes.Currency.Required,
				invoice_date: Attributes.Date,
				created_at: Attributes.Timestamp.ReadOnlyOptional,
				company: Attributes.CompanyRecordReference,
			},
		},
		lists: {
			opportunities: {
				parent: "companies",
				attributes: {
					title: Attributes.Text.Required,
					value: Attributes.Currency,
				},
			},
		},
	},
) {}

declare const client: TestAttioClient["Service"]
declare const dateTime: DateTime.DateTime

describe("AttioClient", () => {
	it("requires snake-case configured attribute slugs", () => {
		const defineClient = AttioClient<object>()

		expect(defineClient).type.toBeCallableWith("SnakeCaseClient", {
			objects: {
				invoices: { invoice_number: Attributes.Text },
			},
			lists: {
				opportunities: {
					parent: "companies",
					attributes: { expected_close_date: Attributes.Date },
				},
			},
		})
		expect(defineClient).type.not.toBeCallableWith("CamelCaseClient", {
			objects: {
				invoices: { invoiceNumber: Attributes.Text },
			},
		})
		expect(defineClient).type.not.toBeCallableWith("KebabCaseClient", {
			lists: {
				opportunities: {
					parent: "companies",
					attributes: { "expected-close-date": Attributes.Date },
				},
			},
		})
		expect(defineClient).type.not.toBeCallableWith("DisabledParentClient", {
			lists: {
				opportunities: {
					parent: "deals",
					attributes: { title: Attributes.Text },
				},
			},
		})
	})

	it("has exact layer signatures", () => {
		const layer = TestAttioClient.layer({
			apiKey: Redacted.make("test-api-key"),
		})

		expect(layer).type.toBe<
			Layer.Layer<TestAttioClient, never, HttpClient.HttpClient>
		>()
		expect(TestAttioClient.layerConfig).type.toBe<
			Layer.Layer<TestAttioClient, Config.ConfigError, HttpClient.HttpClient>
		>()
	})

	it("preserves configured object methods", () => {
		expect(client.invoices.create).type.toBeCallableWith({
			invoice_number: "INV-001",
			amount: 100,
		})
		expect(client.invoices.create).type.not.toBeCallableWith({
			unknownField: "value",
		})
	})

	it("restricts assert matching attributes to configured fields", () => {
		expect(client.invoices.assert).type.toBeCallableWith("invoice_number", {
			invoice_number: "INV-001",
			amount: 100,
		})
		expect(client.invoices.assert).type.not.toBeCallableWith("unknownField", {
			invoice_number: "INV-001",
			amount: 100,
		})
	})

	it("supports current record query parameters", () => {
		expect(client.invoices.list).type.toBeCallableWith({
			filter: {
				$and: [
					{ invoice_number: { $starts_with: "INV-" } },
					{ amount: { currency_value: { $gte: 100 } } },
					{
						company: {
							target_record_id: {
								$eq: "550e8400-e29b-41d4-a716-446655440000",
							},
						},
					},
				],
			},
			sorts: [
				{ direction: "desc", attribute: "amount", field: "currency_value" },
			],
		})
		expect(client.invoices.list).type.toBeCallableWith({
			filter_view_id: "550e8400-e29b-41d4-a716-446655440000",
			sorts: [
				{
					direction: "asc",
					path: [
						["invoices", "company"],
						["companies", "name"],
					],
				},
			],
		})
		expect(client.invoices.list).type.toBeCallableWith({
			filter: {
				path: [
					["invoices", "company"],
					["companies", "domains"],
				],
				constraints: { root_domain: { $ends_with: ".com" } },
			},
			sorts: [
				{
					direction: "asc",
					path: [
						["invoices", "company"],
						["companies", "team"],
						["people", "name"],
					],
					field: "last_name",
				},
			],
		})
		expect(client.invoices.list).type.not.toBeCallableWith({
			filter: {
				path: [
					["invoices", "amount"],
					["companies", "name"],
				],
				constraints: { $contains: "Attio" },
			},
		})
		expect(client.invoices.list).type.not.toBeCallableWith({
			filter: {
				path: [
					["invoices", "company"],
					["people", "name"],
				],
				constraints: { full_name: { $contains: "Attio" } },
			},
		})
		expect(client.invoices.list).type.not.toBeCallableWith({
			filter: {
				path: [
					["invoices", "company"],
					["companies", "twitter_follower_count"],
				],
				constraints: { $contains: "100" },
			},
		})
		expect(client.invoices.list).type.not.toBeCallableWith({
			sorts: [
				{
					direction: "asc",
					path: [
						["invoices", "company"],
						["companies", "name"],
					],
					field: "last_name",
				},
			],
		})
		expect(client.invoices.list).type.not.toBeCallableWith({
			filter: { invoice_number: "INV-001" },
			filter_view_id: "550e8400-e29b-41d4-a716-446655440000",
		})
		expect(client.invoices.list).type.not.toBeCallableWith({
			filter: { unknown_field: "value" },
		})
		expect(client.invoices.list).type.not.toBeCallableWith({
			filter: { amount: { $contains: "100" } },
		})
		expect(client.invoices.list).type.not.toBeCallableWith({
			filter: { invoice_date: { $gte: dateTime } },
		})
		expect(client.invoices.list).type.not.toBeCallableWith({
			filter: {
				company: "550e8400-e29b-41d4-a716-446655440000",
			},
		})
		expect(client.invoices.list).type.not.toBeCallableWith({
			sorts: [{ direction: "asc", attribute: "amount", field: "last_name" }],
		})
		expect(client.invoices.list).type.toBeCallableWith({
			filter: { $not: { invoice_number: "INV-001" } },
		})
		expect(client.invoices.list).type.not.toBeCallableWith({
			filter: {
				$not: {
					$or: [{ invoice_number: "INV-001" }, { invoice_number: "INV-002" }],
				},
			},
		})
		expect(client.invoices.list).type.not.toBeCallableWith({
			filter: {
				path: [
					["invoices", "company"],
					["companies", "associated_workspaces"],
					["workspaces", "company"],
					["companies", "associated_workspaces"],
					["workspaces", "company"],
					["companies", "name"],
				],
				constraints: { $contains: "Attio" },
			},
		})
	})

	it("builds type-safe record queries", () => {
		expect(client.invoices.findMany).type.toBeCallableWith()
		client.invoices.findMany({
			where: (invoice, operators) => {
				const comparison = operators.eq(invoice.invoice_number, "INV-001")
				const logical = operators.and(comparison, comparison)

				expect(operators.not).type.toBeCallableWith(comparison)
				expect(operators.not).type.not.toBeCallableWith(logical)
				return operators.not(comparison)
			},
		})

		const invoices = client.invoices.findMany({
			where: (invoice, { and, eq, gte, startsWith }) => {
				expect(invoice).type.toHaveProperty("invoice_number")
				expect(invoice).type.toHaveProperty("amount")
				expect(invoice).type.not.toHaveProperty("unknown_field")

				expect(startsWith).type.toBeCallableWith(invoice.invoice_number, "INV-")
				expect(startsWith).type.not.toBeCallableWith(invoice.amount, "INV-")
				expect(gte).type.toBeCallableWith(invoice.amount, 100)
				expect(gte).type.not.toBeCallableWith(invoice.invoice_number, 100)
				expect(gte).type.toBeCallableWith(invoice.invoice_date, dateTime)
				expect(gte).type.toBeCallableWith(invoice.created_at, dateTime)
				expect(eq).type.toBeCallableWith(
					invoice.company.target_record_id,
					"550e8400-e29b-41d4-a716-446655440000",
				)

				return and(
					startsWith(invoice.invoice_number, "INV-"),
					gte(invoice.amount, 100),
				)
			},
			orderBy: (invoice, { asc, desc }) => [
				desc(invoice.amount),
				asc(invoice.invoice_number),
			],
			limit: 50,
		})

		expect(invoices).type.toBe<ReturnType<typeof client.invoices.list>>()

		const invoice = client.invoices.findFirst({
			where: (invoice, { eq }) => eq(invoice.invoice_number, "INV-001"),
		})
		expect(client.invoices.findFirst).type.not.toBeCallableWith({ limit: 50 })

		type Invoice = Effect.Success<typeof invoices>[number]
		expect(invoice).type.toBe<
			Effect.Effect<Option.Option<Invoice>, Effect.Error<typeof invoices>>
		>()

		const invoiceStream = client.invoices.findManyStream({
			where: (invoice, { gte }) => gte(invoice.amount, 100),
			offset: 10,
		})
		expect(invoiceStream).type.toBe<
			Stream.Stream<Invoice, Effect.Error<typeof invoices>>
		>()
		expect(client.invoices.findManyStream).type.not.toBeCallableWith({
			limit: 50,
		})
		expect(client.invoices.listStream).type.toBeCallableWith({
			filter: { amount: { $gte: 100 } },
			offset: 10,
		})
		expect(client.invoices.listStream).type.not.toBeCallableWith({ limit: 50 })
	})

	it("supports structured attribute query fields", () => {
		client.people.findMany({
			where: (person, { and, eq, gte, inArray, isNotEmpty, startsWith }) => {
				expect(isNotEmpty).type.toBeCallableWith(
					person.first_interaction.owner_member_id,
				)
				expect(eq).type.toBeCallableWith(
					person.first_interaction.interaction_type,
					"email",
				)
				expect(eq).type.not.toBeCallableWith(
					person.first_interaction.interaction_type,
					"phone",
				)
				expect(inArray).type.toBeCallableWith(person.description, [
					"one",
					"two",
				])
				expect(inArray).type.not.toBeCallableWith(person.email_addresses, [
					"person@example.com",
				])
				expect(person.email_addresses).type.not.toHaveProperty(
					"email_local_specifier",
				)
				expect(startsWith).type.not.toBeCallableWith(
					person.primary_location.country_code,
					"U",
				)

				return and(
					isNotEmpty(person.first_interaction.owner_member_id),
					gte(person.first_interaction.interacted_at, "2025-01-01T00:00:00Z"),
				)
			},
		})

		client.companies.findMany({
			where: (company, { eq, gte }) => {
				expect(gte).type.toBeCallableWith(
					company.categories.active_from,
					"2025-01-01T00:00:00Z",
				)
				expect(eq).type.not.toBeCallableWith(
					company.categories.active_from,
					"2025-01-01T00:00:00Z",
				)

				return gte(company.categories.active_from, "2025-01-01T00:00:00Z")
			},
		})

		expect(client.invoices.list).type.toBeCallableWith({
			filter: { amount: { $gte: "100.00" } },
		})
	})

	it("builds typed relationship paths", () => {
		client.people.findMany({
			where: (person, { contains }) =>
				contains(person.company.attributes.domains.root_domain, "attio.com"),
			orderBy: (person, { asc }) => asc(person.company.attributes.name),
		})

		client.people.findMany({
			where: (person, { contains }) =>
				contains(
					person.company.attributes.associated_workspaces.attributes.name,
					"Attio",
				),
		})

		client.invoices.findMany({
			where: (invoice, { contains }) => {
				const maximumDepthWorkspace =
					invoice.company.attributes.associated_workspaces.attributes.company
						.attributes.associated_workspaces.attributes

				expect(maximumDepthWorkspace.company).type.not.toHaveProperty(
					"attributes",
				)
				return contains(maximumDepthWorkspace.name, "Attio")
			},
		})
	})

	it("preserves configured list methods", () => {
		expect(client.lists.opportunities.create).type.toBeCallableWith({
			parent_record_id: "550e8400-e29b-41d4-a716-446655440000",
			parent_object: "companies",
			entry_values: {
				title: "New opportunity",
				value: 100,
			},
		})
		expect(client.lists.opportunities.create).type.not.toBeCallableWith({
			parent_record_id: "550e8400-e29b-41d4-a716-446655440000",
			parent_object: "companies",
			entry_values: { unknownField: "value" },
		})
		expect(client.lists.opportunities.create).type.not.toBeCallableWith({
			parent_record_id: "550e8400-e29b-41d4-a716-446655440000",
			parent_object: "deals",
			entry_values: { title: "New opportunity" },
		})
		expect(client.lists.opportunities.assert).type.not.toBeCallableWith({
			parent_record_id: "550e8400-e29b-41d4-a716-446655440000",
			parent_object: "unknown_object",
			entry_values: { title: "New opportunity" },
		})
	})

	it("restricts list parent objects to configured objects", () => {
		expect(client.lists.create).type.toBeCallableWith({
			name: "Company opportunities",
			api_slug: "company-opportunities",
			parent_object: "companies",
			workspace_access: "full-access",
			workspace_member_access: [],
		})
		expect(client.lists.create).type.not.toBeCallableWith({
			name: "Deal opportunities",
			api_slug: "deal-opportunities",
			parent_object: "deals",
			workspace_access: "full-access",
			workspace_member_access: [],
		})
	})

	it("supports saved-view list entry queries", () => {
		expect(client.lists.opportunities.list).type.toBeCallableWith({
			filter_view_id: "550e8400-e29b-41d4-a716-446655440000",
		})
		expect(client.lists.opportunities.list).type.toBeCallableWith({
			filter: {
				path: [
					["opportunities", "parent_record"],
					["companies", "domains"],
				],
				constraints: { root_domain: { $eq: "attio.com" } },
			},
			sorts: [
				{
					direction: "asc",
					path: [
						["opportunities", "parent_record"],
						["companies", "name"],
					],
				},
			],
		})
		expect(client.lists.opportunities.list).type.not.toBeCallableWith({
			filter: {
				path: [
					["opportunities", "parent_record"],
					["people", "name"],
				],
				constraints: { full_name: { $eq: "Attio" } },
			},
		})
		expect(client.lists.opportunities.list).type.not.toBeCallableWith({
			sorts: [
				{
					direction: "asc",
					path: [
						["opportunities", "parent_record"],
						["companies", "domains"],
					],
					field: "email_domain",
				},
			],
		})
		expect(client.lists.opportunities.list).type.not.toBeCallableWith({
			filter: { title: "New opportunity" },
			filter_view_id: "550e8400-e29b-41d4-a716-446655440000",
		})
	})

	it("builds type-safe list entry queries", () => {
		const entries = client.lists.opportunities.findMany({
			where: (opportunity, parent, { and, contains, gte }) =>
				and(
					contains(opportunity.title, "Enterprise"),
					gte(opportunity.value, 1000),
					contains(parent.name, "Attio"),
				),
			orderBy: (opportunity, _parent, { desc }) => desc(opportunity.value),
		})

		expect(entries).type.toBe<
			ReturnType<typeof client.lists.opportunities.list>
		>()
		expect(client.lists.opportunities.findFirst).type.not.toBeCallableWith({
			limit: 50,
		})

		type Entry = Effect.Success<typeof entries>[number]
		const entryStream = client.lists.opportunities.findManyStream({
			where: (opportunity, parent, { and, contains }) =>
				and(
					contains(opportunity.title, "Enterprise"),
					contains(parent.name, "Attio"),
				),
		})
		expect(entryStream).type.toBe<
			Stream.Stream<Entry, Effect.Error<typeof entries>>
		>()
		expect(client.lists.opportunities.findManyStream).type.not.toBeCallableWith(
			{ limit: 50 },
		)
		expect(client.lists.opportunities.listStream).type.toBeCallableWith({
			filter_view_id: "550e8400-e29b-41d4-a716-446655440000",
		})
		expect(client.lists.opportunities.listStream).type.not.toBeCallableWith({
			limit: 50,
		})
	})

	it("lists object views with cursor pagination", () => {
		const views = client.objects.listViews("companies", {
			show_archived: true,
			limit: 1000,
			cursor: "next-page",
		})

		type Response = Effect.Success<typeof views>
		type View = Response["data"][number]

		expect<View["id"]["object_id"]>().type.toBe<string>()
		expect<View["id"]["view_id"]>().type.toBe<string>()
		expect<View["created_at"]>().type.toBe<import("effect").DateTime.Utc>()
		expect<Response["pagination"]["next_cursor"]>().type.toBe<string | null>()
		expect(client.objects.listViews).type.not.toBeCallableWith("companies", {
			limit: "500",
		})
	})

	it("lists list views with cursor pagination", () => {
		const views = client.lists.listViews("opportunities")

		type Response = Effect.Success<typeof views>
		type View = Response["data"][number]

		expect<View["id"]["list_id"]>().type.toBe<string>()
		expect<View["id"]["view_id"]>().type.toBe<string>()
		expect<Response["pagination"]["next_cursor"]>().type.toBe<string | null>()
	})

	it("supports current task list parameters", () => {
		expect(client.tasks.list).type.toBeCallableWith({
			sort: "completed_at:desc",
			assignee: "alice@example.com",
		})
	})

	it("supports current note creation fields", () => {
		expect(client.notes.create).type.toBeCallableWith({
			parent_object: "people",
			parent_record_id: "550e8400-e29b-41d4-a716-446655440000",
			title: "Imported note",
			content: "Imported content",
			format: "plaintext",
			created_at: "2025-01-01T12:00:00Z",
			meeting_id: "550e8400-e29b-41d4-a716-446655440000",
		})
	})

	it("restricts note parent objects to configured objects", () => {
		expect(client.notes.list).type.toBeCallableWith({
			parent_object: "invoices",
		})
		expect(client.notes.list).type.not.toBeCallableWith({
			parent_object: "deals",
		})
		expect(client.notes.create).type.not.toBeCallableWith({
			parent_object: "deals",
			parent_record_id: "550e8400-e29b-41d4-a716-446655440000",
			title: "Deal note",
			content: "Content",
			format: "plaintext",
		})
	})

	it("restricts thread object filters to configured objects", () => {
		expect(client.threads.list).type.toBeCallableWith({
			object: "people",
			record_id: "550e8400-e29b-41d4-a716-446655440000",
		})
		expect(client.threads.list).type.not.toBeCallableWith({
			object: "deals",
			record_id: "550e8400-e29b-41d4-a716-446655440000",
		})
	})

	it("restricts task record links to configured objects", () => {
		const recordId = "550e8400-e29b-41d4-a716-446655440000"

		expect(client.tasks.list).type.toBeCallableWith({
			linked_object: "companies",
			linked_record_id: recordId,
		})
		expect(client.tasks.list).type.not.toBeCallableWith({
			linked_object: "deals",
			linked_record_id: recordId,
		})
		expect(client.tasks.create).type.toBeCallableWith({
			content: "Follow up",
			format: "plaintext",
			is_completed: false,
			linked_records: [
				{ target_object: "invoices", target_record_id: recordId },
			],
			assignees: [],
		})
		expect(client.tasks.create).type.not.toBeCallableWith({
			content: "Follow up",
			format: "plaintext",
			is_completed: false,
			linked_records: [{ target_object: "deals", target_record_id: recordId }],
			assignees: [],
		})
		expect(client.tasks.update).type.not.toBeCallableWith(recordId, {
			linked_records: [
				{ target_object: "unknown_object", target_record_id: recordId },
			],
		})
	})

	it("returns typed record attribute values", () => {
		const values = client.invoices.listAttributeValues(
			"550e8400-e29b-41d4-a716-446655440000",
			"amount",
		)

		type Value = Effect.Success<typeof values>[number]

		expect<Value["attribute_type"]>().type.toBe<"currency">()
		expect<Value["currency_value"]>().type.toBe<number>()
		expect(client.invoices.listAttributeValues).type.not.toBeCallableWith(
			"550e8400-e29b-41d4-a716-446655440000",
			"unknownField",
		)
	})

	it("returns typed list attribute values", () => {
		const values = client.lists.opportunities.listAttributeValues(
			"550e8400-e29b-41d4-a716-446655440000",
			"title",
		)

		type Value = Effect.Success<typeof values>[number]

		expect<Value["attribute_type"]>().type.toBe<"text">()
		expect<Value["value"]>().type.toBe<string>()
		expect(
			client.lists.opportunities.listAttributeValues,
		).type.not.toBeCallableWith(
			"550e8400-e29b-41d4-a716-446655440000",
			"unknownField",
		)
	})

	it("is available as an Effect service", () => {
		const program = Effect.gen(function* () {
			return yield* TestAttioClient
		})

		expect(program).type.toBe<
			Effect.Effect<TestAttioClient["Service"], never, TestAttioClient>
		>()
	})
})
