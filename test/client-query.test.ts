import { describe, expect, it } from "@effect/vitest"
import { Effect, Layer, Option, Redacted, Stream } from "effect"
import {
	HttpClient,
	HttpClientRequest,
	HttpClientResponse,
} from "effect/unstable/http"
import { AttioClient } from "../src/client.js"
import * as Attributes from "../src/schemas/attributes.js"

const workspaceId = "11111111-1111-4111-8111-111111111111"
const objectId = "22222222-2222-4222-8222-222222222222"
const recordId = "33333333-3333-4333-8333-333333333333"
const timestamp = "2025-01-02T03:04:05.000Z"

class TestAttioClient extends AttioClient<TestAttioClient>()(
	"effect-attio/test/RuntimeAttioClient",
	{
		objects: {
			invoices: {
				amount: Attributes.Currency,
				invoice_number: Attributes.Text,
			},
		},
		lists: {
			opportunities: {
				parent: "companies",
				attributes: {
					title: Attributes.Text,
				},
			},
		},
	},
) {}

const emptyResponse = { data: [] }

const recordResponse = {
	data: [
		{
			id: {
				workspace_id: workspaceId,
				object_id: objectId,
				record_id: recordId,
			},
			created_at: timestamp,
			web_url: `https://app.attio.com/invoices/${recordId}`,
			values: {
				amount: [],
				invoice_number: [],
				record_id: [
					{
						attribute_type: "text",
						value: recordId,
						active_from: timestamp,
						active_until: null,
						created_by_actor: { type: "system", id: null },
					},
				],
				created_at: [
					{
						attribute_type: "timestamp",
						value: timestamp,
						active_from: timestamp,
						active_until: null,
						created_by_actor: { type: "system", id: null },
					},
				],
				created_by: [
					{
						attribute_type: "actor-reference",
						referenced_actor_type: "system",
						referenced_actor_id: null,
						active_from: timestamp,
						active_until: null,
						created_by_actor: { type: "system", id: null },
					},
				],
			},
		},
	],
}

const makeHttpHarness = (responses: ReadonlyArray<unknown>) => {
	const requests: Array<HttpClientRequest.HttpClientRequest> = []
	let responseIndex = 0
	const client = HttpClient.make((request) =>
		Effect.sync(() => {
			requests.push(request)
			const body = responses[responseIndex++] ?? emptyResponse
			return HttpClientResponse.fromWeb(
				request,
				new Response(JSON.stringify(body), {
					status: 200,
					headers: { "content-type": "application/json" },
				}),
			)
		}),
	)

	return {
		requests,
		layer: Layer.succeed(HttpClient.HttpClient, client),
	}
}

const requestBody = (request: HttpClientRequest.HttpClientRequest): unknown => {
	if (request.body._tag !== "Uint8Array") {
		throw new Error(`Expected a byte-array body, got ${request.body._tag}`)
	}

	return JSON.parse(new TextDecoder().decode(request.body.body))
}

const provideClient = <A, E>(
	effect: Effect.Effect<A, E, TestAttioClient>,
	httpLayer: Layer.Layer<HttpClient.HttpClient>,
) =>
	effect.pipe(
		Effect.provide(
			TestAttioClient.layer({
				apiKey: Redacted.make("test-api-key"),
				baseUrl: "https://api.test",
				retryRateLimits: false,
			}),
		),
		Effect.provide(httpLayer),
	)

