import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import * as HttpClientRequest from "effect/http/HttpClientRequest"
import * as HttpClientResponse from "effect/http/HttpClientResponse"
import {
	AttioValidationErrorTransform,
	mapAttioErrors,
} from "../error-transforms.js"
import { AttioHttpClient } from "../http-client.js"
import { DataStruct } from "../shared/schemas.js"

export const UnsubscribedEmail = Schema.Struct({
	email_address: Schema.String,
	created_at: Schema.DateTimeUtcFromString,
})

const UnsubscribedEmailsInput = Schema.Struct({
	email_addresses: Schema.NonEmptyArray(Schema.String).check(
		Schema.isMaxLength(1000),
	),
})

const makeAttioSequences = Effect.gen(function* () {
	const http = yield* AttioHttpClient

	return {
		/**
		 * Adds email addresses to the sequence unsubscribe list of the
		 * workspace. You cannot enroll these email addresses in a sequence, and
		 * their active sequence runs exit. Email addresses that are already on
		 * the list are ignored, so it is safe to retry. You can add at most 1000
		 * email addresses in one request. This endpoint is in beta.
		 *
		 * Required scopes: `sequence_unsubscribe:read-write`
		 */
		addUnsubscribedEmails: Effect.fn("AttioSequences.addUnsubscribedEmails")(
			function* (
				emailAddresses: (typeof UnsubscribedEmailsInput)["Type"]["email_addresses"],
			) {
				const data = yield* Schema.encodeEffect(UnsubscribedEmailsInput)({
					email_addresses: emailAddresses,
				})
				return yield* HttpClientRequest.post(
					"/v2/sequences/unsubscribed_emails",
				).pipe(
					HttpClientRequest.bodyJson({ data }),
					Effect.flatMap(http.execute),
					Effect.flatMap(
						HttpClientResponse.schemaBodyJson(
							DataStruct(Schema.Array(UnsubscribedEmail)),
						),
					),
					Effect.map((response) => response.data),
					mapAttioErrors(AttioValidationErrorTransform),
				)
			},
		),
	}
})

export class AttioSequences extends Context.Service<
	AttioSequences,
	Effect.Success<typeof makeAttioSequences>
>()("effect-attio/services/AttioSequences") {
	static readonly layer = Layer.effect(
		AttioSequences,
		Effect.map(makeAttioSequences, AttioSequences.of),
	)
}
