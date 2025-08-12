import { Config, Context, Effect, Layer, Schema } from "effect"
import type { AttioErrors } from "./errors.js"
import { AttioHttpClient, type AttioHttpClientOptions } from "./http-client.js"

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
					) => Effect.Effect<
						{ id: string } & Schema.Schema.Type<S[K]>,
						AttioErrors
					>
					get: (
						id: string,
					) => Effect.Effect<Schema.Schema.Type<S[K]>, AttioErrors>
					update: (
						id: string,
						data: Partial<Schema.Schema.Type<S[K]>>,
					) => Effect.Effect<Schema.Schema.Type<S[K]>, AttioErrors>
					delete: (id: string) => Effect.Effect<void, AttioErrors>
					list: (
						params?: ListParams,
					) => Effect.Effect<
						{ data: Array<Schema.Schema.Type<S[K]>> },
						AttioErrors
					>
				}
			}
		>()(tag)((tag) => ({
			get Default() {
				return (opts: AttioHttpClientOptions) =>
					Layer.effect(
						tag,
						Effect.gen(function* () {
							const http = yield* AttioHttpClient

							return new Proxy({} as any, {
								get(_, resource: string) {
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
														domain: "mock.com"
													} as any)
												)
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
											id: string,
										) {
											// TODO: implement actual HTTP request
											return yield* Effect.void
										}),

										list: Effect.fn(`${resource}.list`)(function* (
											params?: ListParams,
										) {
											// TODO: implement actual HTTP request
											return yield* Effect.void
										}),
									}
								},
							})
						}),
					).pipe(Layer.provide(AttioHttpClient.Default(opts)))
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
