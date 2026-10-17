import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import * as HttpClientRequest from "effect/http/HttpClientRequest"
import * as HttpClientResponse from "effect/http/HttpClientResponse"
import {
	AttioNotFoundErrorTransform,
	mapAttioErrors,
} from "../error-transforms.js"
import { AttioHttpClient } from "../http-client.js"
import { CursorParams } from "../shared/pagination.js"
import { DataStruct, Uuid } from "../shared/schemas.js"
import type { ReplaceField } from "../shared/type-utils.js"
import { Comment } from "./comments.js"
export const ThreadId = Schema.Struct({
	thread_id: Uuid,
})

export const Thread = Schema.Struct({
	id: ThreadId,
	comments: Schema.Array(Comment),
	created_at: Schema.DateTimeUtcFromString,
})

/** A thread in a list response, which includes at most 80 replies. */
export const ListedThread = Schema.Struct({
	...Thread.fields,
	comments: Schema.NonEmptyArray(Comment),
	has_more_comments: Schema.Boolean,
})

export const ThreadGetParams = Schema.Struct({
	...CursorParams(250).fields,
	created_after: Schema.optional(Schema.DateTimeUtcFromString),
})

/** One page of a thread's comments. */
export const ThreadPage = Schema.Struct({
	data: Thread,
	pagination: Schema.Struct({ next_cursor: Schema.NullOr(Schema.String) }),
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
		 * Each thread includes at most 80 replies. When `has_more_comments` is
		 * `true`, use `get` to page through all comments of the thread.
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
					HttpClientResponse.schemaBodyJson(
						DataStruct(Schema.Array(ListedThread)),
					),
				),
				Effect.map((result) => result.data),
			)
		}),

		/**
		 * Get a thread and one page of its comments, oldest first. A page has at
		 * most 250 comments. To get the next page, pass
		 * `pagination.next_cursor` as `cursor` until it is `null`.
		 *
		 * Use `created_after` to get only the comments created after a
		 * timestamp, for example to poll a thread for new replies. The comment
		 * that opened the thread is included only if it matches the filter.
		 *
		 * Required scopes: `comment:read`
		 * For records: `object_configuration:read`, `record_permission:read`
		 * For list entries: `list_configuration:read`, `list_entry:read`
		 */
		get: Effect.fn("AttioThreads.get")(function* (
			threadId: string,
			params?: (typeof ThreadGetParams)["Type"],
		) {
			const query = yield* Schema.encodeEffect(ThreadGetParams)(params ?? {})
			return yield* HttpClientRequest.get(`/v2/threads/${threadId}`).pipe(
				HttpClientRequest.appendUrlParams(query),
				http.execute,
				Effect.flatMap(HttpClientResponse.schemaBodyJson(ThreadPage)),
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
