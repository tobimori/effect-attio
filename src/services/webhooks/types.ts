import type * as Schema from "effect/Schema"
import type * as Schemas from "./schemas.js"

// exported types for public consumption
export type Webhook = Schema.Schema.Type<typeof Schemas.Webhook>
export type WebhookWithSecret = Schema.Schema.Type<
	typeof Schemas.WebhookWithSecret
>
export type WebhookInput = Schema.Schema.Encoded<typeof Schemas.WebhookInput>
export type WebhookUpdate = Schema.Schema.Encoded<typeof Schemas.WebhookUpdate>
export type WebhookListParams = Schema.Schema.Type<
	typeof Schemas.WebhookListParams
>
export type WebhookId = Schema.Schema.Type<typeof Schemas.WebhookId>
export type WebhookSubscription = Schema.Schema.Type<
	typeof Schemas.WebhookSubscription
>
export type WebhookStatus = Schema.Schema.Type<typeof Schemas.WebhookStatus>
