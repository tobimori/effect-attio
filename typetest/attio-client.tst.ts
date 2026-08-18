import { Effect, Redacted } from "effect"
import type { Config, Layer } from "effect"
import type { HttpClient } from "effect/unstable/http"
import { AttioClient, Attributes } from "effect-attio"
import { describe, expect, it } from "tstyche"

class TestAttioClient extends AttioClient<TestAttioClient>()(
	"effect-attio/test/TestAttioClient",
	{
		objects: {
			companies: true,
			invoices: {
				invoice_number: Attributes.Text.Required,
				amount: Attributes.Currency.Required,
			},
		},
		lists: {
			opportunities: {
				title: Attributes.Text.Required,
				value: Attributes.Currency,
			},
		},
	},
) {}

declare const client: TestAttioClient["Service"]

describe("AttioClient", () => {
	it("requires snake-case configured attribute slugs", () => {
		const defineClient = AttioClient<object>()

		expect(defineClient).type.toBeCallableWith("SnakeCaseClient", {
			objects: {
				invoices: { invoice_number: Attributes.Text },
			},
			lists: {
				opportunities: { expected_close_date: Attributes.Date },
			},
		})
		expect(defineClient).type.not.toBeCallableWith("CamelCaseClient", {
			objects: {
				invoices: { invoiceNumber: Attributes.Text },
			},
		})
		expect(defineClient).type.not.toBeCallableWith("KebabCaseClient", {
			lists: {
				opportunities: { "expected-close-date": Attributes.Date },
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
			filter_view_id: "550e8400-e29b-41d4-a716-446655440000",
			sorts: [
				{
					direction: "asc",
					path: [["invoices", "customer"]],
				},
			],
		})
		expect(client.invoices.list).type.not.toBeCallableWith({
			filter: { invoice_number: "INV-001" },
			filter_view_id: "550e8400-e29b-41d4-a716-446655440000",
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
		expect(client.lists.opportunities.list).type.not.toBeCallableWith({
			filter: { title: "New opportunity" },
			filter_view_id: "550e8400-e29b-41d4-a716-446655440000",
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
