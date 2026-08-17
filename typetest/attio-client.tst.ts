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
				invoiceNumber: Attributes.Text.Required,
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
			invoiceNumber: "INV-001",
			amount: 100,
		})
		expect(client.invoices.create).type.not.toBeCallableWith({
			unknownField: "value",
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
			filter: { invoiceNumber: "INV-001" },
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
