import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import type * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import * as Struct from "effect/Struct"
import * as HttpClientRequest from "effect/unstable/http/HttpClientRequest"
import * as HttpClientResponse from "effect/unstable/http/HttpClientResponse"
import {
	AttioConflictErrorTransform,
	AttioImmutableValueErrorTransform,
	AttioMissingValueErrorTransform,
	AttioMultipleMatchErrorTransform,
	AttioNotFoundErrorTransform,
	AttioUniquenessConflictErrorTransform,
	AttioValidationErrorTransform,
	mapAttioErrors,
} from "../error-transforms.js"
import { AttioHttpClient } from "../http-client.js"
import type { AttributeDef } from "../schemas/attribute-builder.js"
import type {
	NativeQueryParams,
	QueryBuilderOptions,
} from "../shared/query-builder.js"
import { QueryParams } from "../shared/query.js"
import { DataStruct, Uuid } from "../shared/schemas.js"

const RecordId = Schema.Struct({
	workspace_id: Uuid,
	object_id: Uuid,
	record_id: Uuid,
})

type AttributeValueSchema<T extends AttributeDef> = T extends {
	value: infer Value extends Schema.Top
}
	? Value
	: typeof Schema.Unknown

type FirstRecord<TInput extends Schema.Top, TOutput extends Schema.Constraint> =
	ReturnType<
		typeof AttioRecords.Service.list<TInput, TOutput>
	> extends Effect.Effect<
		ReadonlyArray<infer Record>,
		infer Error,
		infer Requirements
	>
		? Effect.Effect<Option.Option<Record>, Error, Requirements>
		: never

