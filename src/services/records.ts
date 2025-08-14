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
				 *
				 * @see https://docs.attio.com/rest-api/endpoint-reference/records/list-records
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
				 *
				 * @see https://docs.attio.com/rest-api/endpoint-reference/records/create-or-update-a-record
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
				 * # Get a record
				 *
				 * Gets a single person, company or other record by its `record_id`.
				 *
				 * Required scopes: `record_permission:read`, `object_configuration:read`
				 *
				 * @see https://docs.attio.com/rest-api/endpoint-reference/records/get-a-record
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
				 * # Create a record
				 *
				 * Creates a new person, company or other record. This endpoint will throw on conflicts of unique attributes.
				 * If you would prefer to update records on conflicts, please use the assert record endpoint instead.
				 *
				 * Required scopes: `record_permission:read-write`, `object_configuration:read`
				 *
				 * @see https://docs.attio.com/rest-api/endpoint-reference/records/create-a-record
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
				 * # Update a record (overwrite multiselect values)
				 *
				 * Use this endpoint to update people, companies, and other records by `record_id`.
				 * If the update payload includes multiselect attributes, the values supplied will overwrite/remove the list of values that already exist (if any).
				 * Use the `patch` endpoint to append multiselect values without removing those that already exist.
				 *
				 * Required scopes: `record_permission:read-write`, `object_configuration:read`
				 *
				 * @see https://docs.attio.com/rest-api/endpoint-reference/records/update-a-record-overwrite-multiselect-values
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
							data: {
								values: yield* Schema.encode(Schema.partial(schema.input))(
									data,
								),
							},
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
				 * # Update a record (append multiselect values)
				 *
				 * Use this endpoint to update people, companies, and other records by `record_id`.
				 * If the update payload includes multiselect attributes, the values supplied will be created and prepended to the list of values that already exist (if any).
				 * Use the `update` endpoint to overwrite or remove multiselect attribute values.
				 *
				 * Required scopes: `record_permission:read-write`, `object_configuration:read`
				 *
				 * @see https://docs.attio.com/rest-api/endpoint-reference/records/update-a-record-append-multiselect-values
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
							data: {
								values: yield* Schema.encode(Schema.partial(schema.input))(
									data,
								),
							},
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
				 * # Delete a record
				 *
				 * Deletes a single record (e.g. a company or person) by ID.
				 *
				 * Required scopes: `object_configuration:read`, `record_permission:read-write`
				 *
				 * @see https://docs.attio.com/rest-api/endpoint-reference/records/delete-a-record
				 */
				delete: Effect.fn(`record.delete`)(function* (
					object: string,
					recordId: string,
				) {
					yield* http.del(`/v2/objects/${object}/records/${recordId}`)
				}),

				/**
				 * # List record attribute values
				 *
				 * Gets all values for a given attribute on a record. Historic values can be queried using the show_historic query param.
				 * Historic values cannot be queried on COMINT (Communication Intelligence) or enriched attributes and the endpoint will return a 400 error if this is attempted.
				 * Historic values are sorted from oldest to newest (by active_from).
				 * Some attributes are subject to billing status and will return an empty array of values if the workspace being queried does not have the required billing flag enabled.
				 *
				 * Required scopes: `record_permission:read`, `object_configuration:read`
				 *
				 * @see https://docs.attio.com/rest-api/endpoint-reference/records/list-record-attribute-values
				 */
				listAttributeValues: Effect.fn(`record.listAttributeValues`)(function* (
					object: string,
					recordId: string,
					attribute: string,
					params?: {
						show_historic?: boolean
						limit?: number
						offset?: number
					},
				) {
					return yield* HttpClientRequest.get(
						`/v2/objects/${object}/records/${recordId}/attributes/${attribute}/values`,
					).pipe(
						HttpClientRequest.setUrlParams({
							show_historic: params?.show_historic?.toString(),
							limit: params?.limit?.toString(),
							offset: params?.offset?.toString(),
						}),
						http.execute,
						Effect.flatMap(
							HttpClientResponse.schemaBodyJson(
								DataStruct(Schema.Array(Schema.Unknown)),
							),
						),
						Effect.map((result) => result.data),
					)
				}),

				/**
				 * # List record entries
				 *
				 * List all entries, across all lists, for which this record is the parent.
				 *
				 * Required scopes: `record_permission:read`, `object_configuration:read`, `list_entry:read`
				 *
				 * @see https://docs.attio.com/rest-api/endpoint-reference/records/list-record-entries
				 */
				listEntries: Effect.fn(`record.listEntries`)(function* (
					object: string,
					recordId: string,
					params?: {
						limit?: number
						offset?: number
					},
				) {
					return yield* HttpClientRequest.get(
						`/v2/objects/${object}/records/${recordId}/entries`,
					).pipe(
						HttpClientRequest.setUrlParams({
							limit: params?.limit?.toString(),
							offset: params?.offset?.toString(),
						}),
						http.execute,
						Effect.flatMap(
							HttpClientResponse.schemaBodyJson(
								DataStruct(
									Schema.Array(
										Schema.Struct({
											list_id: Schema.UUID,
											list_api_slug: Schema.String,
											entry_id: Schema.UUID,
											created_at: Schema.String,
										}),
									),
								),
							),
						),
						Effect.map((result) => result.data),
					)
				}),
			}
		}),
	},
) {}
