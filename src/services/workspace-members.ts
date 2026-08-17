import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import * as HttpClientRequest from "effect/unstable/http/HttpClientRequest"
import * as HttpClientResponse from "effect/unstable/http/HttpClientResponse"
import {
	AttioNotFoundErrorTransform,
	mapAttioErrors,
} from "../error-transforms.js"
import { AttioHttpClient } from "../http-client.js"
import {
	DataStruct,
	WorkspaceId,
	WorkspaceMemberId,
} from "../shared/schemas.js"

export const WorkspaceMemberIdStruct = Schema.Struct({
	...WorkspaceId.fields,
	...WorkspaceMemberId.fields,
})

export const AccessLevel = Schema.Literals(["admin", "member", "suspended"])

export const WorkspaceMember = Schema.Struct({
	id: WorkspaceMemberIdStruct,
	first_name: Schema.String,
	last_name: Schema.String,
	avatar_url: Schema.NullOr(Schema.String),
	email_address: Schema.String,
	created_at: Schema.DateTimeUtcFromString,
	access_level: AccessLevel,
})

const makeAttioWorkspaceMembers = Effect.gen(function* () {
	const http = yield* AttioHttpClient

	return {
		/**
		 * Lists all workspace members in the workspace.
		 *
		 * Required scopes: `user_management:read`
		 */
		list: Effect.fn("AttioWorkspaceMembers.list")(function* () {
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
		get: Effect.fn("AttioWorkspaceMembers.get")(function* (
			workspaceMemberId: string,
		) {
			return yield* http.get(`/v2/workspace_members/${workspaceMemberId}`).pipe(
				Effect.flatMap(
					HttpClientResponse.schemaBodyJson(DataStruct(WorkspaceMember)),
				),
				Effect.map((result) => result.data),
				mapAttioErrors(AttioNotFoundErrorTransform),
			)
		}),
	}
})

export class AttioWorkspaceMembers extends Context.Service<
	AttioWorkspaceMembers,
	Effect.Success<typeof makeAttioWorkspaceMembers>
>()("effect-attio/services/AttioWorkspaceMembers") {
	static readonly layer = Layer.effect(
		AttioWorkspaceMembers,
		Effect.map(makeAttioWorkspaceMembers, AttioWorkspaceMembers.of),
	)
}
