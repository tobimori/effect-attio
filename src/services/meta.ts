import * as HttpClientRequest from "@effect/platform/HttpClientRequest"
import * as HttpClientResponse from "@effect/platform/HttpClientResponse"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import { AttioHttpClient } from "../http-client.js"
import { WorkspaceId } from "../shared/schemas.js"
export const TokenInfo = Schema.Struct({
	active: Schema.Boolean,
	scope: Schema.String,
	client_id: Schema.String,
	token_type: Schema.Literal("Bearer"),
	exp: Schema.NullOr(Schema.Number),
	iat: Schema.Number,
	sub: Schema.UUID,
	aud: Schema.String,
	iss: Schema.Literal("attio.com"),
	authorized_by_workspace_member_id: Schema.NullOr(Schema.UUID),
	...WorkspaceId.fields,
	workspace_name: Schema.String,
	workspace_slug: Schema.String,
	workspace_logo_url: Schema.NullOr(Schema.String),
})

export const InactiveToken = Schema.Struct({
	active: Schema.Literal(false),
})

export const TokenInfoResponse = Schema.Union(TokenInfo, InactiveToken)

export class AttioMeta extends Effect.Service<AttioMeta>()("AttioMeta", {
	effect: Effect.gen(function* () {
		const http = yield* AttioHttpClient

		return {
			/**
			 * Identify the current access token, the workspace it is linked to, and any permissions it has.
			 */
			identify: Effect.fn("meta.identify")(function* () {
				return yield* HttpClientRequest.get("/v2/self").pipe(
					http.execute,
					Effect.flatMap(
						HttpClientResponse.schemaBodyJson(TokenInfoResponse),
					),
				)
			}),
		}
	}),
}) {}