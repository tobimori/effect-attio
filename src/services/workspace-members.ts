import * as HttpClientRequest from "@effect/platform/HttpClientRequest"
import * as HttpClientResponse from "@effect/platform/HttpClientResponse"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import { AttioHttpClient } from "../http-client.js"
import { DataStruct, WorkspaceId, WorkspaceMemberId } from "../shared/schemas.js"

export const WorkspaceMemberIdStruct = Schema.Struct({
	...WorkspaceId.fields,
	...WorkspaceMemberId.fields,
})

export const AccessLevel = Schema.Literal("admin", "member", "suspended")

export const WorkspaceMember = Schema.Struct({
	id: WorkspaceMemberIdStruct,
	first_name: Schema.String,
	last_name: Schema.String,
	avatar_url: Schema.NullOr(Schema.String),
	email_address: Schema.String,
	created_at: Schema.DateTimeUtc,
	access_level: AccessLevel,
})

export class AttioWorkspaceMembers extends Effect.Service<AttioWorkspaceMembers>()(
	"AttioWorkspaceMembers",
	{
		effect: Effect.gen(function* () {
			const http = yield* AttioHttpClient

			return {
				/**
				 * Lists all workspace members in the workspace.
				 *
				 * Required scopes: `user_management:read`
				 */
				list: Effect.fn("workspaceMembers.list")(function* () {
					return yield* HttpClientRequest.get("/v2/workspace_members").pipe(
						http.execute,
						Effect.flatMap(
							HttpClientResponse.schemaBodyJson(
								DataStruct(Schema.Array(WorkspaceMember)),
							),
						),
						Effect.map((result) => result.data),
					)
				}),

				/**
				 * Gets a single workspace member by ID.
				 *
				 * Required scopes: `user_management:read`
				 */
				get: Effect.fn("workspaceMembers.get")(function* (
					workspaceMemberId: string,
				) {
					return yield* http
						.get(`/v2/workspace_members/${workspaceMemberId}`)
						.pipe(
							Effect.flatMap(
								HttpClientResponse.schemaBodyJson(
									DataStruct(WorkspaceMember),
								),
							),
							Effect.map((result) => result.data),
						)
				}),
			}
		}),
	},
) {}