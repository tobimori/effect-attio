import { Config, Context, Effect, Layer, Schema } from "effect"
import { AttioHttpClient, type AttioHttpClientOptions } from "./http-client.js"
import { AttioComments } from "./services/comments.js"
import { AttioMeta } from "./services/meta.js"
import { AttioNotes } from "./services/notes.js"
import { AttioTasks } from "./services/tasks.js"
import { AttioThreads } from "./services/threads.js"
import { AttioWebhooks } from "./services/webhooks.js"

const genericTag =
	<Self, Shape>() =>
	<Id extends string>(id: Id) =>
	<U>(
		members: (tag: Context.Tag<Self, Shape>) => U,
	): Context.TagClass<Self, Id, Shape> & U => {
		const tag = Context.Tag(id)()
		return Object.assign(tag, members(tag as any)) as any
	}

export interface ListParams {
	limit?: number
	offset?: number
	sort_by?: string
}

export const AttioClient =
	<Self>() =>
	<L extends string, S extends Record<string, Schema.Schema<any, any>>>(
		tag: L,
		schemas: S,
	) =>
		genericTag<
			Self,
			{
				[K in keyof S]: {
					create: (
						data: Schema.Schema.Type<S[K]>,
					) => Effect.Effect<{ id: string } & Schema.Schema.Type<S[K]>, never>
					get: (id: string) => Effect.Effect<Schema.Schema.Type<S[K]>, never>
					update: (
						id: string,
						data: Partial<Schema.Schema.Type<S[K]>>,
					) => Effect.Effect<Schema.Schema.Type<S[K]>, never>
					delete: (id: string) => Effect.Effect<void, never>
					list: (
						params?: ListParams,
					) => Effect.Effect<{ data: Array<Schema.Schema.Type<S[K]>> }, never>
				}
			} & {
				comments: AttioComments
				threads: AttioThreads
				tasks: AttioTasks
				notes: AttioNotes
				meta: AttioMeta
				webhooks: AttioWebhooks
			}
		>()(tag)((tag) => ({
			get Default() {
				return (opts: AttioHttpClientOptions) =>
					Layer.effect(
						tag,
						Effect.gen(function* () {
							const comments = yield* AttioComments
							const threads = yield* AttioThreads
							const tasks = yield* AttioTasks
							const notes = yield* AttioNotes
							const meta = yield* AttioMeta
							const webhooks = yield* AttioWebhooks

							return new Proxy({ comments, threads, tasks, notes, meta, webhooks } as any, {
								get(target, resource: string) {
									// Check if it's a specialized service
									if (resource in target) {
										return target[resource]
									}

									const schema = schemas[resource]
									if (!schema) {
										throw new Error(`Unknown resource: ${resource}`)
									}

									return {
										create: Effect.fn(`${resource}.create`)(function* (data) {
											const validated = yield* Schema.decode(schema)(data)
											// TODO: implement actual HTTP request
											// for now, return mock data
											return { id: "123", ...validated }
										}),

										get: Effect.fn(`${resource}.get`)(function* (id: string) {
											// TODO: implement actual HTTP request
											// For now, return empty object that will be validated
											const mockData = { id }
											return yield* Schema.decode(schema)(mockData).pipe(
												Effect.orElse(() =>
													// Return a valid mock based on the resource type
													Effect.succeed({
														id,
														name: "Mock Name",
														email: "mock@example.com",
														domain: "mock.com",
													} as any),
												),
											)
										}),

										update: Effect.fn(`${resource}.update`)(function* (
											id: string,
											data,
										) {
											const validated = yield* Schema.decode(schema)(data)
											// TODO: implement actual HTTP request
											return { id, ...validated }
										}),

										delete: Effect.fn(`${resource}.delete`)(function* (
											_id: string,
										) {
											// TODO: implement actual HTTP request
											return yield* Effect.void
										}),

										list: Effect.fn(`${resource}.list`)(function* (
											_params?: ListParams,
										) {
											// TODO: implement actual HTTP request
											return yield* Effect.void
										}),
									}
								},
							})
						}),
					).pipe(
						Layer.provide(Layer.mergeAll(AttioComments.Default, AttioThreads.Default, AttioTasks.Default, AttioNotes.Default, AttioMeta.Default, AttioWebhooks.Default)),
						Layer.provide(Layer.mergeAll(AttioHttpClient.Default(opts))),
					)
			},
			get layerConfig() {
				return Layer.unwrapEffect(
					Effect.gen(this, function* () {
						const apiKey = yield* Config.redacted("ATTIO_API_KEY")
						const baseUrl = yield* Config.string("ATTIO_BASE_URL").pipe(
							Config.withDefault("https://api.attio.com"),
						)

						return this.Default({ apiKey, baseUrl })
					}),
				)
			},
		}))
