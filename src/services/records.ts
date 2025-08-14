import * as HttpClientRequest from "@effect/platform/HttpClientRequest"
import * as HttpClientResponse from "@effect/platform/HttpClientResponse"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import { AttioHttpClient } from "../http-client.js"
import { DataStruct } from "../shared/schemas.js"

const RecordId = Schema.Struct({
	workspace_id: Schema.UUID,
	object_id: Schema.UUID,
	record_id: Schema.UUID,
})

export class AttioRecords extends Effect.Service<AttioRecords>()(
	"AttioRecords",
	{
		effect: Effect.gen(function* () {
			const http = yield* AttioHttpClient

			return {
				/**
				 * Lists people, company or other records, with the option to filter and sort results.
				 *
				 * Required scopes: `record_permission:read`, `object_configuration:read`
				 */
				list: Effect.fn(`record.list`)(function* <
					_I extends Schema.Schema.Any,
					O extends Schema.Schema.Any,
				>(
					object: string,
					schema: { input: _I; output: O },
					params?: {
						filter?: Record<string, any>
						sorts?: Array<{
							direction: "asc" | "desc"
							attribute: string
							field?: string
						}>
						limit?: number
						offset?: number
					},
				) {
					return yield* HttpClientRequest.post(
						`/v2/objects/${object}/records/query`,
					).pipe(
						// TODO: move to schema validated request (check over all services)
						HttpClientRequest.bodyJson({
							filter: params?.filter,
							sorts: params?.sorts,
							limit: params?.limit ?? 500,
							offset: params?.offset ?? 0,
						}),
						Effect.flatMap(http.execute),
						Effect.flatMap(
							HttpClientResponse.schemaBodyJson(
								DataStruct(
									Schema.Array(
										Schema.Struct({
											id: RecordId,
											created_at: Schema.DateTimeUtc,
											web_url: Schema.String,
											values: schema.output,
										}),
									),
								),
							),
						),
						Effect.map((result) => result.data),
					)
				}),

				/**
				 * Create or update people, companies and other records.
				 * A matching attribute is used to search for existing records.
				 * If a record is found with the same value for the matching attribute, that record will be updated.
				 * If no record is found, a new record will be created instead.
				 *
				 * Required scopes: `record_permission:read-write`, `object_configuration:read`
				 */
				assert: Effect.fn(`record.assert`)(function* <
					I extends Schema.Schema.Any,
					O extends Schema.Schema.Any,
				>(
					object: string,
					schema: { input: I; output: O },
					matchingAttribute: string,
					data: Schema.Schema.Type<I>,
				) {
					return yield* HttpClientRequest.put(
						`/v2/objects/${object}/records`,
					).pipe(
						HttpClientRequest.setUrlParam(
							"matching_attribute",
							matchingAttribute,
						),
						HttpClientRequest.bodyJson({
							data: { values: yield* Schema.encode(schema.input)(data) },
						}),
						Effect.flatMap(http.execute),
						Effect.flatMap(
							HttpClientResponse.schemaBodyJson(
								DataStruct(
									Schema.Struct({
										id: RecordId,
										created_at: Schema.DateTimeUtc,
										web_url: Schema.String,
										values: schema.output,
									}),
								),
							),
						),
						Effect.map((result) => result.data),
					)
				}),

				/**
				 * Gets a single person, company or other record by its `record_id`.
				 *
				 * Required scopes: `record_permission:read`, `object_configuration:read`
				 */
				get: Effect.fn(`record.get`)(function* <
					_I extends Schema.Schema.Any,
					O extends Schema.Schema.Any,
				>(object: string, schema: { input: _I; output: O }, recordId: string) {
					return yield* http
						.get(`/v2/objects/${object}/records/${recordId}`)
						.pipe(
							Effect.flatMap(
								HttpClientResponse.schemaBodyJson(
									DataStruct(
										Schema.Struct({
											id: RecordId,
											created_at: Schema.DateTimeUtc,
											values: schema.output,
										}),
									),
								),
							),
							Effect.map((result) => result.data),
						)
				}),

				/**
				 * Creates a new person, company or other record.
				 * This endpoint will throw on conflicts of unique attributes.
				 *
				 * Required scopes: `record_permission:read-write`, `object_configuration:read`
				 */
				create: Effect.fn(`record.create`)(function* <
					I extends Schema.Schema.Any,
					O extends Schema.Schema.Any,
				>(
					object: string,
					schema: { input: I; output: O },
					data: Schema.Schema.Type<I>,
				) {
					return yield* HttpClientRequest.post(
						`/v2/objects/${object}/records`,
					).pipe(
						HttpClientRequest.bodyJson({
							data: { values: yield* Schema.encode(schema.input)(data) },
						}),
						Effect.flatMap(http.execute),
						Effect.flatMap(
							HttpClientResponse.schemaBodyJson(
								DataStruct(
									Schema.Struct({
										id: RecordId,
										created_at: Schema.DateTimeUtc,
										values: schema.output,
									}),
								),
							),
						),
						Effect.map((result) => result.data),
					)
				}),

				/**
				 * Update people, companies, and other records by record_id.
				 * Multiselect attributes will be overwritten/removed.
				 * Use the `patch` method to append multiselect values without removing existing ones.
				 *
				 * Required scopes: `record_permission:read-write`, `object_configuration:read`
				 */
				update: Effect.fn(`record.update`)(function* <
					I extends Schema.Schema.Any,
					O extends Schema.Schema.Any,
				>(
					object: string,
					schema: { input: I; output: O },
					recordId: string,
					data: Partial<Schema.Schema.Type<I>>,
				) {
					return yield* HttpClientRequest.put(
						`/v2/objects/${object}/records/${recordId}`,
					).pipe(
						HttpClientRequest.bodyJson({
							data: { values: yield* Schema.encode(Schema.partial(schema.input))(data) },
						}),
						Effect.flatMap(http.execute),
						Effect.flatMap(
							HttpClientResponse.schemaBodyJson(
								DataStruct(
									Schema.Struct({
										id: RecordId,
										created_at: Schema.DateTimeUtc,
										web_url: Schema.String,
										values: schema.output,
									}),
								),
							),
						),
						Effect.map((result) => result.data),
					)
				}),

				/**
				 * Update people, companies, and other records by record_id.
				 * Multiselect attributes will be appended without removing existing values.
				 * Use the `update` method to overwrite multiselect values.
				 *
				 * Required scopes: `record_permission:read-write`, `object_configuration:read`
				 */
				patch: Effect.fn(`record.patch`)(function* <
					I extends Schema.Schema.Any,
					O extends Schema.Schema.Any,
				>(
					object: string,
					schema: { input: I; output: O },
					recordId: string,
					data: Partial<Schema.Schema.Type<I>>,
				) {
					return yield* HttpClientRequest.patch(
						`/v2/objects/${object}/records/${recordId}`,
					).pipe(
						HttpClientRequest.bodyJson({
							data: { values: yield* Schema.encode(Schema.partial(schema.input))(data) },
						}),
						Effect.flatMap(http.execute),
						Effect.flatMap(
							HttpClientResponse.schemaBodyJson(
								DataStruct(
									Schema.Struct({
										id: RecordId,
										created_at: Schema.DateTimeUtc,
										web_url: Schema.String,
										values: schema.output,
									}),
								),
							),
						),
						Effect.map((result) => result.data),
					)
				}),

				/**
				 * Deletes a single record (e.g. a company or person) by ID.
				 *
				 * Required scopes: `object_configuration:read`, `record_permission:read-write`
				 */
				delete: Effect.fn(`record.delete`)(function* (
					object: string,
					recordId: string,
				) {
					yield* http.del(`/v2/objects/${object}/records/${recordId}`)
				}),
			}
		}),
	},
) {}
