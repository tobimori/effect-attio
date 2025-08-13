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

export const createRecordSchema = <T extends Schema.Schema.Any>(
	valuesSchema: T,
) =>
	Schema.Struct({
		id: RecordId,
		created_at: Schema.DateTimeUtc,
		values: valuesSchema,
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
				get: Effect.fn(`record.get`)(function* <T extends Schema.Schema.Any>(
					object: string,
					recordId: string,
					valuesSchema: T,
				) {
					const recordSchema = createRecordSchema(valuesSchema)

					return yield* http
						.get(`/v2/objects/${object}/records/${recordId}`)
						.pipe(
							Effect.flatMap(
								HttpClientResponse.schemaBodyJson(DataStruct(recordSchema)),
							),
							Effect.map((result) => result.data),
						)
				}),
			}
		}),
	},
) {}
