import * as Config from "effect/Config"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
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

// TODO: cleanup
export interface ListParams {
	limit?: number
	offset?: number
	sort_by?: string
}

// Record structure returned by Attio API
// TODO: clean up (duplicated as runtime schema in records service)
export interface AttioRecord<T> {
	id: {
		workspace_id: string
		object_id: string
		record_id: string
	}
	created_at: string
	web_url: string
	values: T
}

export const AttioClient =
	<Self>() =>
	<
		L extends string,
		T extends Record<string, ObjectConfig> = { [k: string]: ObjectConfig },
	>(
		tag: L,
		config: ObjectsConfig<T> = {},
	) =>
		genericTag<
			Self,
			{
				[K in keyof MergedObjectFields<T>]: {
					list: (
						params?: ListParams,
					) => Effect.Effect<
						Array<
							AttioRecord<
								Schema.Schema.Type<
									ReturnType<
										typeof createSchemas<MergedObjectFields<T>[K]>
									>["output"]
								>
							>
						>,
						never
					>
					assert: (
						matchingAttribute: string,
						data: Schema.Schema.Type<
							ReturnType<
								typeof createSchemas<MergedObjectFields<T>[K]>
							>["input"]
						>,
					) => Effect.Effect<
						AttioRecord<
							Schema.Schema.Type<
								ReturnType<
									typeof createSchemas<MergedObjectFields<T>[K]>
								>["output"]
							>
						>,
						never
					>
					create: (
						data: Schema.Schema.Type<
							ReturnType<
								typeof createSchemas<MergedObjectFields<T>[K]>
							>["input"]
						>,
					) => Effect.Effect<
						AttioRecord<
							Schema.Schema.Type<
								ReturnType<
									typeof createSchemas<MergedObjectFields<T>[K]>
								>["output"]
							>
						>,
						never
					>
					get: (
						id: string,
					) => Effect.Effect<
						AttioRecord<
							Schema.Schema.Type<
								ReturnType<
									typeof createSchemas<MergedObjectFields<T>[K]>
								>["output"]
							>
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
						AttioRecord<
							Schema.Schema.Type<
								ReturnType<
									typeof createSchemas<MergedObjectFields<T>[K]>
								>["output"]
							>
						>,
						never
					>
					patch: (
						id: string,
						data: Partial<
							Schema.Schema.Type<
								ReturnType<
									typeof createSchemas<MergedObjectFields<T>[K]>
								>["input"]
							>
						>,
					) => Effect.Effect<
						AttioRecord<
							Schema.Schema.Type<
								ReturnType<
									typeof createSchemas<MergedObjectFields<T>[K]>
								>["output"]
							>
						>,
						never
					>
					delete: (id: string) => Effect.Effect<void, never>
					listAttributeValues: (
						id: string,
						attribute: string,
						params?: {
							show_historic?: boolean
							limit?: number
							offset?: number
						},
					) => Effect.Effect<Array<unknown>, never>
					listEntries: (
						id: string,
						params?: {
							limit?: number
							offset?: number
						},
					) => Effect.Effect<
						Array<{
							list_id: string
							list_api_slug: string
							entry_id: string
							created_at: string
						}>,
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
										const input = schema.input ?? Schema.Any
										const output = schema.output ?? Schema.Any

										return {
											list: (params?: ListParams) =>
												records.list(resource, { input, output }, params),

											assert: (matchingAttribute: string, data: any) =>
												records.assert(
													resource,
													{ input, output },
													matchingAttribute,
													data,
												),

											create: (data: any) =>
												records.create(resource, { input, output }, data),

											get: (id: string) =>
												records.get(resource, { input, output }, id),

											update: (id: string, data: any) =>
												records.update(resource, { input, output }, id, data),

											patch: (id: string, data: any) =>
												records.patch(resource, { input, output }, id, data),

											delete: (id: string) => records.delete(resource, id),

											listAttributeValues: (
												id: string,
												attribute: string,
												params?: {
													show_historic?: boolean
													limit?: number
													offset?: number
												},
											) =>
												records.listAttributeValues(
													resource,
													id,
													attribute,
													params,
												),

											listEntries: (
												id: string,
												params?: {
													limit?: number
													offset?: number
												},
											) => records.listEntries(resource, id, params),
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
