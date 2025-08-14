import * as HttpClientRequest from "@effect/platform/HttpClientRequest"
import * as HttpClientResponse from "@effect/platform/HttpClientResponse"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import { AttioHttpClient } from "../http-client.js"
import { Actor, DataStruct, ObjectId, RecordId } from "../shared/schemas.js"

export const CommentId = Schema.Struct({
	comment_id: Schema.UUID,
})

export const EntryReference = Schema.Struct({
	list_entry_id: Schema.String,
	list_id: Schema.String,
})

export const RecordReference = Schema.Struct({
	...RecordId.fields,
	...ObjectId.fields,
})

export const Comment = Schema.Struct({
	id: CommentId,
	thread_id: Schema.UUID,
	content_plaintext: Schema.String,
	entry: Schema.NullOr(EntryReference),
	record: RecordReference,
	resolved_at: Schema.NullOr(Schema.DateTimeUtc),
	resolved_by: Schema.NullOr(Actor),
	created_at: Schema.DateTimeUtc,
	author: Actor,
})

export const CommentInput = Schema.Struct({
	thread_id: Schema.UUID,
	content_plaintext: Schema.String,
	entry_id: Schema.optional(Schema.String),
	record_id: Schema.optional(Schema.String),
	author_id: Schema.optional(Schema.String),
})

export class AttioComments extends Effect.Service<AttioComments>()(
	"AttioComments",
	{
		effect: Effect.gen(function* () {
			const http = yield* AttioHttpClient

			return {
				/**
				 * Create a new comment related to an existing thread, record or entry.
				 *
				 * Required scopes: `comment:read-write`
				 * For records: `object_configuration:read`, `record_permission:read`
				 * For list entries: `list_configuration:read`, `list_entry:read`
				 */
				create: Effect.fn("comments.create")(function* (
					comment: Schema.Schema.Encoded<typeof CommentInput>,
				) {
					const data = yield* Schema.encodeUnknown(CommentInput)(comment)
					return yield* HttpClientRequest.post("/v2/comments").pipe(
						HttpClientRequest.bodyJson({ data }),
						Effect.flatMap(http.execute),
						Effect.flatMap(
							HttpClientResponse.schemaBodyJson(DataStruct(Comment)),
						),
						Effect.map((result) => result.data),
					)
				}),

				/**
				 * Get a single comment by ID.
				 *
				 * Required scopes: `comment:read`
				 * For records: `object_configuration:read`, `record_permission:read`
				 * For list entries: `list_configuration:read`, `list_entry:read`
				 */
				get: Effect.fn("comments.get")(function* (commentId: string) {
					return yield* http.get(`/v2/comments/${commentId}`).pipe(
						Effect.flatMap(
							HttpClientResponse.schemaBodyJson(DataStruct(Comment)),
						),
						Effect.map((result) => result.data),
					)
				}),

				/**
				 * Delete a comment by ID. If deleting a comment at the head of a thread,
				 * all messages in the thread are also deleted.
				 *
				 * Required scopes: `comment:read-write`
				 */
				delete: Effect.fn("comments.delete")(function* (commentId: string) {
					yield* http.del(`/v2/comments/${commentId}`)
				}),
			}
		}),
	},
) {}
