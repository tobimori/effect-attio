import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import * as HttpClientRequest from "effect/unstable/http/HttpClientRequest"
import * as HttpClientResponse from "effect/unstable/http/HttpClientResponse"
import {
	AttioNotFoundErrorTransform,
	AttioValidationErrorTransform,
	mapAttioErrors,
} from "../error-transforms.js"
import { AttioHttpClient } from "../http-client.js"
import { CursorPage, CursorParams } from "../shared/pagination.js"
import { Actor, DataStruct, Uuid } from "../shared/schemas.js"
import type { ReplaceField } from "../shared/type-utils.js"

const ConnectedStorageProvider = Schema.Literals([
	"dropbox",
	"box",
	"google-drive",
	"microsoft-onedrive",
])
export const StorageProvider = Schema.Union([
	Schema.Literal("attio"),
	ConnectedStorageProvider,
])

const FileId = Schema.Struct({ workspace_id: Uuid, file_id: Uuid })
const FileBase = {
	id: FileId,
	object_id: Uuid,
	object_slug: Schema.String,
	record_id: Uuid,
	storage_provider: StorageProvider,
	created_by_actor: Actor,
	created_at: Schema.DateTimeUtcFromString,
}

export const File = Schema.Struct({
	...FileBase,
	file_type: Schema.Literal("file"),
	name: Schema.String,
	content_type: Schema.NullOr(Schema.String),
	content_size: Schema.NullOr(Schema.Number),
	parent_folder_id: Schema.NullOr(Uuid),
})

export const Folder = Schema.Struct({
	...FileBase,
	file_type: Schema.Literal("folder"),
	name: Schema.String,
	parent_folder_id: Schema.NullOr(Uuid),
})

const ConnectedFileFields = {
	...FileBase,
	external_provider_file_id: Schema.String,
	microsoft_drive_id: Schema.NullOr(Schema.String),
}

export const ConnectedFile = Schema.Struct({
	...ConnectedFileFields,
	file_type: Schema.Literal("connected-file"),
})

export const ConnectedFolder = Schema.Struct({
	...ConnectedFileFields,
	file_type: Schema.Literal("connected-folder"),
})

export const FileEntry = Schema.Union([
	File,
	Folder,
	ConnectedFile,
	ConnectedFolder,
])

const CreatedFileEntry = Schema.Union([Folder, ConnectedFile, ConnectedFolder])

const FileDetails = Schema.Union([
	File,
	Schema.Struct({ ...Folder.fields, has_children: Schema.Boolean }),
	ConnectedFile,
	ConnectedFolder,
])

const FileCursorParams = CursorParams(200)
export const FileListParams = Schema.Struct({
	object: Schema.String,
	record_id: Uuid,
	storage_provider: Schema.optional(StorageProvider),
	parent_folder_id: Schema.optional(Uuid),
	...FileCursorParams.fields,
})

const NativeFolderInput = Schema.Struct({
	object: Schema.String,
	record_id: Uuid,
	file_type: Schema.Literal("folder"),
	name: Schema.String,
	parent_folder_id: Schema.optional(Uuid),
})

const ConnectedEntryFields = {
	object: Schema.String,
	record_id: Uuid,
	storage_provider: ConnectedStorageProvider,
	external_provider_file_id: Schema.String,
	microsoft_drive_id: Schema.optional(Schema.NullOr(Schema.String)),
}

const FileEntryInput = Schema.Union([
	NativeFolderInput,
	Schema.Struct({
		...ConnectedEntryFields,
		file_type: Schema.Literal("connected-folder"),
	}),
	Schema.Struct({
		...ConnectedEntryFields,
		file_type: Schema.Literal("connected-file"),
	}),
])

const FileUploadFields = Schema.Struct({
	object: Schema.String,
	record_id: Uuid,
	parent_folder_id: Schema.optional(Uuid),
})

type FileUploadInput = (typeof FileUploadFields)["Type"] & {
	readonly file: Blob
	readonly fileName?: string
}