describe("configured client queries", () => {
	it.effect("sends an object builder query with pagination defaults", () => {
		const http = makeHttpHarness([emptyResponse])

		return provideClient(
			Effect.gen(function* () {
				const attio = yield* TestAttioClient
				yield* attio.invoices.findMany({
					where: (invoice, { and, gte, startsWith }) =>
						and(
							startsWith(invoice.invoice_number, "INV-"),
							gte(invoice.amount, 1_000),
						),
					orderBy: (invoice, { desc }) => desc(invoice.amount),
				})

				expect(http.requests).toHaveLength(1)
				expect(http.requests[0]?.method).toBe("POST")
				expect(http.requests[0]?.url).toBe(
					"https://api.test/v2/objects/invoices/records/query",
				)
				expect(requestBody(http.requests[0]!)).toEqual({
					filter: {
						$and: [
							{ invoice_number: { $starts_with: "INV-" } },
							{ amount: { $gte: 1_000 } },
						],
					},
					sorts: [{ attribute: "amount", direction: "desc" }],
					limit: 500,
					offset: 0,
				})
			}),
			http.layer,
		)
	})

	it.effect("passes a native object query through unchanged", () => {
		const http = makeHttpHarness([emptyResponse])

		return provideClient(
			Effect.gen(function* () {
				const attio = yield* TestAttioClient
				yield* attio.invoices.list({
					filter: { invoice_number: { $starts_with: "INV-" } },
					sorts: [
						{
							attribute: "invoice_number",
							direction: "asc",
							field: "value",
						},
					],
					limit: 25,
					offset: 10,
				})

				expect(requestBody(http.requests[0]!)).toEqual({
					filter: { invoice_number: { $starts_with: "INV-" } },
					sorts: [
						{
							attribute: "invoice_number",
							direction: "asc",
							field: "value",
						},
					],
					limit: 25,
					offset: 10,
				})
			}),
			http.layer,
		)
	})

	it.effect("sends a list builder query with its parent path", () => {
		const http = makeHttpHarness([emptyResponse])

		return provideClient(
			Effect.gen(function* () {
				const attio = yield* TestAttioClient
				yield* attio.lists.opportunities.findMany({
					where: (entry, parent, { and, contains, startsWith }) =>
						and(
							startsWith(entry.title, "Enterprise"),
							contains(parent.name, "Acme"),
						),
				})

				expect(http.requests[0]?.method).toBe("POST")
				expect(http.requests[0]?.url).toBe(
					"https://api.test/v2/lists/opportunities/entries/query",
				)
				expect(requestBody(http.requests[0]!)).toEqual({
					filter: {
						$and: [
							{ title: { $starts_with: "Enterprise" } },
							{
								path: [
									["opportunities", "parent_record"],
									["companies", "name"],
								],
								constraints: { $contains: "Acme" },
							},
						],
					},
					limit: 500,
					offset: 0,
				})
			}),
			http.layer,
		)
	})

	it.effect("findFirst sends limit one and returns Some for a record", () => {
		const http = makeHttpHarness([recordResponse])

		return provideClient(
			Effect.gen(function* () {
				const attio = yield* TestAttioClient
				const result = yield* attio.invoices.findFirst({ offset: 4 })

				expect(requestBody(http.requests[0]!)).toEqual({ limit: 1, offset: 4 })
				expect(Option.isSome(result)).toBe(true)
				if (Option.isSome(result)) {
					expect(result.value.id.record_id).toBe(recordId)
				}
			}),
			http.layer,
		)
	})

	it.effect("findFirst returns None when no list entry matches", () => {
		const http = makeHttpHarness([emptyResponse])

		return provideClient(
			Effect.gen(function* () {
				const attio = yield* TestAttioClient
				const result = yield* attio.lists.opportunities.findFirst()

				expect(requestBody(http.requests[0]!)).toEqual({
					limit: 1,
					offset: 0,
				})
				expect(Option.isNone(result)).toBe(true)
			}),
			http.layer,
		)
	})

	it.effect("automatically paginates a builder record stream", () => {
		const fullPage = {
			data: Array.from({ length: 500 }, () => recordResponse.data[0]),
		}
		const http = makeHttpHarness([fullPage, recordResponse])

		return provideClient(
			Effect.gen(function* () {
				const attio = yield* TestAttioClient
				const records = attio.invoices.findManyStream({
					where: (invoice, { startsWith }) =>
						startsWith(invoice.invoice_number, "INV-"),
					offset: 7,
				})

				expect(http.requests).toHaveLength(0)
				const result = yield* Stream.runCollect(records)

				expect(result).toHaveLength(501)
				expect(http.requests).toHaveLength(2)
				expect(requestBody(http.requests[0]!)).toEqual({
					filter: { invoice_number: { $starts_with: "INV-" } },
					limit: 500,
					offset: 7,
				})
				expect(requestBody(http.requests[1]!)).toEqual({
					filter: { invoice_number: { $starts_with: "INV-" } },
					limit: 500,
					offset: 507,
				})
			}),
			http.layer,
		)
	})

	it.effect("streams native record queries", () => {
		const http = makeHttpHarness([emptyResponse])

		return provideClient(
			Effect.gen(function* () {
				const attio = yield* TestAttioClient
				yield* attio.invoices
					.listStream({
						filter: { invoice_number: { $starts_with: "INV-" } },
						offset: 3,
					})
					.pipe(Stream.runDrain)

				expect(requestBody(http.requests[0]!)).toEqual({
					filter: { invoice_number: { $starts_with: "INV-" } },
					limit: 500,
					offset: 3,
				})
			}),
			http.layer,
		)
	})

	it.effect("streams builder and native list queries", () => {
		const viewId = "66666666-6666-4666-8666-666666666666"
		const http = makeHttpHarness([emptyResponse, emptyResponse])

		return provideClient(
			Effect.gen(function* () {
				const attio = yield* TestAttioClient
				yield* attio.lists.opportunities
					.findManyStream({
						where: (_entry, parent, { contains }) =>
							contains(parent.name, "Acme"),
					})
					.pipe(Stream.runDrain)
				yield* attio.lists.opportunities
					.listStream({ filter_view_id: viewId, offset: 2 })
					.pipe(Stream.runDrain)

				expect(http.requests[0]?.url).toBe(
					"https://api.test/v2/lists/opportunities/entries/query",
				)
				expect(requestBody(http.requests[0]!)).toEqual({
					filter: {
						path: [
							["opportunities", "parent_record"],
							["companies", "name"],
						],
						constraints: { $contains: "Acme" },
					},
					limit: 500,
					offset: 0,
				})
				expect(requestBody(http.requests[1]!)).toEqual({
					filter_view_id: viewId,
					limit: 500,
					offset: 2,
				})
			}),
			http.layer,
		)
	})
})
