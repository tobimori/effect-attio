import * as Schema from "effect/Schema"

// full token info response
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
	workspace_id: Schema.UUID,
	workspace_name: Schema.String,
	workspace_slug: Schema.String,
	workspace_logo_url: Schema.NullOr(Schema.String),
})

// minimal response when token is inactive
export const InactiveToken = Schema.Struct({
	active: Schema.Literal(false),
})

// union of possible responses
export const TokenInfoResponse = Schema.Union(TokenInfo, InactiveToken)