const makeAttioFiles = Effect.gen(function* () {
	const http = yield* AttioHttpClient

	return {
		list: Effect.fn("AttioFiles.list")(function* (
			params: (typeof FileListParams)["Type"],
		) {
			const query = yield* Schema.encodeEffect(FileListParams)(params)
			return yield* HttpClientRequest.get("/v2/files").pipe(
				HttpClientRequest.appendUrlParams(query),
				http.execute,
				Effect.flatMap(
					HttpClientResponse.schemaBodyJson(CursorPage(FileEntry)),
				),
			)
		}),

		create: Effect.fn("AttioFiles.create")(function* (
			entry: (typeof FileEntryInput)["Type"],
		) {
			const body = yield* Schema.encodeEffect(FileEntryInput)(entry)
			return yield* HttpClientRequest.post("/v2/files").pipe(
				HttpClientRequest.bodyJson(body),
				Effect.flatMap(http.execute),
				Effect.flatMap(
					HttpClientResponse.schemaBodyJson(DataStruct(CreatedFileEntry)),
				),
				Effect.map((response) => response.data),
				mapAttioErrors(AttioValidationErrorTransform),
			)
		}),

		upload: Effect.fn("AttioFiles.upload")(function* (input: FileUploadInput) {
			const fields = yield* Schema.encodeEffect(FileUploadFields)(input)
			const form = new FormData()
			if (input.fileName) {
				form.append("file", input.file, input.fileName)
			} else {
				form.append("file", input.file)
			}
			form.append("object", fields.object)
			form.append("record_id", fields.record_id)
			if (fields.parent_folder_id) {
				form.append("parent_folder_id", fields.parent_folder_id)
			}

			return yield* HttpClientRequest.post("/v2/files/upload").pipe(
				HttpClientRequest.bodyFormData(form),
				http.execute,
				Effect.flatMap(HttpClientResponse.schemaBodyJson(DataStruct(File))),
				Effect.map((response) => response.data),
				mapAttioErrors(AttioValidationErrorTransform),
			)
		}),

		get: Effect.fn("AttioFiles.get")(function* (fileId: string) {
			return yield* http.get(`/v2/files/${fileId}`).pipe(
				Effect.flatMap(
					HttpClientResponse.schemaBodyJson(DataStruct(FileDetails)),
				),
				Effect.map((response) => response.data),
				mapAttioErrors(AttioNotFoundErrorTransform),
			)
		}),

		delete: Effect.fn("AttioFiles.delete")(function* (fileId: string) {
			yield* http
				.del(`/v2/files/${fileId}`)
				.pipe(mapAttioErrors(AttioNotFoundErrorTransform))
		}),

		download: Effect.fn("AttioFiles.download")(function* (fileId: string) {
			const response = yield* http
				.get(`/v2/files/${fileId}/download`)
				.pipe(mapAttioErrors(AttioNotFoundErrorTransform))
			return new Uint8Array(yield* response.arrayBuffer)
		}),
	}
})

export class AttioFiles extends Context.Service<
	AttioFiles,
	Effect.Success<typeof makeAttioFiles>
>()("effect-attio/services/AttioFiles") {
	static readonly layer = Layer.effect(
		AttioFiles,
		Effect.map(makeAttioFiles, AttioFiles.of),
	)
}

type WithConfiguredObject<
	Input extends { readonly object: string },
	TObjectName extends string,
> = ReplaceField<Input, "object", TObjectName>

export type GenericAttioFiles<TObjectName extends string> = Omit<
	AttioFiles["Service"],
	"list" | "create" | "upload"
> & {
	list: (
		params: WithConfiguredObject<
			Parameters<AttioFiles["Service"]["list"]>[0],
			TObjectName
		>,
	) => ReturnType<AttioFiles["Service"]["list"]>
	create: (
		entry: WithConfiguredObject<
			Parameters<AttioFiles["Service"]["create"]>[0],
			TObjectName
		>,
	) => ReturnType<AttioFiles["Service"]["create"]>
	upload: (
		input: WithConfiguredObject<
			Parameters<AttioFiles["Service"]["upload"]>[0],
			TObjectName
		>,
	) => ReturnType<AttioFiles["Service"]["upload"]>
}
