import * as HttpClientRequest from "@effect/platform/HttpClientRequest"
import * as HttpClientResponse from "@effect/platform/HttpClientResponse"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import { AttioHttpClient } from "../http-client.js"
import { schemaBodyJsonNever } from "../schemas/body.js"
import { DataStruct } from "../shared/schemas.js"

const EntryId = Schema.Struct({
	workspace_id: Schema.UUID,
	list_id: Schema.UUID,
	entry_id: Schema.UUID,
})

export class AttioEntries extends Effect.Service<AttioEntries>()(
	"AttioEntries",
	{
		effect: Effect.gen(function* () {
			const http = yield* AttioHttpClient

			return {
				/**
				 * Lists entries in a given list, with the option to filter and sort results.
				 *
				 * Required scopes: `list_entry:read`, `list_configuration:read`
				 *
				 * @see https://docs.attio.com/rest-api/endpoint-reference/entries/list-entries
				 */
				list: Effect.fn(`entries.list`)(function* <
					T extends { input: Schema.Schema.Any; output: Schema.Schema.Any },
				>(
					list: string,
					schema: T,
					params?: {
						filter?: Record<string, any>
						sorts?: Array<
							| {
									direction: "asc" | "desc"
									attribute: string
									field?: string
							  }
							| {
									direction: "asc" | "desc"
									path: Array<[string, string]>
									field?: string
							  }
						>
						limit?: number
						offset?: number
					},
				) {
					return yield* HttpClientRequest.post(
						`/v2/lists/${list}/entries/query`,
					).pipe(
						HttpClientRequest.bodyJson({
							filter: params?.filter,
							sorts: params?.sorts,
							limit: params?.limit ?? 500,
							offset: params?.offset ?? 0,
						}),
						Effect.flatMap(http.execute),
						Effect.flatMap(
							schemaBodyJsonNever(
								DataStruct(
									Schema.Array(
										Schema.Struct({
											id: EntryId,
											parent_record_id: Schema.UUID,
											parent_object: Schema.String,
											created_at: Schema.DateTimeUtc,
											entry_values: schema.output,
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

// extract method signatures from service with inferred types
export type GenericAttioEntries<
	T extends { input: Schema.Schema.Any; output: Schema.Schema.Any },
> = {
	list: (
		params?: Parameters<typeof AttioEntries.Service.list<T>>[2],
	) => ReturnType<typeof AttioEntries.Service.list<T>>
}
