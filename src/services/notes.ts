import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import * as HttpClientRequest from "effect/unstable/http/HttpClientRequest"
import * as HttpClientResponse from "effect/unstable/http/HttpClientResponse"
import {
	AttioNotFoundErrorTransform,
	AttioValidationErrorTransform,
	mapAttioErrors,
} from "../error-transforms.js"
import { AttioHttpClient } from "../http-client.js"
import { Actor, DataStruct, Tag, Uuid } from "../shared/schemas.js"
import type { ReplaceField } from "../shared/type-utils.js"

export const NoteId = Schema.Struct({
	workspace_id: Schema.String,
	note_id: Schema.String,
})

export const Note = Schema.Struct({
	id: NoteId,
	parent_object: Schema.String,
	parent_record_id: Uuid,
	title: Schema.String,
	content_plaintext: Schema.String,
	content_markdown: Schema.String,
	tags: Schema.Array(Tag),
	created_by_actor: Actor,
	created_at: Schema.DateTimeUtcFromString,
})

export const NoteInput = Schema.Struct({
	parent_object: Schema.String,
	parent_record_id: Uuid,
	title: Schema.String,
	content: Schema.String,
	format: Schema.Literals(["plaintext", "markdown"]),
	created_at: Schema.optional(Schema.DateTimeUtcFromString),
	meeting_id: Schema.optional(Schema.NullOr(Uuid)),
})

export const NoteListParams = Schema.Struct({
	limit: Schema.optional(Schema.Number),
	offset: Schema.optional(Schema.Number),
	parent_object: Schema.optional(Schema.String),
	parent_record_id: Schema.optional(Uuid),
})

const makeAttioNotes = Effect.gen(function* () {
	const http = yield* AttioHttpClient

	return {
		/**
		 * List notes for all records or for a specific record.
		 *
		 * Required scopes: `note:read`, `object_configuration:read`, `record_permission:read`
		 */
		list: Effect.fn("AttioNotes.list")(function* (
			params?: (typeof NoteListParams)["Type"],
		) {
			return yield* HttpClientRequest.get("/v2/notes").pipe(
				HttpClientRequest.appendUrlParams(params ?? {}),
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
		create: Effect.fn("AttioNotes.create")(function* (
			note: (typeof NoteInput)["Encoded"],
		) {
			const data = yield* Schema.encodeUnknownEffect(NoteInput)(note)
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
		get: Effect.fn("AttioNotes.get")(function* (noteId: string) {
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
		delete: Effect.fn("AttioNotes.delete")(function* (noteId: string) {
			yield* http
				.del(`/v2/notes/${noteId}`)
				.pipe(mapAttioErrors(AttioNotFoundErrorTransform))
		}),
	}
})

export class AttioNotes extends Context.Service<
	AttioNotes,
	Effect.Success<typeof makeAttioNotes>
>()("effect-attio/services/AttioNotes") {
	static readonly layer = Layer.effect(
		AttioNotes,
		Effect.map(makeAttioNotes, AttioNotes.of),
	)
}

export type GenericAttioNotes<TObjectName extends string> = Omit<
	AttioNotes["Service"],
	"list" | "create"
> & {
	list: (
		params?: ReplaceField<
			NonNullable<Parameters<AttioNotes["Service"]["list"]>[0]>,
			"parent_object",
			TObjectName
		>,
	) => ReturnType<AttioNotes["Service"]["list"]>
	create: (
		note: ReplaceField<
			Parameters<AttioNotes["Service"]["create"]>[0],
			"parent_object",
			TObjectName
		>,
	) => ReturnType<AttioNotes["Service"]["create"]>
}
