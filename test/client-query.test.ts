import { describe, expect, it } from "@effect/vitest"
import { DateTime, Effect, Layer, Option, Redacted, Stream } from "effect"
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
				invoice_date: Attributes.Date,
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
				invoice_date: [],
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

describe("complete endpoint coverage", () => {
	it.effect("sends requests to every newly supported active endpoint", () => {
		const http = makeHttpHarness(Array.from({ length: 29 }, () => ({})))
		const id = recordId
		const dateTime = DateTime.makeUnsafe(timestamp)

		return provideClient(
			Effect.gen(function* () {
				const attio = yield* TestAttioClient
				const attempt = <A, E>(effect: Effect.Effect<A, E>) =>
					Effect.asVoid(Effect.exit(effect))

				yield* attempt(
					attio.attributes.list("objects", "invoices", {
						show_archived: true,
					}),
				)
				yield* attempt(
					attio.attributes.create("objects", "invoices", {
						title: "Reference",
						description: null,
						api_slug: "reference",
						type: "text",
						is_required: false,
						is_unique: false,
						is_multiselect: false,
						config: {},
					}),
				)
				yield* attempt(attio.attributes.get("objects", "invoices", "reference"))
				yield* attempt(
					attio.attributes.update("objects", "invoices", "reference", {
						title: "Updated reference",
					}),
				)
				yield* attempt(
					attio.attributes.listSelectOptions(
						"objects",
						"invoices",
						"category",
						{ show_archived: true },
					),
				)
				yield* attempt(
					attio.attributes.createSelectOption(
						"objects",
						"invoices",
						"category",
						{ title: "New" },
					),
				)
				yield* attempt(
					attio.attributes.updateSelectOption(
						"objects",
						"invoices",
						"category",
						"new",
						{ is_archived: true },
					),
				)
				yield* attempt(
					attio.attributes.listStatuses("lists", "opportunities", "stage"),
				)
				yield* attempt(
					attio.attributes.createStatus("lists", "opportunities", "stage", {
						title: "Qualified",
					}),
				)
				yield* attempt(
					attio.attributes.updateStatus(
						"lists",
						"opportunities",
						"stage",
						"qualified",
						{ celebration_enabled: true },
					),
				)

				yield* attempt(
					attio.records.search({
						query: "invoice",
						objects: ["invoices"],
						request_as: { type: "workspace" },
					}),
				)
				yield* attempt(
					attio.invoices.merge({
						primary_record_id: id,
						secondary_record_id: "44444444-4444-4444-8444-444444444444",
					}),
				)
				yield* attempt(
					attio.invoices.writeAttributeValues(id, "invoice_date", {
						values: [
							{
								value: dateTime,
								active_from: dateTime,
								active_until: null,
							},
						],
						replace_history: true,
					}),
				)
				yield* attempt(
					attio.lists.opportunities.writeAttributeValues(id, "title", {
						values: [
							{
								value: "Enterprise",
								active_from: dateTime,
								active_until: null,
							},
						],
						replace_history: true,
					}),
				)
				yield* attempt(attio.sql.query("SELECT * FROM invoices"))

				yield* attempt(
					attio.emails.list({
						linked_object: "invoices",
						linked_record_ids: id,
					}),
				)
				yield* attempt(
					attio.meetings.list({
						linked_object: "invoices",
						linked_record_id: id,
					}),
				)
				yield* attempt(
					attio.meetings.create({
						title: "Review",
						description: "Invoice review",
						start: { datetime: dateTime, timezone: "UTC" },
						end: { datetime: dateTime, timezone: "UTC" },
						is_all_day: false,
						participants: [
							{ is_organizer: true, status: "accepted", name: "Attio" },
						],
						linked_records: [{ object: "invoices", record_id: id }],
					}),
				)
				yield* attempt(attio.meetings.get(id))
				yield* attempt(attio.meetings.listCallRecordings(id))
				yield* attempt(
					attio.meetings.createCallRecording(id, {
						video_url: "https://example.test/recording.mp4",
					}),
				)
				yield* attempt(attio.meetings.getCallRecording(id, id))
				yield* attempt(attio.meetings.deleteCallRecording(id, id))

				yield* attempt(attio.files.list({ object: "invoices", record_id: id }))
				yield* attempt(
					attio.files.create({
						object: "invoices",
						record_id: id,
						file_type: "folder",
						name: "Documents",
					}),
				)
				yield* attempt(
					attio.files.upload({
						file: new Blob(["invoice"], { type: "text/plain" }),
						fileName: "invoice.txt",
						object: "invoices",
						record_id: id,
					}),
				)
				yield* attempt(attio.files.get(id))
				yield* attempt(attio.files.delete(id))
				yield* attempt(attio.files.download(id))

				const requests = http.requests.map((request) => {
					const url = new URL(request.url)
					return [request.method, url.pathname] as const
				})

				expect(requests).toEqual([
					["GET", "/v2/objects/invoices/attributes"],
					["POST", "/v2/objects/invoices/attributes"],
					["GET", "/v2/objects/invoices/attributes/reference"],
					["PATCH", "/v2/objects/invoices/attributes/reference"],
					["GET", "/v2/objects/invoices/attributes/category/options"],
					["POST", "/v2/objects/invoices/attributes/category/options"],
					["PATCH", "/v2/objects/invoices/attributes/category/options/new"],
					["GET", "/v2/lists/opportunities/attributes/stage/statuses"],
					["POST", "/v2/lists/opportunities/attributes/stage/statuses"],
					[
						"PATCH",
						"/v2/lists/opportunities/attributes/stage/statuses/qualified",
					],
					["POST", "/v2/objects/records/search"],
					["POST", "/v2/objects/invoices/records/merge"],
					[
						"PUT",
						`/v2/objects/invoices/records/${id}/attributes/invoice_date/values`,
					],
					[
						"PUT",
						`/v2/lists/opportunities/entries/${id}/attributes/title/values`,
					],
					["POST", "/v2/sql"],
					["GET", "/v2/emails"],
					["GET", "/v2/meetings"],
					["POST", "/v2/meetings"],
					["GET", `/v2/meetings/${id}`],
					["GET", `/v2/meetings/${id}/call_recordings`],
					["POST", `/v2/meetings/${id}/call_recordings`],
					["GET", `/v2/meetings/${id}/call_recordings/${id}`],
					["DELETE", `/v2/meetings/${id}/call_recordings/${id}`],
					["GET", "/v2/files"],
					["POST", "/v2/files"],
					["POST", "/v2/files/upload"],
					["GET", `/v2/files/${id}`],
					["DELETE", `/v2/files/${id}`],
					["GET", `/v2/files/${id}/download`],
				])

				expect(requestBody(http.requests[10]!)).toEqual({
					query: "invoice",
					objects: ["invoices"],
					request_as: { type: "workspace" },
				})
				expect(requestBody(http.requests[11]!)).toEqual({
					data: {
						primary_record_id: id,
						secondary_record_id: "44444444-4444-4444-8444-444444444444",
					},
				})
				expect(requestBody(http.requests[12]!)).toEqual({
					data: {
						values: [
							{
								value: "2025-01-02",
								active_from: timestamp,
								active_until: null,
							},
						],
						replace_history: true,
					},
				})
				expect(requestBody(http.requests[14]!)).toEqual({
					sql: "SELECT * FROM invoices",
				})
				expect(requestBody(http.requests[24]!)).toEqual({
					object: "invoices",
					record_id: id,
					file_type: "folder",
					name: "Documents",
				})
				expect(http.requests[25]?.body._tag).toBe("FormData")
			}),
			http.layer,
		)
	})

	it.effect("decodes each new response family", () => {
		const actor = { type: "system", id: null }
		const http = makeHttpHarness([
			{
				data: [
					{
						id: {
							workspace_id: workspaceId,
							object_id: objectId,
							attribute_id: recordId,
						},
						title: "Reference",
						description: null,
						api_slug: "reference",
						type: "text",
						is_system_attribute: false,
						is_writable: true,
						is_required: false,
						is_unique: false,
						is_multiselect: false,
						is_default_value_enabled: false,
						is_archived: false,
						default_value: null,
						relationship: null,
						created_at: timestamp,
						config: {
							currency: {
								default_currency_code: null,
								display_type: null,
							},
							record_reference: { allowed_object_ids: null },
						},
					},
				],
			},
			{
				data: [
					{
						id: {
							workspace_id: workspaceId,
							object_id: objectId,
							record_id: recordId,
						},
						record_text: "INV-001",
						record_image: null,
						object_slug: "invoices",
					},
				],
			},
			{ data: { rows: [{ count: 1 }] } },
			{
				data: [
					{
						id: {
							workspace_id: workspaceId,
							mailbox_id: objectId,
							email_id: recordId,
						},
						sent_at: timestamp,
						direction: "inbound",
						subject_line: "Invoice",
						participants: [],
						linked_records: [],
					},
				],
				pagination: { next_cursor: null },
			},
			{
				data: {
					id: { workspace_id: workspaceId, meeting_id: recordId },
					title: "Review",
					description: "Invoice review",
					is_all_day: false,
					start: { datetime: timestamp, timezone: "UTC" },
					end: { datetime: timestamp, timezone: "UTC" },
					participants: [],
					linked_records: [],
					created_at: timestamp,
					created_by_actor: actor,
				},
			},
			{
				data: {
					id: {
						workspace_id: workspaceId,
						meeting_id: recordId,
						call_recording_id: objectId,
					},
					status: "completed",
					web_url: "https://app.attio.com/calls/1",
					created_by_actor: actor,
					created_at: timestamp,
					video_url: null,
					transcript: null,
				},
			},
			{
				data: {
					id: { workspace_id: workspaceId, file_id: recordId },
					object_id: objectId,
					object_slug: "invoices",
					record_id: recordId,
					storage_provider: "attio",
					created_by_actor: actor,
					created_at: timestamp,
					file_type: "file",
					name: "invoice.txt",
					content_type: "text/plain",
					content_size: 7,
					parent_folder_id: null,
				},
			},
		])

		return provideClient(
			Effect.gen(function* () {
				const attio = yield* TestAttioClient
				const attributes = yield* attio.attributes.list("objects", "invoices")
				const records = yield* attio.records.search({
					query: "INV",
					objects: ["invoices"],
					request_as: { type: "workspace" },
				})
				const rows = yield* attio.sql.query("SELECT 1 AS count")
				const emails = yield* attio.emails.list()
				const meeting = yield* attio.meetings.get(recordId)
				const call = yield* attio.meetings.getCallRecording(recordId, objectId)
				const file = yield* attio.files.get(recordId)

				expect(attributes[0]?.api_slug).toBe("reference")
				expect(records[0]?.record_text).toBe("INV-001")
				expect(rows[0]).toEqual({ count: 1 })
				expect(emails.data[0]?.subject_line).toBe("Invoice")
				expect(meeting.title).toBe("Review")
				expect(call.status).toBe("completed")
				expect(file.file_type).toBe("file")
			}),
			http.layer,
		)
	})
})