const makeAttioRecords = Effect.gen(function* () {
	const http = yield* AttioHttpClient

	return {
		/**
		 * Lists people, company or other records, with the option to filter and sort results.
		 *
		 * Required scopes: `record_permission:read`, `object_configuration:read`
		 *
		 * @see https://docs.attio.com/rest-api/endpoint-reference/records/list-records
		 */
		list: Effect.fn("AttioRecords.list")(function* <
			TInput extends Schema.Top,
			TOutput extends Schema.Constraint,
		>(
			object: string,
			schema: { input: TInput; output: TOutput },
			params?: (typeof QueryParams)["Type"],
		) {
			const body = yield* Schema.encodeEffect(QueryParams)({
				...params,
				limit: params?.limit ?? 500,
				offset: params?.offset ?? 0,
			})

			return yield* HttpClientRequest.post(
				`/v2/objects/${object}/records/query`,
			).pipe(
				HttpClientRequest.bodyJson(body),
				Effect.flatMap(http.execute),
				Effect.flatMap(
					HttpClientResponse.schemaBodyJson(
						DataStruct(
							Schema.Array(
								Schema.Struct({
									id: RecordId,
									created_at: Schema.DateTimeUtcFromString,
									web_url: Schema.String,
									values: schema.output,
								}),
							),
						),
					),
				),
				Effect.map((result) => result.data),
			)
		}),

		/**
		 * Create or update people, companies and other records.
		 * A matching attribute is used to search for existing records.
		 * If a record is found with the same value for the matching attribute, that record will be updated.
		 * If no record is found, a new record will be created instead.
		 *
		 * Required scopes: `record_permission:read-write`, `object_configuration:read`
		 *
		 * @see https://docs.attio.com/rest-api/endpoint-reference/records/create-or-update-a-record
		 */
		assert: Effect.fn("AttioRecords.assert")(function* <
			TInput extends Schema.Top,
			TOutput extends Schema.Constraint,
		>(
			object: string,
			schema: { input: TInput; output: TOutput },
			matchingAttribute: string,
			data: TInput["Type"],
		) {
			return yield* HttpClientRequest.put(`/v2/objects/${object}/records`).pipe(
				HttpClientRequest.setUrlParam("matching_attribute", matchingAttribute),
				HttpClientRequest.bodyJson({
					data: { values: yield* Schema.encodeEffect(schema.input)(data) },
				}),
				Effect.flatMap(http.execute),
				Effect.flatMap(
					HttpClientResponse.schemaBodyJson(
						DataStruct(
							Schema.Struct({
								id: RecordId,
								created_at: Schema.DateTimeUtcFromString,
								web_url: Schema.String,
								values: schema.output,
							}),
						),
					),
				),
				Effect.map((result) => result.data),
				mapAttioErrors(
					AttioValidationErrorTransform,
					AttioMissingValueErrorTransform,
					AttioMultipleMatchErrorTransform,
					AttioUniquenessConflictErrorTransform,
				),
			)
		}),

		/**
		 * # Get a record
		 *
		 * Gets a single person, company or other record by its `record_id`.
		 *
		 * Required scopes: `record_permission:read`, `object_configuration:read`
		 *
		 * @see https://docs.attio.com/rest-api/endpoint-reference/records/get-a-record
		 */
		get: Effect.fn("AttioRecords.get")(function* <
			TInput extends Schema.Top,
			TOutput extends Schema.Constraint,
		>(
			object: string,
			schema: { input: TInput; output: TOutput },
			recordId: string,
		) {
			return yield* http.get(`/v2/objects/${object}/records/${recordId}`).pipe(
				Effect.flatMap(
					HttpClientResponse.schemaBodyJson(
						DataStruct(
							Schema.Struct({
								id: RecordId,
								created_at: Schema.DateTimeUtcFromString,
								web_url: Schema.String,
								values: schema.output,
							}),
						),
					),
				),
				Effect.map((result) => result.data),
				mapAttioErrors(AttioNotFoundErrorTransform),
			)
		}),

		/**
		 * # Create a record
		 *
		 * Creates a new person, company or other record. This endpoint will throw on conflicts of unique attributes.
		 * If you would prefer to update records on conflicts, please use the assert record endpoint instead.
		 *
		 * Required scopes: `record_permission:read-write`, `object_configuration:read`
		 *
		 * @see https://docs.attio.com/rest-api/endpoint-reference/records/create-a-record
		 */
		create: Effect.fn("AttioRecords.create")(function* <
			TInput extends Schema.Top,
			TOutput extends Schema.Constraint,
		>(
			object: string,
			schema: { input: TInput; output: TOutput },
			data: TInput["Type"],
		) {
			return yield* HttpClientRequest.post(
				`/v2/objects/${object}/records`,
			).pipe(
				HttpClientRequest.bodyJson({
					data: { values: yield* Schema.encodeEffect(schema.input)(data) },
				}),
				Effect.flatMap(http.execute),
				Effect.flatMap(
					HttpClientResponse.schemaBodyJson(
						DataStruct(
							Schema.Struct({
								id: RecordId,
								created_at: Schema.DateTimeUtcFromString,
								web_url: Schema.String,
								values: schema.output,
							}),
						),
					),
				),
				Effect.map((result) => result.data),
				mapAttioErrors(
					AttioValidationErrorTransform,
					AttioConflictErrorTransform,
					AttioUniquenessConflictErrorTransform,
				),
			)
		}),

		/**
		 * # Update a record (overwrite multiselect values)
		 *
		 * Use this endpoint to update people, companies, and other records by `record_id`.
		 * If the update payload includes multiselect attributes, the values supplied will overwrite/remove the list of values that already exist (if any).
		 * Use the `patch` endpoint to append multiselect values without removing those that already exist.
		 *
		 * Required scopes: `record_permission:read-write`, `object_configuration:read`
		 *
		 * @see https://docs.attio.com/rest-api/endpoint-reference/records/update-a-record-overwrite-multiselect-values
		 */
		update: Effect.fn("AttioRecords.update")(function* <
			TInput extends Schema.Top,
			TOutput extends Schema.Constraint,
		>(
			object: string,
			schema: { input: TInput; output: TOutput },
			recordId: string,
			data: Partial<TInput["Type"]>,
		) {
			return yield* HttpClientRequest.put(
				`/v2/objects/${object}/records/${recordId}`,
			).pipe(
				HttpClientRequest.bodyJson({
					data: {
						values: yield* Schema.encodeEffect(
							(
								schema.input as unknown as Schema.Struct<Schema.Struct.Fields>
							).mapFields(Struct.map(Schema.optional)),
						)(data),
					},
				}),
				Effect.flatMap(http.execute),
				Effect.flatMap(
					HttpClientResponse.schemaBodyJson(
						DataStruct(
							Schema.Struct({
								id: RecordId,
								created_at: Schema.DateTimeUtcFromString,
								web_url: Schema.String,
								values: schema.output,
							}),
						),
					),
				),
				Effect.map((result) => result.data),
				mapAttioErrors(
					AttioNotFoundErrorTransform,
					AttioValidationErrorTransform,
					AttioImmutableValueErrorTransform,
				),
			)
		}),

		/**
		 * # Update a record (append multiselect values)
		 *
		 * Use this endpoint to update people, companies, and other records by `record_id`.
		 * If the update payload includes multiselect attributes, the values supplied will be created and prepended to the list of values that already exist (if any).
		 * Use the `update` endpoint to overwrite or remove multiselect attribute values.
		 *
		 * Required scopes: `record_permission:read-write`, `object_configuration:read`
		 *
		 * @see https://docs.attio.com/rest-api/endpoint-reference/records/update-a-record-append-multiselect-values
		 */
		patch: Effect.fn("AttioRecords.patch")(function* <
			TInput extends Schema.Top,
			TOutput extends Schema.Constraint,
		>(
			object: string,
			schema: { input: TInput; output: TOutput },
			recordId: string,
			data: Partial<TInput["Type"]>,
		) {
			return yield* HttpClientRequest.patch(
				`/v2/objects/${object}/records/${recordId}`,
			).pipe(
				HttpClientRequest.bodyJson({
					data: {
						values: yield* Schema.encodeEffect(
							(
								schema.input as unknown as Schema.Struct<Schema.Struct.Fields>
							).mapFields(Struct.map(Schema.optional)),
						)(data),
					},
				}),
				Effect.flatMap(http.execute),
				Effect.flatMap(
					HttpClientResponse.schemaBodyJson(
						DataStruct(
							Schema.Struct({
								id: RecordId,
								created_at: Schema.DateTimeUtcFromString,
								web_url: Schema.String,
								values: schema.output,
							}),
						),
					),
				),
				Effect.map((result) => result.data),
				mapAttioErrors(
					AttioNotFoundErrorTransform,
					AttioValidationErrorTransform,
					AttioImmutableValueErrorTransform,
				),
			)
		}),

		/**
		 * # Delete a record
		 *
		 * Deletes a single record (e.g. a company or person) by ID.
		 *
		 * Required scopes: `object_configuration:read`, `record_permission:read-write`
		 *
		 * @see https://docs.attio.com/rest-api/endpoint-reference/records/delete-a-record
		 */
		delete: Effect.fn("AttioRecords.delete")(function* (
			object: string,
			recordId: string,
		) {
			yield* http
				.del(`/v2/objects/${object}/records/${recordId}`)
				.pipe(mapAttioErrors(AttioNotFoundErrorTransform))
		}),

		/**
		 * # List record attribute values
		 *
		 * Gets all values for a given attribute on a record. Historic values can be queried using the show_historic query param.
		 * Historic values cannot be queried on COMINT (Communication Intelligence) or enriched attributes and the endpoint will return a 400 error if this is attempted.
		 * Historic values are sorted from oldest to newest (by active_from).
		 * Some attributes are subject to billing status and will return an empty array of values if the workspace being queried does not have the required billing flag enabled.
		 *
		 * Required scopes: `record_permission:read`, `object_configuration:read`
		 *
		 * @see https://docs.attio.com/rest-api/endpoint-reference/records/list-record-attribute-values
		 */
		listAttributeValues: Effect.fn("AttioRecords.listAttributeValues")(
			function* <TValue extends Schema.Top = typeof Schema.Unknown>(
				object: string,
				recordId: string,
				attribute: string,
				params?: {
					show_historic?: boolean
					limit?: number
					offset?: number
				},
				valueSchema: TValue = Schema.Unknown as unknown as TValue,
			) {
				return yield* HttpClientRequest.get(
					`/v2/objects/${object}/records/${recordId}/attributes/${attribute}/values`,
				).pipe(
					HttpClientRequest.setUrlParams({
						show_historic: params?.show_historic?.toString(),
						limit: params?.limit?.toString(),
						offset: params?.offset?.toString(),
					}),
					http.execute,
					Effect.flatMap(
						HttpClientResponse.schemaBodyJson(
							DataStruct(Schema.Array(valueSchema)),
						),
					),
					Effect.map((result) => result.data),
				)
			},
		),

		/**
		 * # List record entries
		 *
		 * List all entries, across all lists, for which this record is the parent.
		 *
		 * Required scopes: `record_permission:read`, `object_configuration:read`, `list_entry:read`
		 *
		 * @see https://docs.attio.com/rest-api/endpoint-reference/records/list-record-entries
		 */
		listEntries: Effect.fn("AttioRecords.listEntries")(function* (
			object: string,
			recordId: string,
			params?: {
				limit?: number
				offset?: number
			},
		) {
			return yield* HttpClientRequest.get(
				`/v2/objects/${object}/records/${recordId}/entries`,
			).pipe(
				HttpClientRequest.setUrlParams({
					limit: params?.limit?.toString(),
					offset: params?.offset?.toString(),
				}),
				http.execute,
				Effect.flatMap(
					HttpClientResponse.schemaBodyJson(
						DataStruct(
							Schema.Array(
								Schema.Struct({
									list_id: Uuid,
									list_api_slug: Schema.String,
									entry_id: Uuid,
									created_at: Schema.String,
								}),
							),
						),
					),
				),
				Effect.map((result) => result.data),
			)
		}),
	}
})

