import { Config, Context, Effect, Layer, Schema } from "effect"
import {
	type MergedObjectFields,
	type ObjectConfig,
	type ObjectsConfig,
	processObjectsConfig,
} from "./config.js"
import { AttioHttpClient, type AttioHttpClientOptions } from "./http-client.js"
import type { createSchemas } from "./schemas/helpers.js"
import { AttioComments } from "./services/comments.js"
import { AttioMeta } from "./services/meta.js"
import { AttioNotes } from "./services/notes.js"
import { AttioObjects } from "./services/objects.js"
import { AttioRecords } from "./services/records.js"
import { AttioTasks } from "./services/tasks.js"
import { AttioThreads } from "./services/threads.js"
import { AttioWebhooks } from "./services/webhooks.js"
import { AttioWorkspaceMembers } from "./services/workspace-members.js"

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
	<L extends string, T extends Record<string, ObjectConfig> = {}>(
		tag: L,
		config: ObjectsConfig<T> = {},
	) =>
		genericTag<
			Self,
			{
				[K in keyof MergedObjectFields<T>]: {
					create: (
						data: Schema.Schema.Type<
							ReturnType<
								typeof createSchemas<MergedObjectFields<T>[K]>
							>["input"]
						>,
					) => Effect.Effect<
						Schema.Schema.Type<
							ReturnType<
								typeof createSchemas<MergedObjectFields<T>[K]>
							>["output"]
						>,
						never
					>
					get: (
						id: string,
					) => Effect.Effect<
						Schema.Schema.Type<
							ReturnType<
								typeof createSchemas<MergedObjectFields<T>[K]>
							>["output"]
						>,
						never
					>
					update: (
						id: string,
						data: Partial<
							Schema.Schema.Type<
								ReturnType<
									typeof createSchemas<MergedObjectFields<T>[K]>
								>["input"]
							>
						>,
					) => Effect.Effect<
						Schema.Schema.Type<
							ReturnType<
								typeof createSchemas<MergedObjectFields<T>[K]>
							>["output"]
						>,
						never
					>
					delete: (id: string) => Effect.Effect<void, never>
					list: (params?: ListParams) => Effect.Effect<
						{
							data: Array<
								Schema.Schema.Type<
									ReturnType<
										typeof createSchemas<MergedObjectFields<T>[K]>
									>["output"]
								>
							>
						},
						never
					>
				}
			} & {
				comments: AttioComments
				threads: AttioThreads
				tasks: AttioTasks
				notes: AttioNotes
				objects: AttioObjects
				meta: AttioMeta
				webhooks: AttioWebhooks
				workspaceMembers: AttioWorkspaceMembers
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
							const objects = yield* AttioObjects
							const records = yield* AttioRecords
							const meta = yield* AttioMeta
							const webhooks = yield* AttioWebhooks
							const workspaceMembers = yield* AttioWorkspaceMembers

							const schemas = processObjectsConfig(config)

							return new Proxy(
								{
									comments,
									threads,
									tasks,
									notes,
									objects,
									meta,
									webhooks,
									workspaceMembers,
								} as any,
								{
									get(target, resource: string) {
										// Check if it's a specialized service
										if (resource in target) {
											return target[resource]
										}

										// Check if it's a configured object
										if (!(resource in schemas)) {
											throw new Error(`Unknown resource: ${resource}`)
										}

										const schema = schemas[resource as keyof typeof schemas]

										return {
											create: (data: any) =>
												records.create(resource, schema, data),

											get: (id: string) => records.get(resource, schema, id),

											update: Effect.fn(`${resource}.update`)(function* (
												id: string,
												data,
											) {
												const validated = yield* Schema.decode(schema.input)(
													data,
												)
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
												return yield* Effect.succeed({ data: [] })
											}),
										}
									},
								},
							)
						}),
					).pipe(
						Layer.provide(
							Layer.mergeAll(
								AttioComments.Default,
								AttioThreads.Default,
								AttioTasks.Default,
								AttioNotes.Default,
								AttioObjects.Default,
								AttioRecords.Default,
								AttioMeta.Default,
								AttioWebhooks.Default,
								AttioWorkspaceMembers.Default,
							),
						),
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
