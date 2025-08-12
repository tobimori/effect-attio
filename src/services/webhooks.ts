import * as HttpClientRequest from "@effect/platform/HttpClientRequest"
import * as HttpClientResponse from "@effect/platform/HttpClientResponse"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import { AttioHttpClient } from "../http-client.js"
import { DataStruct, WorkspaceId } from "../shared/schemas.js"

export const WebhookId = Schema.Struct({
	...WorkspaceId.fields,
	webhook_id: Schema.UUID,
})

export const WebhookSubscription = Schema.Struct({
	event_type: Schema.String,
	filter: Schema.NullOr(Schema.Unknown),
})

export const WebhookStatus = Schema.Literal("active", "degraded", "inactive")

export const Webhook = Schema.Struct({
	id: WebhookId,
	target_url: Schema.String,
	subscriptions: Schema.Array(WebhookSubscription),
	status: WebhookStatus,
	created_at: Schema.DateTimeUtc,
})

export const WebhookWithSecret = Schema.Struct({
	...Webhook.fields,
	secret: Schema.String,
})

export const WebhookSubscriptionInput = Schema.Struct({
	event_type: Schema.String,
	filter: Schema.optionalWith(Schema.Unknown, { default: () => null }),
})

export const WebhookInput = Schema.Struct({
	target_url: Schema.String,
	subscriptions: Schema.Array(WebhookSubscriptionInput),
})

export const WebhookUpdate = Schema.Struct({
	target_url: Schema.optional(Schema.String),
	subscriptions: Schema.optional(Schema.Array(WebhookSubscriptionInput)),
})

export const WebhookListParams = Schema.Struct({
	limit: Schema.optional(Schema.Number),
	offset: Schema.optional(Schema.Number),
})

export class AttioWebhooks extends Effect.Service<AttioWebhooks>()(
	"AttioWebhooks",
	{
		effect: Effect.gen(function* () {
			const http = yield* AttioHttpClient

			return {
				/**
				 * Get all of the webhooks in your workspace.
				 *
				 * Required scopes: `webhook:read`
				 */
				list: Effect.fn("webhooks.list")(function* (
					params?: Schema.Schema.Type<typeof WebhookListParams>,
				) {
					return yield* HttpClientRequest.get("/v2/webhooks").pipe(
						HttpClientRequest.appendUrlParams(params),
						http.execute,
						Effect.flatMap(
							HttpClientResponse.schemaBodyJson(
								DataStruct(Schema.Array(Webhook)),
							),
						),
						Effect.map((result) => result.data),
					)
				}),

				/**
				 * Create a webhook and associated subscriptions.
				 *
				 * Required scopes: `webhook:read-write`
				 */
				create: Effect.fn("webhooks.create")(function* (
					webhook: Schema.Schema.Encoded<typeof WebhookInput>,
				) {
					const body = yield* Schema.encodeUnknown(DataStruct(WebhookInput))({
						data: webhook,
					})
					return yield* HttpClientRequest.post("/v2/webhooks").pipe(
						HttpClientRequest.bodyJson(body),
						Effect.flatMap(http.execute),
						Effect.flatMap(
							HttpClientResponse.schemaBodyJson(DataStruct(WebhookWithSecret)),
						),
						Effect.map((result) => result.data),
					)
				}),

				/**
				 * Get a single webhook.
				 *
				 * Required scopes: `webhook:read`
				 */
				get: Effect.fn("webhooks.get")(function* (webhookId: string) {
					return yield* http.get(`/v2/webhooks/${webhookId}`).pipe(
						Effect.flatMap(
							HttpClientResponse.schemaBodyJson(DataStruct(Webhook)),
						),
						Effect.map((result) => result.data),
					)
				}),

				/**
				 * Update a webhook and associated subscriptions.
				 *
				 * Required scopes: `webhook:read-write`
				 */
				update: Effect.fn("webhooks.update")(function* (
					webhookId: string,
					webhook: Schema.Schema.Encoded<typeof WebhookUpdate>,
				) {
					const body = yield* Schema.encodeUnknown(DataStruct(WebhookUpdate))({
						data: webhook,
					})
					return yield* HttpClientRequest.patch(
						`/v2/webhooks/${webhookId}`,
					).pipe(
						HttpClientRequest.bodyJson(body),
						Effect.flatMap(http.execute),
						Effect.flatMap(
							HttpClientResponse.schemaBodyJson(DataStruct(Webhook)),
						),
						Effect.map((result) => result.data),
					)
				}),

				/**
				 * Delete a webhook by ID.
				 *
				 * Required scopes: `webhook:read-write`
				 */
				delete: Effect.fn("webhooks.delete")(function* (webhookId: string) {
					yield* http.del(`/v2/webhooks/${webhookId}`)
				}),
			}
		}),
	},
) {}
