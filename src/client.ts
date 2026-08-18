import * as Config from "effect/Config"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Arr from "effect/Array"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import * as Stream from "effect/Stream"
import type * as HttpClient from "effect/unstable/http/HttpClient"
import {
	type AttioClientSchemas,
	type ListConfig,
	type ListFields,
	type ListParent,
	type MergedObjectFields,
	type ObjectConfig,
	processSchemas,
	type ValidateAttioClientSchemas,
} from "./config.js"
import { AttioHttpClient, type AttioHttpClientOptions } from "./http-client.js"
import type { CreatedSchemas } from "./schemas/helpers.js"
import type { AttributeDef } from "./schemas/attribute-builder.js"
import { compileQueryBuilderOptions } from "./shared/query-builder.js"
import type { QueryParams } from "./shared/query.js"
import {
	AttioAttributes,
	type GenericAttioAttributes,
} from "./services/attributes.js"
import { AttioComments } from "./services/comments.js"
import { AttioEmails, type GenericAttioEmails } from "./services/emails.js"
import { AttioEntries, type GenericAttioEntries } from "./services/entries.js"
import { AttioFiles, type GenericAttioFiles } from "./services/files.js"
import { AttioLists, type GenericAttioLists } from "./services/lists.js"
import {
	AttioMeetings,
	type GenericAttioMeetings,
} from "./services/meetings.js"
import { AttioMeta } from "./services/meta.js"
import { AttioNotes, type GenericAttioNotes } from "./services/notes.js"
import { AttioObjects } from "./services/objects.js"
import {
	AttioRecords,
	type GenericAttioRecords,
	type GenericAttioRecordSearch,
} from "./services/records.js"
import { AttioSql } from "./services/sql.js"
import { AttioTasks, type GenericAttioTasks } from "./services/tasks.js"
import { AttioThreads, type GenericAttioThreads } from "./services/threads.js"
import { AttioWebhooks } from "./services/webhooks.js"
import { AttioWorkspaceMembers } from "./services/workspace-members.js"

type EmptyRecord = Record<never, never>

const STREAM_PAGE_SIZE = 500

const attributeDefinition = (fields: unknown, attribute: string) =>
	(fields as Readonly<Record<string, AttributeDef>> | undefined)?.[attribute]

type RuntimeQueryBuilderOptions = Parameters<
	typeof compileQueryBuilderOptions
>[0]
type QueryBuilderContext = NonNullable<
	Parameters<typeof compileQueryBuilderOptions>[1]
>

const paginateQuery = <A, E, R>(
	initialOffset: number,
	loadPage: (offset: number) => Effect.Effect<ReadonlyArray<A>, E, R>,
) =>
	Stream.paginate(
		initialOffset,
		Effect.fn("AttioClient.paginateQuery")(function* (offset) {
			const items = yield* loadPage(offset)
			return [
				items,
				items.length < STREAM_PAGE_SIZE
					? Option.none()
					: Option.some(offset + items.length),
			] as const
		}),
	)

const makeConfiguredQueryMethods = <A, E, R>(
	context: QueryBuilderContext,
	list: (params?: QueryParams) => Effect.Effect<ReadonlyArray<A>, E, R>,
) => {
	const compile = (options: RuntimeQueryBuilderOptions = {}) =>
		compileQueryBuilderOptions(options, context)
	const stream = (params: QueryParams = {}) =>
		paginateQuery(params.offset ?? 0, (offset) =>
			list({ ...params, limit: STREAM_PAGE_SIZE, offset }),
		)

	return {
		findMany: (options: RuntimeQueryBuilderOptions = {}) =>
			list(compile(options)),
		findManyStream: (options: RuntimeQueryBuilderOptions = {}) =>
			stream(compile(options)),
		findFirst: (options: RuntimeQueryBuilderOptions = {}) =>
			Effect.map(list({ ...compile(options), limit: 1 }), Arr.head),
		list,
		listStream: stream,
	}
}

type ConfiguredObjects<T extends AttioClientSchemas> =
	T["objects"] extends Record<string, ObjectConfig> ? T["objects"] : EmptyRecord

type ConfiguredLists<T extends AttioClientSchemas> =
	T["lists"] extends Record<string, ListConfig> ? T["lists"] : EmptyRecord

type ConfiguredObjectName<T extends AttioClientSchemas> = Extract<
	keyof MergedObjectFields<ConfiguredObjects<T>>,
	string
>

type ConfiguredObjectFields<T extends AttioClientSchemas> = {
	[K in keyof MergedObjectFields<ConfiguredObjects<T>>]: CreatedSchemas<
		MergedObjectFields<ConfiguredObjects<T>>[K],
		"record_id"
	>["fields"]
}

