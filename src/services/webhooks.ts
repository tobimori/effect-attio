import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import * as HttpClientRequest from "effect/unstable/http/HttpClientRequest"
import * as HttpClientResponse from "effect/unstable/http/HttpClientResponse"
import {
	AttioNotFoundErrorTransform,
	AttioValidationErrorTransform,
	mapAttioErrors,
} from "../error-transforms.js"
import { AttioHttpClient } from "../http-client.js"
import { DataStruct, Uuid, WorkspaceId } from "../shared/schemas.js"

export const WebhookId = Schema.Struct({
	...WorkspaceId.fields,
	webhook_id: Uuid,
})

export const WebhookSubscription = Schema.Struct({
	event_type: Schema.String,
	filter: Schema.NullOr(Schema.Unknown),
})

export const WebhookStatus = Schema.Literals(["active", "degraded", "inactive"])

export const Webhook = Schema.Struct({
	id: WebhookId,
	target_url: Schema.String,
	subscriptions: Schema.Array(WebhookSubscription),
	status: WebhookStatus,
	created_at: Schema.DateTimeUtcFromString,
})

export const WebhookWithSecret = Schema.Struct({
	...Webhook.fields,
	secret: Schema.String,
})

export const WebhookSubscriptionInput = Schema.Struct({
	event_type: Schema.String,
	filter: Schema.Unknown.pipe(
		Schema.withDecodingDefaultType(Effect.succeed(null)),
	),
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

const makeAttioWebhooks = Effect.gen(function* () {
	const http = yield* AttioHttpClient

	return {
		/**
		 * Get all of the webhooks in your workspace.
		 *
		 * Required scopes: `webhook:read`
		 */
		list: Effect.fn("AttioWebhooks.list")(function* (
			params?: (typeof WebhookListParams)["Type"],
		) {
			return yield* HttpClientRequest.get("/v2/webhooks").pipe(
				HttpClientRequest.appendUrlParams(params ?? {}),
				http.execute,
				Effect.flatMap(
					HttpClientResponse.schemaBodyJson(DataStruct(Schema.Array(Webhook))),
				),
				Effect.map((result) => result.data),
			)
		}),

		/**
		 * Create a webhook and associated subscriptions.
		 *
		 * Required scopes: `webhook:read-write`
		 */
		create: Effect.fn("AttioWebhooks.create")(function* (
			webhook: (typeof WebhookInput)["Encoded"],
		) {
			const data = yield* Schema.encodeUnknownEffect(WebhookInput)(webhook)
			return yield* HttpClientRequest.post("/v2/webhooks").pipe(
				HttpClientRequest.bodyJson({ data }),
				Effect.flatMap(http.execute),
				Effect.flatMap(
					HttpClientResponse.schemaBodyJson(DataStruct(WebhookWithSecret)),
				),
				Effect.map((result) => result.data),
				mapAttioErrors(AttioValidationErrorTransform),
			)
		}),

		/**
		 * Get a single webhook.
		 *
		 * Required scopes: `webhook:read`
		 */
		get: Effect.fn("AttioWebhooks.get")(function* (webhookId: string) {
			return yield* http.get(`/v2/webhooks/${webhookId}`).pipe(
				Effect.flatMap(HttpClientResponse.schemaBodyJson(DataStruct(Webhook))),
				Effect.map((result) => result.data),
				mapAttioErrors(AttioNotFoundErrorTransform),
			)
		}),

		/**
		 * Update a webhook and associated subscriptions.
		 *
		 * Required scopes: `webhook:read-write`
		 */
		update: Effect.fn("AttioWebhooks.update")(function* (
			webhookId: string,
			webhook: (typeof WebhookUpdate)["Encoded"],
		) {
			const body = yield* Schema.encodeUnknownEffect(DataStruct(WebhookUpdate))(
				{
					data: webhook,
				},
			)
			return yield* HttpClientRequest.patch(`/v2/webhooks/${webhookId}`).pipe(
				HttpClientRequest.bodyJson(body),
				Effect.flatMap(http.execute),
				Effect.flatMap(HttpClientResponse.schemaBodyJson(DataStruct(Webhook))),
				Effect.map((result) => result.data),
				mapAttioErrors(
					AttioNotFoundErrorTransform,
					AttioValidationErrorTransform,
				),
			)
		}),

		/**
		 * Delete a webhook by ID.
		 *
		 * Required scopes: `webhook:read-write`
		 */
		delete: Effect.fn("AttioWebhooks.delete")(function* (webhookId: string) {
			yield* http
				.del(`/v2/webhooks/${webhookId}`)
				.pipe(mapAttioErrors(AttioNotFoundErrorTransform))
		}),
	}
})

export class AttioWebhooks extends Context.Service<
	AttioWebhooks,
	Effect.Success<typeof makeAttioWebhooks>
>()("effect-attio/services/AttioWebhooks") {
	static readonly layer = Layer.effect(
		AttioWebhooks,
		Effect.map(makeAttioWebhooks, AttioWebhooks.of),
	)
}
