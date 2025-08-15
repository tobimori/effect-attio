import * as HttpClientRequest from "@effect/platform/HttpClientRequest"
import * as HttpClientResponse from "@effect/platform/HttpClientResponse"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import {
	AttioNotFoundErrorTransform,
	AttioValidationErrorTransform,
	mapAttioErrors,
} from "../error-transforms.js"
import { AttioHttpClient } from "../http-client.js"
import { Actor, DataStruct, Tag } from "../shared/schemas.js"

export const NoteId = Schema.Struct({
	workspace_id: Schema.String,
	note_id: Schema.String,
})

export const Note = Schema.Struct({
	id: NoteId,
	parent_object: Schema.String,
	parent_record_id: Schema.UUID,
	title: Schema.String,
	content_plaintext: Schema.String,
	content_markdown: Schema.String,
	tags: Schema.Array(Tag),
	created_by_actor: Actor,
	created_at: Schema.DateTimeUtc,
})

export const NoteInput = Schema.Struct({
	parent_object: Schema.String,
	parent_record_id: Schema.UUID,
	title: Schema.String,
	content: Schema.String,
	format: Schema.Literal("plaintext", "markdown"),
})

export const NoteListParams = Schema.Struct({
	limit: Schema.optional(Schema.Number),
	offset: Schema.optional(Schema.Number),
	parent_object: Schema.optional(Schema.String),
	parent_record_id: Schema.optional(Schema.UUID),
})

export class AttioNotes extends Effect.Service<AttioNotes>()("AttioNotes", {
	effect: Effect.gen(function* () {
		const http = yield* AttioHttpClient

		return {
			/**
			 * List notes for all records or for a specific record.
			 *
			 * Required scopes: `note:read`, `object_configuration:read`, `record_permission:read`
			 */
			list: Effect.fn("notes.list")(function* (
				params?: Schema.Schema.Type<typeof NoteListParams>,
			) {
				return yield* HttpClientRequest.get("/v2/notes").pipe(
					HttpClientRequest.appendUrlParams(params),
					http.execute,
					Effect.flatMap(
						HttpClientResponse.schemaBodyJson(DataStruct(Schema.Array(Note))),
					),
					Effect.map((result) => result.data),
				)
			}),

			/**
			 * Create a new note for a given record.
			 *
			 * Required scopes: `note:read-write`, `object_configuration:read`, `record_permission:read`
			 */
			create: Effect.fn("notes.create")(function* (
				note: Schema.Schema.Encoded<typeof NoteInput>,
			) {
				const data = yield* Schema.encodeUnknown(NoteInput)(note)
				return yield* HttpClientRequest.post("/v2/notes").pipe(
					HttpClientRequest.bodyJson({ data }),
					Effect.flatMap(http.execute),
					Effect.flatMap(HttpClientResponse.schemaBodyJson(DataStruct(Note))),
					Effect.map((result) => result.data),
					mapAttioErrors(AttioValidationErrorTransform),
				)
			}),

			/**
			 * Get a single note by ID.
			 *
			 * Required scopes: `note:read`, `object_configuration:read`, `record_permission:read`
			 */
			get: Effect.fn("notes.get")(function* (noteId: string) {
				return yield* http.get(`/v2/notes/${noteId}`).pipe(
					Effect.flatMap(HttpClientResponse.schemaBodyJson(DataStruct(Note))),
					Effect.map((result) => result.data),
					mapAttioErrors(AttioNotFoundErrorTransform),
				)
			}),

			/**
			 * Delete a single note by ID.
			 *
			 * Required scopes: `note:read-write`
			 */
			delete: Effect.fn("notes.delete")(function* (noteId: string) {
				yield* http
					.del(`/v2/notes/${noteId}`)
					.pipe(mapAttioErrors(AttioNotFoundErrorTransform))
			}),
		}
	}),
}) {}
