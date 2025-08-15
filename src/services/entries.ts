import * as HttpClientRequest from "@effect/platform/HttpClientRequest"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import {
	AttioConflictErrorTransform,
	AttioImmutableValueErrorTransform,
	AttioMissingValueErrorTransform,
	AttioMultipleMatchErrorTransform,
	AttioNotFoundErrorTransform,
	mapAttioErrors,
} from "../error-transforms.js"
import { AttioHttpClient } from "../http-client.js"
import { schemaBodyJsonNever } from "../schemas/body.js"
import { DataStruct } from "../shared/schemas.js"

const EntryId = Schema.Struct({
	workspace_id: Schema.UUID,
	list_id: Schema.UUID,
	entry_id: Schema.UUID,
})

export class AttioEntries extends Effect.Service<AttioEntries>()(
	"AttioEntries",
	{
		effect: Effect.gen(function* () {
			const http = yield* AttioHttpClient

			return {
				/**
				 * # List entries
				 *
				 * Lists entries in a given list, with the option to filter and sort results.
				 *
				 * Required scopes: `list_entry:read`, `list_configuration:read`
				 *
				 * @see https://docs.attio.com/rest-api/endpoint-reference/entries/list-entries
				 */
				list: Effect.fn(`entries.list`)(function* <
					T extends { input: Schema.Schema.Any; output: Schema.Schema.Any },
				>(
					list: string,
					schema: T,
					params?: {
						filter?: Record<string, any>
						sorts?: Array<
							| {
									direction: "asc" | "desc"
									attribute: string
									field?: string
							  }
							| {
									direction: "asc" | "desc"
									path: Array<[string, string]>
									field?: string
							  }
						>
						limit?: number
						offset?: number
					},
				) {
					return yield* HttpClientRequest.post(
						`/v2/lists/${list}/entries/query`,
					).pipe(
						HttpClientRequest.bodyJson({
							filter: params?.filter,
							sorts: params?.sorts,
							limit: params?.limit ?? 500,
							offset: params?.offset ?? 0,
						}),
						Effect.flatMap(http.execute),
						Effect.flatMap(
							schemaBodyJsonNever(
								DataStruct(
									Schema.Array(
										Schema.Struct({
											id: EntryId,
											parent_record_id: Schema.UUID,
											parent_object: Schema.String,
											created_at: Schema.DateTimeUtc,
											entry_values: schema.output,
										}),
									),
								),
							),
						),
						Effect.map((result) => result.data),
					)
				}),

				/**
				 * # Assert a list entry by parent
				 *
				 * Use this endpoint to create or update a list entry for a given parent record.
				 * If an entry with the specified parent record is found, that entry will be updated.
				 * If no such entry is found, a new entry will be created instead.
				 * If there are multiple entries with the same parent record, this endpoint with return the "MULTIPLE_MATCH_RESULTS" error.
				 * When writing to multi-select attributes, all values will be either created or deleted as necessary
				 * to match the list of values supplied in the request body.
				 *
				 * Required scopes: `list_entry:read-write`, `list_configuration:read`
				 *
				 * @see https://docs.attio.com/rest-api/endpoint-reference/entries/assert-a-list-entry-by-parent
				 */
				assert: Effect.fn(`entries.assert`)(function* <
					T extends { input: Schema.Schema.Any; output: Schema.Schema.Any },
				>(
					list: string,
					schema: T,
					data: {
						parent_record_id: string
						parent_object: string
						entry_values: Schema.Schema.Type<T["input"]>
					},
				) {
					return yield* HttpClientRequest.put(`/v2/lists/${list}/entries`).pipe(
						HttpClientRequest.bodyJson({
							data: {
								parent_record_id: data.parent_record_id,
								parent_object: data.parent_object,
								entry_values: data.entry_values,
							},
						}),
						Effect.flatMap(http.execute),
						Effect.flatMap(
							schemaBodyJsonNever(
								DataStruct(
									Schema.Struct({
										id: EntryId,
										parent_record_id: Schema.UUID,
										parent_object: Schema.String,
										created_at: Schema.DateTimeUtc,
										entry_values: schema.output,
									}),
								),
							),
						),
						Effect.map((result) => result.data),
						mapAttioErrors(
							AttioMultipleMatchErrorTransform,
							AttioNotFoundErrorTransform,
						),
					)
				}),

				/**
				 * # Create an entry (add record to list)
				 *
				 * Adds a record to a list as a new list entry.
				 * This endpoint will throw on conflicts of unique attributes.
				 * Multiple list entries are allowed for the same parent record.
				 *
				 * Required scopes: `list_entry:read-write`, `list_configuration:read`
				 *
				 * @see https://docs.attio.com/rest-api/endpoint-reference/entries/create-an-entry-add-record-to-list
				 */
				create: Effect.fn(`entries.create`)(function* <
					T extends { input: Schema.Schema.Any; output: Schema.Schema.Any },
				>(
					list: string,
					schema: T,
					data: {
						parent_record_id: string
						parent_object: string
						entry_values: Schema.Schema.Type<T["input"]>
					},
				) {
					return yield* HttpClientRequest.post(
						`/v2/lists/${list}/entries`,
					).pipe(
						HttpClientRequest.bodyJson({
							data: {
								parent_record_id: data.parent_record_id,
								parent_object: data.parent_object,
								entry_values: data.entry_values,
							},
						}),
						Effect.flatMap(http.execute),
						Effect.flatMap(
							schemaBodyJsonNever(
								DataStruct(
									Schema.Struct({
										id: EntryId,
										parent_record_id: Schema.UUID,
										parent_object: Schema.String,
										created_at: Schema.DateTimeUtc,
										entry_values: schema.output,
									}),
								),
							),
						),
						Effect.map((result) => result.data),
						mapAttioErrors(
							AttioConflictErrorTransform,
							AttioMissingValueErrorTransform,
							AttioNotFoundErrorTransform,
						),
					)
				}),

				/**
				 * # Get a list entry
				 *
				 * Gets a single list entry by its `entry_id`.
				 *
				 * Required scopes: `list_entry:read`, `list_configuration:read`
				 *
				 * @see https://docs.attio.com/rest-api/endpoint-reference/entries/get-a-list-entry
				 */
				get: Effect.fn(`entries.get`)(function* <
					T extends { output: Schema.Schema.Any },
				>(list: string, schema: T, entryId: string) {
					return yield* http.get(`/v2/lists/${list}/entries/${entryId}`).pipe(
						Effect.flatMap(
							schemaBodyJsonNever(
								DataStruct(
									Schema.Struct({
										id: EntryId,
										parent_record_id: Schema.UUID,
										parent_object: Schema.String,
										created_at: Schema.DateTimeUtc,
										entry_values: schema.output,
									}),
								),
							),
						),
						Effect.map((result) => result.data),
						mapAttioErrors(AttioNotFoundErrorTransform),
					)
				}),

				/**
				 * # Update a list entry (overwrite multiselect values)
				 *
				 * Use this endpoint to update list entries by `entry_id`.
				 * If the update payload includes multiselect attributes, the values supplied will overwrite/remove
				 * the list of values that already exist (if any).
				 * Use the `PATCH` endpoint to add multiselect attribute values without removing those value that already exist.
				 *
				 * Required scopes: `list_entry:read-write`, `list_configuration:read`
				 *
				 * @see https://docs.attio.com/rest-api/endpoint-reference/entries/update-a-list-entry-overwrite-multiselect-values
				 */
				update: Effect.fn(`entries.update`)(function* <
					T extends { input: Schema.Schema.Any; output: Schema.Schema.Any },
				>(
					list: string,
					entryId: string,
					schema: T,
					data: {
						entry_values: Schema.Schema.Type<T["input"]>
					},
				) {
					return yield* HttpClientRequest.put(
						`/v2/lists/${list}/entries/${entryId}`,
					).pipe(
						HttpClientRequest.bodyJson({
							data: {
								entry_values: data.entry_values,
							},
						}),
						Effect.flatMap(http.execute),
						Effect.flatMap(
							schemaBodyJsonNever(
								DataStruct(
									Schema.Struct({
										id: EntryId,
										parent_record_id: Schema.UUID,
										parent_object: Schema.String,
										created_at: Schema.DateTimeUtc,
										entry_values: schema.output,
									}),
								),
							),
						),
						Effect.map((result) => result.data),
						mapAttioErrors(
							AttioImmutableValueErrorTransform,
							AttioNotFoundErrorTransform,
						),
					)
				}),

				/**
				 * # Delete a list entry
				 *
				 * Deletes a single list entry by its `entry_id`.
				 *
				 * Required scopes: `list_entry:read-write`, `list_configuration:read`
				 *
				 * @see https://docs.attio.com/rest-api/endpoint-reference/entries/delete-a-list-entry
				 */
				delete: Effect.fn(`entries.delete`)(function* (
					list: string,
					entryId: string,
				) {
					return yield* http
						.del(`/v2/lists/${list}/entries/${entryId}`)
						.pipe(mapAttioErrors(AttioNotFoundErrorTransform))
				}),

				/**
				 * # Update a list entry (append multiselect values)
				 *
				 * Use this endpoint to update list entries by `entry_id`.
				 * If the update payload includes multiselect attributes, the values supplied will be created
				 * and prepended to the list of values that already exist (if any).
				 * Use the `PUT` endpoint to overwrite or remove multiselect attribute values.
				 *
				 * Required scopes: `list_entry:read-write`, `list_configuration:read`
				 *
				 * @see https://docs.attio.com/rest-api/endpoint-reference/entries/update-a-list-entry-append-multiselect-values
				 */
				patch: Effect.fn(`entries.patch`)(function* <
					T extends { input: Schema.Schema.Any; output: Schema.Schema.Any },
				>(
					list: string,
					entryId: string,
					schema: T,
					data: {
						entry_values: Schema.Schema.Type<T["input"]>
					},
				) {
					return yield* HttpClientRequest.patch(
						`/v2/lists/${list}/entries/${entryId}`,
					).pipe(
						HttpClientRequest.bodyJson({
							data: {
								entry_values: data.entry_values,
							},
						}),
						Effect.flatMap(http.execute),
						Effect.flatMap(
							schemaBodyJsonNever(
								DataStruct(
									Schema.Struct({
										id: EntryId,
										parent_record_id: Schema.UUID,
										parent_object: Schema.String,
										created_at: Schema.DateTimeUtc,
										entry_values: schema.output,
									}),
								),
							),
						),
						Effect.map((result) => result.data),
						mapAttioErrors(
							AttioImmutableValueErrorTransform,
							AttioNotFoundErrorTransform,
						),
					)
				}),

				/**
				 * # List attribute values for a list entry
				 *
				 * Gets all values for a given attribute on a list entry. This endpoint has the ability to return all historic values
				 * using the `show_historic` query param. Historic values are sorted from oldest to newest (by `active_from`).
				 *
				 * Required scopes: `list_entry:read`, `list_configuration:read`
				 *
				 * @see https://docs.attio.com/rest-api/endpoint-reference/entries/list-attribute-values-for-a-list-entry
				 */
				listAttributeValues: Effect.fn(`entries.listAttributeValues`)(
					function* (
						list: string,
						entryId: string,
						attribute: string,
						params?: {
							show_historic?: boolean
							limit?: number
							offset?: number
						},
					) {
						return yield* HttpClientRequest.get(
							`/v2/lists/${list}/entries/${entryId}/attributes/${attribute}/values`,
						).pipe(
							HttpClientRequest.setUrlParams({
								show_historic: params?.show_historic?.toString(),
								limit: params?.limit?.toString(),
								offset: params?.offset?.toString(),
							}),
							http.execute,
							Effect.flatMap(
								schemaBodyJsonNever(DataStruct(Schema.Array(Schema.Unknown))),
							),
							Effect.map((result) => result.data),
							mapAttioErrors(AttioNotFoundErrorTransform),
						)
					},
				),
			}
		}),
	},
) {}

