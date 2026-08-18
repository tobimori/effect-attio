import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import * as HttpClientRequest from "effect/unstable/http/HttpClientRequest"
import * as HttpClientResponse from "effect/unstable/http/HttpClientResponse"
import { AttioHttpClient } from "../http-client.js"
import { CursorPage, CursorParams } from "../shared/pagination.js"
import { LinkedRecordReference, Uuid } from "../shared/schemas.js"
import type { ReplaceRequiredField } from "../shared/type-utils.js"

export const Email = Schema.Struct({
	id: Schema.Struct({
		workspace_id: Uuid,
		mailbox_id: Uuid,
		email_id: Uuid,
	}),
	sent_at: Schema.DateTimeUtcFromString,
	direction: Schema.Literals(["inbound", "outbound"]),
	subject_line: Schema.NullOr(Schema.String),
	participants: Schema.Array(
		Schema.Struct({
			role: Schema.Literals(["from", "reply-to", "to", "cc", "bcc"]),
			email_address: Schema.String,
			email_domain: Schema.String,
			name: Schema.NullOr(Schema.String),
		}),
	),
	linked_records: Schema.Array(LinkedRecordReference),
})

const EmailCursorParams = CursorParams(50)
const EmailListFields = {
	...EmailCursorParams.fields,
	participants: Schema.optional(Schema.String),
	domain: Schema.optional(Schema.String),
	sent_after: Schema.optional(Schema.NullOr(Schema.DateTimeUtcFromString)),
	sent_before: Schema.optional(Schema.NullOr(Schema.DateTimeUtcFromString)),
}
export const EmailListParams = Schema.Union([
	Schema.Struct({
		...EmailListFields,
		linked_object: Schema.String,
		linked_record_ids: Schema.String,
	}),
	Schema.Struct({
		...EmailListFields,
		linked_object: Schema.optional(Schema.Never),
		linked_record_ids: Schema.optional(Schema.Never),
	}),
])

const makeAttioEmails = Effect.gen(function* () {
	const http = yield* AttioHttpClient

	return {
		/** Lists email metadata. Email content is never exposed. */
		list: Effect.fn("AttioEmails.list")(function* (
			params?: (typeof EmailListParams)["Type"],
		) {
			const query = yield* Schema.encodeEffect(EmailListParams)(params ?? {})
			return yield* HttpClientRequest.get("/v2/emails").pipe(
				HttpClientRequest.appendUrlParams(query),
				http.execute,
				Effect.flatMap(HttpClientResponse.schemaBodyJson(CursorPage(Email))),
			)
		}),
	}
})

export class AttioEmails extends Context.Service<
	AttioEmails,
	Effect.Success<typeof makeAttioEmails>
>()("effect-attio/services/AttioEmails") {
	static readonly layer = Layer.effect(
		AttioEmails,
		Effect.map(makeAttioEmails, AttioEmails.of),
	)
}

export type GenericAttioEmails<TObjectName extends string> = Omit<
	AttioEmails["Service"],
	"list"
> & {
	list: (
		params?: ReplaceRequiredField<
			NonNullable<Parameters<AttioEmails["Service"]["list"]>[0]>,
			"linked_object",
			TObjectName
		>,
	) => ReturnType<AttioEmails["Service"]["list"]>
}
