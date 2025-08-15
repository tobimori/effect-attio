import type * as HttpClient from "@effect/platform/HttpClient"
import * as Config from "effect/Config"
import type * as ConfigError from "effect/ConfigError"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import {
	type AttioClientSchemas,
	type ListConfig,
	type MergedObjectFields,
	type ObjectConfig,
	processSchemas,
} from "./config.js"
import { AttioHttpClient, type AttioHttpClientOptions } from "./http-client.js"
import type { createSchemas } from "./schemas/helpers.js"
import { AttioComments } from "./services/comments.js"
import { AttioEntries, type GenericAttioEntries } from "./services/entries.js"
import { AttioLists } from "./services/lists.js"
import { AttioMeta } from "./services/meta.js"
import { AttioNotes } from "./services/notes.js"
import { AttioObjects } from "./services/objects.js"
import { AttioRecords, type GenericAttioRecords } from "./services/records.js"
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
	<Tag extends string, T extends AttioClientSchemas = AttioClientSchemas>(
		tag: Tag,
		config: T = {} as T,
	) =>
		genericTag<
			Self,
			{
				[K in keyof MergedObjectFields<
					T["objects"] extends Record<string, ObjectConfig> ? T["objects"] : {}
				>]: GenericAttioRecords<
					ReturnType<
						typeof createSchemas<
							MergedObjectFields<
								T["objects"] extends Record<string, ObjectConfig>
									? T["objects"]
									: {}
							>[K]
						>
					>
				>
			} & {
				lists: {
					[K in keyof (T["lists"] extends Record<string, ListConfig>
						? T["lists"]
						: {})]: GenericAttioEntries<
						ReturnType<
							typeof createSchemas<
								T["lists"] extends Record<string, ListConfig>
									? T["lists"][K]
									: never
							>
						>
					>
				} & AttioLists
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
							const entries = yield* AttioEntries
							const lists = yield* AttioLists
							const meta = yield* AttioMeta
							const webhooks = yield* AttioWebhooks
							const workspaceMembers = yield* AttioWorkspaceMembers

							const schemas = processSchemas(config)

							return new Proxy(
								{
									comments,
									threads,
									tasks,
									notes,
									objects,
									lists: new Proxy(lists as any, {
										get(target, listName: string) {
											// check if it's a lists service method
											if (listName in target) {
												return target[listName]
											}

											// check if we have a schema for this list
											const listSchema =
												schemas.lists[listName as keyof typeof schemas.lists]
											const input = listSchema.input ?? Schema.Any
											const output = listSchema.output ?? Schema.Any

											return {
												list: (params?: any) =>
													entries.list(listName, { input, output }, params),
											}
										},
									}),
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

										const schema =
											schemas.objects[resource as keyof typeof schemas.objects]
										const input = schema.input ?? Schema.Any
										const output = schema.output ?? Schema.Any

										return {
											list: (params?: any) =>
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
								AttioEntries.Default,
								AttioLists.Default,
								AttioMeta.Default,
								AttioWebhooks.Default,
								AttioWorkspaceMembers.Default,
							),
						),
						Layer.provide(Layer.mergeAll(AttioHttpClient.Default(opts))),
					)
			},
			// without this return type, the layer is inferred as Layer.Layer<unknown>
			get layerConfig(): Layer.Layer<
				Self,
				ConfigError.ConfigError,
				HttpClient.HttpClient
			> {
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