// extract method signatures from service with inferred types
export type GenericAttioEntries<
	T extends { input: Schema.Schema.Any; output: Schema.Schema.Any },
> = {
	list: (
		params?: Parameters<typeof AttioEntries.Service.list<T>>[2],
	) => ReturnType<typeof AttioEntries.Service.list<T>>
	assert: (
		data: Parameters<typeof AttioEntries.Service.assert<T>>[2],
	) => ReturnType<typeof AttioEntries.Service.assert<T>>
	create: (
		data: Parameters<typeof AttioEntries.Service.create<T>>[2],
	) => ReturnType<typeof AttioEntries.Service.create<T>>
	get: (entryId: string) => ReturnType<typeof AttioEntries.Service.get<T>>
	update: (
		entryId: string,
		data: Parameters<typeof AttioEntries.Service.update<T>>[3],
	) => ReturnType<typeof AttioEntries.Service.update<T>>
	delete: (entryId: string) => ReturnType<typeof AttioEntries.Service.delete>
	patch: (
		entryId: string,
		data: Parameters<typeof AttioEntries.Service.patch<T>>[3],
	) => ReturnType<typeof AttioEntries.Service.patch<T>>
	listAttributeValues: (
		entryId: string,
		attribute: string,
		params?: Parameters<typeof AttioEntries.Service.listAttributeValues>[3],
	) => ReturnType<typeof AttioEntries.Service.listAttributeValues>
}
