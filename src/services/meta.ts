import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import * as HttpClientResponse from "effect/unstable/http/HttpClientResponse"
import { AttioHttpClient } from "../http-client.js"
import { Uuid, WorkspaceId } from "../shared/schemas.js"

export const TokenInfo = Schema.Struct({
	active: Schema.Boolean,
	scope: Schema.String,
	client_id: Schema.String,
	token_type: Schema.Literal("Bearer"),
	exp: Schema.NullOr(Schema.Number),
	iat: Schema.Number,
	sub: Uuid,
	aud: Schema.String,
	iss: Schema.Literal("attio.com"),
	authorized_by_workspace_member_id: Schema.NullOr(Uuid),
	...WorkspaceId.fields,
	workspace_name: Schema.String,
	workspace_slug: Schema.String,
	workspace_logo_url: Schema.NullOr(Schema.String),
})

export const InactiveToken = Schema.Struct({
	active: Schema.Literal(false),
})

export const TokenInfoResponse = Schema.Union([TokenInfo, InactiveToken])

const makeAttioMeta = Effect.gen(function* () {
	const http = yield* AttioHttpClient

	return {
		/**
		 * Identify the current access token, the workspace it is linked to, and any permissions it has.
		 */
		identify: Effect.fn("AttioMeta.identify")(function* () {
			return yield* http
				.get("/v2/self")
				.pipe(
					Effect.flatMap(HttpClientResponse.schemaBodyJson(TokenInfoResponse)),
				)
		}),
	}
})

export class AttioMeta extends Context.Service<
	AttioMeta,
	Effect.Success<typeof makeAttioMeta>
>()("effect-attio/services/AttioMeta") {
	static readonly layer = Layer.effect(
		AttioMeta,
		Effect.map(makeAttioMeta, AttioMeta.of),
	)
}
