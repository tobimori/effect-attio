import * as HttpClientRequest from "@effect/platform/HttpClientRequest"
import * as HttpClientResponse from "@effect/platform/HttpClientResponse"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import {
	ConflictErrorSchema,
	mapAttioErrors,
	NotFoundErrorSchema,
	ValidationErrorSchema,
} from "../errors.js"
import { AttioHttpClient } from "../http-client.js"
import { DataStruct, ObjectId, WorkspaceId } from "../shared/schemas.js"

export const ObjectIdStruct = Schema.Struct({
	...WorkspaceId.fields,
	...ObjectId.fields,
})

export const AttioObject = Schema.Struct({
	id: ObjectIdStruct,
	api_slug: Schema.NullOr(Schema.String),
	singular_noun: Schema.NullOr(Schema.String),
	plural_noun: Schema.NullOr(Schema.String),
	created_at: Schema.DateTimeUtc,
})

export const ObjectInput = Schema.Struct({
	api_slug: Schema.String,
	singular_noun: Schema.String,
	plural_noun: Schema.String,
})

export const ObjectUpdate = Schema.Struct({
	api_slug: Schema.optional(Schema.String),
	singular_noun: Schema.optional(Schema.String),
	plural_noun: Schema.optional(Schema.String),
})

export class AttioObjects extends Effect.Service<AttioObjects>()(
	"AttioObjects",
	{
		effect: Effect.gen(function* () {
			const http = yield* AttioHttpClient

			return {
				/**
				 * Lists all system-defined and user-defined objects in your workspace.
				 *
				 * Required scopes: `object_configuration:read`
				 */
				list: Effect.fn("objects.list")(function* () {
					return yield* http.get("/v2/objects").pipe(
						Effect.flatMap(
							HttpClientResponse.schemaBodyJson(
								DataStruct(Schema.Array(AttioObject)),
							),
						),
						Effect.map((result) => result.data),
					)
				}),

				/**
				 * Creates a new custom object in your workspace.
				 *
				 * Required scopes: `object_configuration:read-write`
				 */
				create: Effect.fn("objects.create")(function* (
					object: Schema.Schema.Encoded<typeof ObjectInput>,
				) {
					const data = yield* Schema.encodeUnknown(ObjectInput)(object)

					return yield* HttpClientRequest.post("/v2/objects").pipe(
						HttpClientRequest.bodyJson({ data }),
						Effect.flatMap(http.execute),
						Effect.flatMap(
							HttpClientResponse.schemaBodyJson(DataStruct(AttioObject)),
						),
						Effect.map((result) => result.data),
						mapAttioErrors(ValidationErrorSchema, ConflictErrorSchema),
					)
				}),

				/**
				 * Gets a single object by its object_id or slug.
				 *
				 * Required scopes: `object_configuration:read`
				 */
				get: Effect.fn("objects.get")(function* (object: string) {
					return yield* http.get(`/v2/objects/${object}`).pipe(
						Effect.flatMap(
							HttpClientResponse.schemaBodyJson(DataStruct(AttioObject)),
						),
						Effect.map((result) => result.data),
						mapAttioErrors(NotFoundErrorSchema),
					)
				}),

				/**
				 * Updates a single object. The object to be updated is identified by its object_id.
				 *
				 * Required scopes: `object_configuration:read-write`
				 */
				update: Effect.fn("objects.update")(function* (
					object: string,
					update: Schema.Schema.Encoded<typeof ObjectUpdate>,
				) {
					const data = yield* Schema.encodeUnknown(ObjectUpdate)(update)

					return yield* HttpClientRequest.patch(`/v2/objects/${object}`).pipe(
						HttpClientRequest.bodyJson({ data }),
						Effect.flatMap(http.execute),
						Effect.flatMap(
							HttpClientResponse.schemaBodyJson(DataStruct(AttioObject)),
						),
						Effect.map((result) => result.data),
						mapAttioErrors(
							NotFoundErrorSchema,
							ValidationErrorSchema,
							ConflictErrorSchema,
						),
					)
				}),
			}
		}),
	},
) {}
