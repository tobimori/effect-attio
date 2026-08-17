import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import * as HttpClientRequest from "effect/unstable/http/HttpClientRequest"
import * as HttpClientResponse from "effect/unstable/http/HttpClientResponse"
import {
	AttioNotFoundErrorTransform,
	mapAttioErrors,
} from "../error-transforms.js"
import { AttioHttpClient } from "../http-client.js"
import { DataStruct, Uuid } from "../shared/schemas.js"
import type { ReplaceField } from "../shared/type-utils.js"
import { Comment } from "./comments.js"
export const ThreadId = Schema.Struct({
	thread_id: Uuid,
})

export const Thread = Schema.Struct({
	id: ThreadId,
	comments: Schema.NonEmptyArray(Comment),
	created_at: Schema.DateTimeUtcFromString,
})

export const ThreadListParams = Schema.Struct({
	record_id: Schema.optional(Uuid),
	object: Schema.optional(Schema.String),
	entry_id: Schema.optional(Uuid),
	list: Schema.optional(Schema.String),
	limit: Schema.optional(Schema.Number),
	offset: Schema.optional(Schema.Number),
})

const makeAttioThreads = Effect.gen(function* () {
	const http = yield* AttioHttpClient

	return {
		/**
		 * List threads of comments on a record or list entry.
		 *
		 * Required scopes: `comment:read`
		 * For records: `object_configuration:read`, `record_permission:read`
		 * For list entries: `list_configuration:read`, `list_entry:read`
		 */
		list: Effect.fn("AttioThreads.list")(function* (
			params?: (typeof ThreadListParams)["Type"],
		) {
			return yield* HttpClientRequest.get("/v2/threads").pipe(
				HttpClientRequest.appendUrlParams(params ?? {}),
				http.execute,
				Effect.flatMap(
					HttpClientResponse.schemaBodyJson(DataStruct(Schema.Array(Thread))),
				),
				Effect.map((result) => result.data),
			)
		}),

		/**
		 * Get all comments in a thread.
		 *
		 * Required scopes: `comment:read`
		 * For records: `object_configuration:read`, `record_permission:read`
		 * For list entries: `list_configuration:read`, `list_entry:read`
		 */
		get: Effect.fn("AttioThreads.get")(function* (threadId: string) {
			return yield* http.get(`/v2/threads/${threadId}`).pipe(
				Effect.flatMap(HttpClientResponse.schemaBodyJson(DataStruct(Thread))),
				Effect.map((result) => result.data),
				mapAttioErrors(AttioNotFoundErrorTransform),
			)
		}),
	}
})

export class AttioThreads extends Context.Service<
	AttioThreads,
	Effect.Success<typeof makeAttioThreads>
>()("effect-attio/services/AttioThreads") {
	static readonly layer = Layer.effect(
		AttioThreads,
		Effect.map(makeAttioThreads, AttioThreads.of),
	)
}

export type GenericAttioThreads<TObjectName extends string> = Omit<
	AttioThreads["Service"],
	"list"
> & {
	list: (
		params?: ReplaceField<
			NonNullable<Parameters<AttioThreads["Service"]["list"]>[0]>,
			"object",
			TObjectName
		>,
	) => ReturnType<AttioThreads["Service"]["list"]>
}