export class AttioRecords extends Context.Service<
	AttioRecords,
	Effect.Success<typeof makeAttioRecords>
>()("effect-attio/services/AttioRecords") {
	static readonly layer = Layer.effect(
		AttioRecords,
		Effect.map(makeAttioRecords, AttioRecords.of),
	)
}

// extract method signatures from service with inferred types
export type GenericAttioRecords<
	TInput extends Schema.Top,
	TOutput extends Schema.Constraint,
	TFields extends Record<string, AttributeDef>,
	TObjects extends Record<string, Record<string, AttributeDef>> = Record<
		string,
		Record<string, AttributeDef>
	>,
	TObjectName extends Extract<keyof TObjects, string> = Extract<
		keyof TObjects,
		string
	>,
> = {
	findMany: (
		options?: QueryBuilderOptions<TFields, TObjects>,
	) => ReturnType<typeof AttioRecords.Service.list<TInput, TOutput>>
	findFirst: (
		options?: QueryBuilderOptions<TFields, TObjects>,
	) => FirstRecord<TInput, TOutput>

	list: (
		params?: NativeQueryParams<TFields, TObjects, TObjectName>,
	) => ReturnType<typeof AttioRecords.Service.list<TInput, TOutput>>

	assert: (
		matchingAttribute: Extract<keyof TFields, string>,
		data: Parameters<typeof AttioRecords.Service.assert<TInput, TOutput>>[3],
	) => ReturnType<typeof AttioRecords.Service.assert<TInput, TOutput>>

	create: (
		data: Parameters<typeof AttioRecords.Service.create<TInput, TOutput>>[2],
	) => ReturnType<typeof AttioRecords.Service.create<TInput, TOutput>>

	get: (
		id: Parameters<typeof AttioRecords.Service.get<TInput, TOutput>>[2],
	) => ReturnType<typeof AttioRecords.Service.get<TInput, TOutput>>

	update: (
		id: Parameters<typeof AttioRecords.Service.update<TInput, TOutput>>[2],
		data: Parameters<typeof AttioRecords.Service.update<TInput, TOutput>>[3],
	) => ReturnType<typeof AttioRecords.Service.update<TInput, TOutput>>

	patch: (
		id: Parameters<typeof AttioRecords.Service.patch<TInput, TOutput>>[2],
		data: Parameters<typeof AttioRecords.Service.patch<TInput, TOutput>>[3],
	) => ReturnType<typeof AttioRecords.Service.patch<TInput, TOutput>>

	delete: (
		id: Parameters<typeof AttioRecords.Service.delete>[1],
	) => ReturnType<typeof AttioRecords.Service.delete>

	listAttributeValues: <Attribute extends Extract<keyof TFields, string>>(
		id: Parameters<typeof AttioRecords.Service.listAttributeValues>[1],
		attribute: Attribute,
		params?: Parameters<typeof AttioRecords.Service.listAttributeValues>[3],
	) => ReturnType<
		typeof AttioRecords.Service.listAttributeValues<
			AttributeValueSchema<TFields[Attribute]>
		>
	>

	listEntries: (
		id: Parameters<typeof AttioRecords.Service.listEntries>[1],
		params?: Parameters<typeof AttioRecords.Service.listEntries>[2],
	) => ReturnType<typeof AttioRecords.Service.listEntries>
}
