import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import * as HttpClientRequest from "effect/unstable/http/HttpClientRequest"
import * as HttpClientResponse from "effect/unstable/http/HttpClientResponse"
import {
	AttioConflictErrorTransform,
	AttioNotFoundErrorTransform,
	AttioValidationErrorTransform,
	mapAttioErrors,
} from "../error-transforms.js"
import { AttioHttpClient } from "../http-client.js"
import { DataStruct, ObjectId, WorkspaceId } from "../shared/schemas.js"
import { ViewId, ViewListParams, ViewListResponse } from "../shared/views.js"

export const ObjectIdStruct = Schema.Struct({
	...WorkspaceId.fields,
	...ObjectId.fields,
})

export const AttioObject = Schema.Struct({
	id: ObjectIdStruct,
	api_slug: Schema.NullOr(Schema.String),
	singular_noun: Schema.NullOr(Schema.String),
	plural_noun: Schema.NullOr(Schema.String),
	created_at: Schema.DateTimeUtcFromString,
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

export const ObjectViewId = Schema.Struct({
	...WorkspaceId.fields,
	...ObjectId.fields,
	...ViewId.fields,
})

export const ObjectView = Schema.Struct({
	id: ObjectViewId,
	title: Schema.String,
	created_at: Schema.DateTimeUtcFromString,
})

const makeAttioObjects = Effect.gen(function* () {
	const http = yield* AttioHttpClient

	return {
		/**
		 * Lists all system-defined and user-defined objects in your workspace.
		 *
		 * Required scopes: `object_configuration:read`
		 */
		list: Effect.fn("AttioObjects.list")(function* () {
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
		create: Effect.fn("AttioObjects.create")(function* (
			object: (typeof ObjectInput)["Encoded"],
		) {
			const data = yield* Schema.encodeUnknownEffect(ObjectInput)(object)

			return yield* HttpClientRequest.post("/v2/objects").pipe(
				HttpClientRequest.bodyJson({ data }),
				Effect.flatMap(http.execute),
				Effect.flatMap(
					HttpClientResponse.schemaBodyJson(DataStruct(AttioObject)),
				),
				Effect.map((result) => result.data),
				mapAttioErrors(
					AttioValidationErrorTransform,
					AttioConflictErrorTransform,
				),
			)
		}),

		/**
		 * Gets a single object by its object_id or slug.
		 *
		 * Required scopes: `object_configuration:read`
		 */
		get: Effect.fn("AttioObjects.get")(function* (object: string) {
			return yield* http.get(`/v2/objects/${object}`).pipe(
				Effect.flatMap(
					HttpClientResponse.schemaBodyJson(DataStruct(AttioObject)),
				),
				Effect.map((result) => result.data),
				mapAttioErrors(AttioNotFoundErrorTransform),
			)
		}),

		/**
		 * Updates a single object. The object to be updated is identified by its object_id.
		 *
		 * Required scopes: `object_configuration:read-write`
		 */
		update: Effect.fn("AttioObjects.update")(function* (
			object: string,
			update: (typeof ObjectUpdate)["Encoded"],
		) {
			const data = yield* Schema.encodeUnknownEffect(ObjectUpdate)(update)

			return yield* HttpClientRequest.patch(`/v2/objects/${object}`).pipe(
				HttpClientRequest.bodyJson({ data }),
				Effect.flatMap(http.execute),
				Effect.flatMap(
					HttpClientResponse.schemaBodyJson(DataStruct(AttioObject)),
				),
				Effect.map((result) => result.data),
				mapAttioErrors(
					AttioNotFoundErrorTransform,
					AttioValidationErrorTransform,
					AttioConflictErrorTransform,
				),
			)
		}),

		/**
		 * Lists saved views for an object. Results are ordered by view ID.
		 *
		 * Required scopes: `object_configuration:read`
		 *
		 * @see https://docs.attio.com/rest-api/endpoint-reference/objects/list-views-for-object
		 */
		listViews: Effect.fn("AttioObjects.listViews")(function* (
			object: string,
			params?: (typeof ViewListParams)["Type"],
		) {
			const query = yield* Schema.encodeEffect(ViewListParams)(params ?? {})

			return yield* HttpClientRequest.get(`/v2/objects/${object}/views`).pipe(
				HttpClientRequest.appendUrlParams(query),
				http.execute,
				Effect.flatMap(
					HttpClientResponse.schemaBodyJson(ViewListResponse(ObjectView)),
				),
				mapAttioErrors(AttioNotFoundErrorTransform),
			)
		}), 
	}
})

export class AttioObjects extends Context.Service<
	AttioObjects,
	Effect.Success<typeof makeAttioObjects>
>()("effect-attio/services/AttioObjects") {
	static readonly layer = Layer.effect(
		AttioObjects,
		Effect.map(makeAttioObjects, AttioObjects.of),
	)
}
