import * as Schema from "effect/Schema"

// webhook id schema
export const WebhookId = Schema.Struct({
	workspace_id: Schema.UUID,
	webhook_id: Schema.UUID,
})

// webhook subscription schema
export const WebhookSubscription = Schema.Struct({
	event_type: Schema.String,
	filter: Schema.NullOr(Schema.Unknown),
})

// webhook status
export const WebhookStatus = Schema.Literal("active", "degraded", "inactive")

// webhook schema
export const Webhook = Schema.Struct({
	id: WebhookId,
	target_url: Schema.String,
	subscriptions: Schema.Array(WebhookSubscription),
	status: WebhookStatus,
	created_at: Schema.DateTimeUtc,
})

// webhook with secret (only returned on creation)
export const WebhookWithSecret = Schema.Struct({
	id: WebhookId,
	target_url: Schema.String,
	subscriptions: Schema.Array(WebhookSubscription),
	status: WebhookStatus,
	created_at: Schema.DateTimeUtc,
	secret: Schema.String,
})

// response schemas
export const WebhookResponse = Schema.Struct({
	data: Webhook,
})

export const WebhookWithSecretResponse = Schema.Struct({
	data: WebhookWithSecret,
})

export const WebhookListResponse = Schema.Struct({
	data: Schema.Array(Webhook),
})

// input subscription - user facing with optional filter
export const WebhookSubscriptionInput = Schema.Struct({
	event_type: Schema.String,
	filter: Schema.optionalWith(Schema.Unknown, { default: () => null }),
})

// input schemas for creating/updating webhooks
export const WebhookInput = Schema.Struct({
	target_url: Schema.String,
	subscriptions: Schema.Array(WebhookSubscriptionInput),
})

export const WebhookInputRequest = Schema.Struct({
	data: WebhookInput,
})

export const WebhookUpdate = Schema.Struct({
	target_url: Schema.optional(Schema.String),
	subscriptions: Schema.optional(Schema.Array(WebhookSubscriptionInput)),
})

export const WebhookUpdateRequest = Schema.Struct({
	data: WebhookUpdate,
})

// list params
export const WebhookListParams = Schema.Struct({
	limit: Schema.optional(Schema.Number),
	offset: Schema.optional(Schema.Number),
})
