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
			}
		}),
	},
) {}
