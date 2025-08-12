import * as HttpClientRequest from "@effect/platform/HttpClientRequest"
import * as HttpClientResponse from "@effect/platform/HttpClientResponse"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import { AttioHttpClient } from "../../http-client.js"
import * as Schemas from "./schemas.js"
import type * as Types from "./types.js"

export type {
	Webhook,
	WebhookInput,
	WebhookListParams,
	WebhookStatus,
	WebhookSubscription,
	WebhookUpdate,
	WebhookWithSecret,
} from "./types.js"

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
					params?: Types.WebhookListParams,
				) {
					return yield* HttpClientRequest.get("/v2/webhooks").pipe(
						HttpClientRequest.appendUrlParams(params),
						http.execute,
						Effect.flatMap(
							HttpClientResponse.schemaBodyJson(Schemas.WebhookListResponse),
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
					webhook: Types.WebhookInput,
				) {
					const body = yield* Schema.decode(Schemas.WebhookInputRequest)({
						data: webhook,
					})
					return yield* HttpClientRequest.post("/v2/webhooks").pipe(
						HttpClientRequest.bodyJson(body),
						Effect.flatMap(http.execute),
						Effect.flatMap(
							HttpClientResponse.schemaBodyJson(
								Schemas.WebhookWithSecretResponse,
							),
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
							HttpClientResponse.schemaBodyJson(Schemas.WebhookResponse),
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
					webhook: Types.WebhookUpdate,
				) {
					const body = yield* Schema.decode(Schemas.WebhookUpdateRequest)({
						data: webhook,
					})
					return yield* HttpClientRequest.patch(
						`/v2/webhooks/${webhookId}`,
					).pipe(
						HttpClientRequest.bodyJson(body),
						Effect.flatMap(http.execute),
						Effect.flatMap(
							HttpClientResponse.schemaBodyJson(Schemas.WebhookResponse),
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