type AttioClientShape<T extends AttioClientSchemas> = {
	[K in keyof MergedObjectFields<ConfiguredObjects<T>>]: GenericAttioRecords<
		CreatedSchemas<
			MergedObjectFields<ConfiguredObjects<T>>[K],
			"record_id"
		>["input"],
		CreatedSchemas<
			MergedObjectFields<ConfiguredObjects<T>>[K],
			"record_id"
		>["output"],
		CreatedSchemas<
			MergedObjectFields<ConfiguredObjects<T>>[K],
			"record_id"
		>["fields"],
		ConfiguredObjectFields<T>,
		Extract<K, string>
	>
} & {
	lists: {
		[K in keyof ConfiguredLists<T>]: GenericAttioEntries<
			CreatedSchemas<ListFields<ConfiguredLists<T>[K]>, "entry_id">["input"],
			CreatedSchemas<ListFields<ConfiguredLists<T>[K]>, "entry_id">["output"],
			CreatedSchemas<ListFields<ConfiguredLists<T>[K]>, "entry_id">["fields"],
			Extract<ListParent<ConfiguredLists<T>[K]>, ConfiguredObjectName<T>>,
			ConfiguredObjectFields<T>,
			Extract<K, string>
		>
	} & GenericAttioLists<ConfiguredObjectName<T>>
	comments: AttioComments["Service"]
	attributes: GenericAttioAttributes<
		ConfiguredObjectName<T>,
		Extract<keyof ConfiguredLists<T>, string>
	>
	emails: GenericAttioEmails<ConfiguredObjectName<T>>
	files: GenericAttioFiles<ConfiguredObjectName<T>>
	meetings: GenericAttioMeetings<ConfiguredObjectName<T>>
	records: GenericAttioRecordSearch<ConfiguredObjectName<T>>
	sql: AttioSql["Service"]
	threads: GenericAttioThreads<ConfiguredObjectName<T>>
	tasks: GenericAttioTasks<ConfiguredObjectName<T>>
	notes: GenericAttioNotes<ConfiguredObjectName<T>>
	objects: AttioObjects["Service"]
	meta: AttioMeta["Service"]
	webhooks: AttioWebhooks["Service"]
	workspaceMembers: AttioWorkspaceMembers["Service"]
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

export const AttioClient =
	<Self>() =>
	<Tag extends string, T extends AttioClientSchemas = AttioClientSchemas>(
		tag: Tag,
		config: T & ValidateAttioClientSchemas<NoInfer<T>> = {} as T &
			ValidateAttioClientSchemas<NoInfer<T>>,
	): AttioClientClass<Self, Tag, T> =>
		genericTag<Self, AttioClientShape<T>>()(tag)((tag) => ({
			layer(opts: AttioHttpClientOptions) {
				return Layer.effect(
					tag,
					Effect.gen(function* () {
						const comments = yield* AttioComments
						const attributes = yield* AttioAttributes
						const emails = yield* AttioEmails
						const files = yield* AttioFiles
						const meetings = yield* AttioMeetings
						const threads = yield* AttioThreads
						const tasks = yield* AttioTasks
						const notes = yield* AttioNotes
						const objects = yield* AttioObjects
						const records = yield* AttioRecords
						const sql = yield* AttioSql
						const entries = yield* AttioEntries
						const lists = yield* AttioLists
						const meta = yield* AttioMeta
						const webhooks = yield* AttioWebhooks
						const workspaceMembers = yield* AttioWorkspaceMembers

						const schemas = processSchemas(config)

						return tag.of(
							new Proxy(
								{
									attributes,
									comments,
									emails,
									files,
									meetings,
									threads,
									tasks,
									notes,
									objects,
									records: { search: records.search },
									sql,
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
											const queryContext = {
												resource: listName,
												parentResource: listSchema?.parent,
												fields: listSchema?.fields,
												objects: schemas.objects,
											}

											return {
												...makeConfiguredQueryMethods(queryContext, (params) =>
													entries.list(listName, { input, output }, params),
												),
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
														attributeDefinition(listSchema?.fields, attribute)
															?.value ?? Schema.Unknown,
													),
												writeAttributeValues: (
													entryId: string,
													attribute: string,
													data: any,
												) => {
													const definition = attributeDefinition(
														listSchema?.fields,
														attribute,
													)
													return entries.writeAttributeValues(
														listName,
														entryId,
														attribute,
														data,
														definition?.value ?? Schema.Unknown,
														definition?.queryValueType,
													)
												},
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
										const queryContext = {
											resource,
											fields: schema?.fields,
											objects: schemas.objects,
										}

										return {
											...makeConfiguredQueryMethods(queryContext, (params) =>
												records.list(resource, { input, output }, params),
											),

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
											merge: (input: any) => records.merge(resource, input),

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
													attributeDefinition(schema?.fields, attribute)
														?.value ?? Schema.Unknown,
												),

											writeAttributeValues: (
												id: string,
												attribute: string,
												data: any,
											) => {
												const definition = attributeDefinition(
													schema?.fields,
													attribute,
												)
												return records.writeAttributeValues(
													resource,
													id,
													attribute,
													data,
													definition?.value ?? Schema.Unknown,
													definition?.queryValueType,
												)
											},

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
							AttioAttributes.layer,
							AttioEmails.layer,
							AttioFiles.layer,
							AttioMeetings.layer,
							AttioThreads.layer,
							AttioTasks.layer,
							AttioNotes.layer,
							AttioObjects.layer,
							AttioRecords.layer,
							AttioSql.layer,
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
