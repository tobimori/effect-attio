import * as HttpClientRequest from "@effect/platform/HttpClientRequest"
import * as HttpClientResponse from "@effect/platform/HttpClientResponse"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import {
	AttioConflictErrorTransform,
	AttioNotFoundErrorTransform,
	AttioValidationErrorTransform,
	mapAttioErrors,
} from "../error-transforms.js"
import { AttioHttpClient } from "../http-client.js"
import { Actor, DataStruct } from "../shared/schemas.js"

export const ListId = Schema.Struct({
	workspace_id: Schema.String,
	list_id: Schema.String,
})

export const WorkspaceMemberAccess = Schema.Struct({
	workspace_member_id: Schema.UUID,
	level: Schema.Literal("full-access", "read-and-write", "read-only"),
})

export const List = Schema.Struct({
	id: ListId,
	api_slug: Schema.String,
	name: Schema.String,
	parent_object: Schema.Array(Schema.String),
	workspace_access: Schema.NullOr(
		Schema.Literal("full-access", "read-and-write", "read-only"),
	),
	workspace_member_access: Schema.Array(WorkspaceMemberAccess),
	created_by_actor: Actor,
	created_at: Schema.DateTimeUtc,
})

export const ListInput = Schema.Struct({
	name: Schema.String,
	api_slug: Schema.String,
	parent_object: Schema.String,
	workspace_access: Schema.NullOr(
		Schema.Literal("full-access", "read-and-write", "read-only"),
	),
	workspace_member_access: Schema.Array(WorkspaceMemberAccess),
})

export const ListUpdate = Schema.Struct({
	name: Schema.optional(Schema.String),
	api_slug: Schema.optional(Schema.String),
	workspace_access: Schema.optional(
		Schema.NullOr(Schema.Literal("full-access", "read-and-write", "read-only")),
	),
	workspace_member_access: Schema.optional(Schema.Array(WorkspaceMemberAccess)),
})

export class AttioLists extends Effect.Service<AttioLists>()("AttioLists", {
	effect: Effect.gen(function* () {
		const http = yield* AttioHttpClient

		return {
			/**
			 * # List all lists
			 *
			 * List all lists that your access token has access to. lists are returned in the order that they are sorted in the sidebar.
			 *
			 * Required scopes: `list_configuration:read`
			 */
			list: Effect.fn("lists.list")(function* () {
				return yield* http.get("/v2/lists").pipe(
					Effect.flatMap(
						HttpClientResponse.schemaBodyJson(DataStruct(Schema.Array(List))),
					),
					Effect.map((result) => result.data),
				)
			}),

			/**
			 * # Create a list
			 *
			 * Creates a new list.
			 *
			 * Once you have your list, add attributes to it using the Create attribute API, and add records to it using the Add records to list API.
			 *
			 * New lists must specify which records can be added with the `parent_object` parameter which accepts either an object slug or an object ID. Permissions for the list are controlled with the `workspace_access` and `workspace_member_access` parameters.
			 *
			 * Please note that new lists must have either `workspace_access` set to `"full-access"` or one or more element of `workspace_member_access` with a `"full-access"` level. It is also possible to receive a `403` billing error if your workspace is not on a plan that supports either advanced workspace or workspace member-level access for lists.
			 *
			 * Required scopes: `list_configuration:read-write`
			 */
			create: Effect.fn("lists.create")(function* (
				list: Schema.Schema.Encoded<typeof ListInput>,
			) {
				const data = yield* Schema.encodeUnknown(ListInput)(list)

				return yield* HttpClientRequest.post("/v2/lists").pipe(
					HttpClientRequest.bodyJson({ data }),
					Effect.flatMap(http.execute),
					Effect.flatMap(HttpClientResponse.schemaBodyJson(DataStruct(List))),
					Effect.map((result) => result.data),
					mapAttioErrors(
						AttioValidationErrorTransform,
						AttioConflictErrorTransform,
					),
				)
			}),

			/**
			 * # Get a list
			 *
			 * Gets a single list in your workspace that your access token has access to.
			 *
			 * Required scopes: `list_configuration:read`
			 */
			get: Effect.fn("lists.get")(function* (list: string) {
				return yield* http.get(`/v2/lists/${list}`).pipe(
					Effect.flatMap(HttpClientResponse.schemaBodyJson(DataStruct(List))),
					Effect.map((result) => result.data),
					mapAttioErrors(AttioNotFoundErrorTransform),
				)
			}),

			/**
			 * # Update a list
			 *
			 * Updates a single list by ID.
			 *
			 * Lists must have either `workspace_access` set to `"full-access"` or one or more element of `workspace_member_access` with a `"full-access"` level. It is also possible to receive a `403` billing error if your workspace is not on a plan that supports either advanced workspace or workspace member-level access for lists.
			 *
			 * Note that changing the parent object of a list is not possible via the API.
			 *
			 * Required scopes: `list_configuration:read-write`
			 */
			update: Effect.fn("lists.update")(function* (
				list: string,
				update: Schema.Schema.Encoded<typeof ListUpdate>,
			) {
				const data = yield* Schema.encodeUnknown(ListUpdate)(update)

				return yield* HttpClientRequest.patch(`/v2/lists/${list}`).pipe(
					HttpClientRequest.bodyJson({ data }),
					Effect.flatMap(http.execute),
					Effect.flatMap(HttpClientResponse.schemaBodyJson(DataStruct(List))),
					Effect.map((result) => result.data),
					mapAttioErrors(
						AttioNotFoundErrorTransform,
						AttioValidationErrorTransform,
						AttioConflictErrorTransform,
					),
				)
			}),
		}
	}),
}) {}
