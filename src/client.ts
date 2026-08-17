import * as Config from "effect/Config"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import type * as HttpClient from "effect/unstable/http/HttpClient"
import {
	type AttioClientSchemas,
	type ListConfig,
	type MergedObjectFields,
	type ObjectConfig,
	processSchemas,
} from "./config.js"
import { AttioHttpClient, type AttioHttpClientOptions } from "./http-client.js"
import type { CreatedSchemas } from "./schemas/helpers.js"
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

type EmptyRecord = Record<never, never>

type ConfiguredObjects<T extends AttioClientSchemas> =
	T["objects"] extends Record<string, ObjectConfig> ? T["objects"] : EmptyRecord

type ConfiguredLists<T extends AttioClientSchemas> =
	T["lists"] extends Record<string, ListConfig> ? T["lists"] : EmptyRecord

type AttioClientShape<T extends AttioClientSchemas> = {
	[K in keyof MergedObjectFields<ConfiguredObjects<T>>]: GenericAttioRecords<
		CreatedSchemas<
			MergedObjectFields<ConfiguredObjects<T>>[K],
			"record_id"
		>["input"],
		CreatedSchemas<
			MergedObjectFields<ConfiguredObjects<T>>[K],
			"record_id"
		>["output"]
	>
} & {
	lists: {
		[K in keyof ConfiguredLists<T>]: GenericAttioEntries<
			CreatedSchemas<ConfiguredLists<T>[K], "entry_id">["input"],
			CreatedSchemas<ConfiguredLists<T>[K], "entry_id">["output"]
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

type AttioClientClass<
	Self,
	Tag extends string,
	T extends AttioClientSchemas,
> = Context.ServiceClass<Self, Tag, AttioClientShape<T>> & {
	readonly layer: (
		opts: AttioHttpClientOptions,
	) => Layer.Layer<Self, never, HttpClient.HttpClient>
	readonly layerConfig: Layer.Layer<
		Self,
		Config.ConfigError,
		HttpClient.HttpClient
	>
}

const genericTag =
	<Self, Shape>() =>
	<Id extends string>(id: Id) =>
	<U>(
		members: (tag: Context.Service<Self, Shape>) => U,
	): Context.ServiceClass<Self, Id, Shape> & U => {
		const tag = Context.Service<Self, Shape>()(id)
		return Object.assign(tag, members(tag as any)) as any
	}

export const AttioClient: <Self>() => <
	Tag extends string,
	T extends AttioClientSchemas = AttioClientSchemas,
>(
	tag: Tag,
	config?: T,
) => AttioClientClass<Self, Tag, T> =
	<Self>() =>
	<Tag extends string, T extends AttioClientSchemas = AttioClientSchemas>(
		tag: Tag,
		config: T = {} as T,
	) =>
		genericTag<Self, AttioClientShape<T>>()(tag)((tag) => ({
			layer(opts: AttioHttpClientOptions) {
				return Layer.effect(
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

						return tag.of(
							new Proxy(
								{
									comments,
									threads,
									tasks,
									notes,
									objects,
									lists: new Proxy(lists as any, {
										get(target, listName: string) {
											// check if it's a lists service method
											if (Object.hasOwn(target, listName)) {
												return target[listName]
											}

											// check if we have a schema for this list
											const listSchema =
												schemas.lists[listName as keyof typeof schemas.lists]
											const input = listSchema?.input ?? Schema.Any
											const output = listSchema?.output ?? Schema.Any

											return {
												list: (params?: any) =>
													entries.list(listName, { input, output }, params),
												assert: (data: any) =>
													entries.assert(listName, { input, output }, data),
												create: (data: any) =>
													entries.create(listName, { input, output }, data),
												get: (entryId: string) =>
													entries.get(listName, { input, output }, entryId),
												update: (entryId: string, data: any) =>
													entries.update(
														listName,
														entryId,
														{ input, output },
														data,
													),
												delete: (entryId: string) =>
													entries.delete(listName, entryId),
												patch: (entryId: string, data: any) =>
													entries.patch(
														listName,
														entryId,
														{ input, output },
														data,
													),
												listAttributeValues: (
													entryId: string,
													attribute: string,
													params?: {
														show_historic?: boolean
														limit?: number
														offset?: number
													},
												) =>
													entries.listAttributeValues(
														listName,
														entryId,
														attribute,
														params,
													),
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
										if (Object.hasOwn(target, resource)) {
											return target[resource]
										}

										const schema =
											schemas.objects[resource as keyof typeof schemas.objects]
										const input = schema?.input ?? Schema.Any
										const output = schema?.output ?? Schema.Any

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
							),
						)
					}),
				).pipe(
					Layer.provide(
						Layer.mergeAll(
							AttioComments.layer,
							AttioThreads.layer,
							AttioTasks.layer,
							AttioNotes.layer,
							AttioObjects.layer,
							AttioRecords.layer,
							AttioEntries.layer,
							AttioLists.layer,
							AttioMeta.layer,
							AttioWebhooks.layer,
							AttioWorkspaceMembers.layer,
						),
					),
					Layer.provide(AttioHttpClient.layer(opts)),
				)
			},
			// without this return type, the layer is inferred as Layer.Layer<unknown>
			get layerConfig(): Layer.Layer<
				Self,
				Config.ConfigError,
				HttpClient.HttpClient
			> {
				const layer = this.layer
				return Layer.unwrap(
					Effect.gen(function* () {
						const apiKey = yield* Config.redacted("ATTIO_API_KEY")
						const baseUrl = yield* Config.string("ATTIO_BASE_URL").pipe(
							Config.withDefault("https://api.attio.com"),
						)

						return layer({ apiKey, baseUrl })
					}),
				)
			},
		}))
