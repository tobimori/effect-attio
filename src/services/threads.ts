import * as HttpClientRequest from "@effect/platform/HttpClientRequest"
import * as HttpClientResponse from "@effect/platform/HttpClientResponse"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import {
	AttioNotFoundErrorTransform,
	mapAttioErrors,
} from "../error-transforms.js"
import { AttioHttpClient } from "../http-client.js"
import { DataStruct } from "../shared/schemas.js"
import { Comment } from "./comments.js"
export const ThreadId = Schema.Struct({
	thread_id: Schema.UUID,
})

export const Thread = Schema.Struct({
	id: ThreadId,
	comments: Schema.NonEmptyArray(Comment),
	created_at: Schema.DateTimeUtc,
})

export const ThreadListParams = Schema.Struct({
	record_id: Schema.optional(Schema.UUID),
	object: Schema.optional(Schema.String),
	entry_id: Schema.optional(Schema.UUID),
	list: Schema.optional(Schema.String),
	limit: Schema.optional(Schema.Number),
	offset: Schema.optional(Schema.Number),
})

export class AttioThreads extends Effect.Service<AttioThreads>()(
	"AttioThreads",
	{
		effect: Effect.gen(function* () {
			const http = yield* AttioHttpClient

			return {
				/**
				 * List threads of comments on a record or list entry.
				 *
				 * Required scopes: `comment:read`
				 * For records: `object_configuration:read`, `record_permission:read`
				 * For list entries: `list_configuration:read`, `list_entry:read`
				 */
				list: Effect.fn("threads.list")(function* (
					params?: Schema.Schema.Type<typeof ThreadListParams>,
				) {
					return yield* HttpClientRequest.get("/v2/threads").pipe(
						HttpClientRequest.appendUrlParams(params ?? {}),
						http.execute,
						Effect.flatMap(
							HttpClientResponse.schemaBodyJson(
								DataStruct(Schema.Array(Thread)),
							),
						),
						Effect.map((result) => result.data),
					)
				}),

				/**
				 * Get all comments in a thread.
				 *
				 * Required scopes: `comment:read`
				 * For records: `object_configuration:read`, `record_permission:read`
				 * For list entries: `list_configuration:read`, `list_entry:read`
				 */
				get: Effect.fn("threads.get")(function* (threadId: string) {
					return yield* http.get(`/v2/threads/${threadId}`).pipe(
						Effect.flatMap(
							HttpClientResponse.schemaBodyJson(DataStruct(Thread)),
						),
						Effect.map((result) => result.data),
						mapAttioErrors(AttioNotFoundErrorTransform),
					)
				}),
			}
		}),
	},
) {}
