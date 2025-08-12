import * as HttpClientRequest from "@effect/platform/HttpClientRequest"
import * as HttpClientResponse from "@effect/platform/HttpClientResponse"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import { AttioHttpClient } from "../../http-client.js"
import * as Schemas from "./schemas.js"
import type * as Types from "./types.js"

export type { Note, NoteInput, NoteListParams } from "./types.js"

export class AttioNotes extends Effect.Service<AttioNotes>()("AttioNotes", {
	effect: Effect.gen(function* () {
		const http = yield* AttioHttpClient

		return {
			/**
			 * List notes for all records or for a specific record.
			 *
			 * Required scopes: `note:read`, `object_configuration:read`, `record_permission:read`
			 */
			list: Effect.fn("notes.list")(function* (params?: Types.NoteListParams) {
				return yield* HttpClientRequest.get("/v2/notes").pipe(
					HttpClientRequest.appendUrlParams(params),
					http.execute,
					Effect.flatMap(
						HttpClientResponse.schemaBodyJson(Schemas.NoteListResponse),
					),
					Effect.map((result) => result.data),
				)
			}),

			/**
			 * Create a new note for a given record.
			 *
			 * Required scopes: `note:read-write`, `object_configuration:read`, `record_permission:read`
			 */
			create: Effect.fn("notes.create")(function* (note: Types.NoteInput) {
				const body = yield* Schema.decode(Schemas.NoteInputRequest)({
					data: note,
				})
				return yield* HttpClientRequest.post("/v2/notes").pipe(
					HttpClientRequest.bodyJson(body),
					Effect.flatMap(http.execute),
					Effect.flatMap(
						HttpClientResponse.schemaBodyJson(Schemas.NoteResponse),
					),
					Effect.map((result) => result.data),
				)
			}),

			/**
			 * Get a single note by ID.
			 *
			 * Required scopes: `note:read`, `object_configuration:read`, `record_permission:read`
			 */
			get: Effect.fn("notes.get")(function* (noteId: string) {
				return yield* http.get(`/v2/notes/${noteId}`).pipe(
					Effect.flatMap(
						HttpClientResponse.schemaBodyJson(Schemas.NoteResponse),
					),
					Effect.map((result) => result.data),
				)
			}),

			/**
			 * Delete a single note by ID.
			 *
			 * Required scopes: `note:read-write`
			 */
			delete: Effect.fn("notes.delete")(function* (noteId: string) {
				yield* http.del(`/v2/notes/${noteId}`)
			}),
		}
	}),
}) {}