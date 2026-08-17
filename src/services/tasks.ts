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
import {
	Actor,
	Assignee,
	DataStruct,
	LinkedRecordInput,
	LinkedRecordOutput,
	Uuid,
} from "../shared/schemas.js"
export const TaskId = Schema.Struct({
	workspace_id: Schema.String,
	task_id: Schema.String,
})
export const Task = Schema.Struct({
	id: TaskId,
	content_plaintext: Schema.String,
	deadline_at: Schema.NullOr(Schema.DateTimeUtcFromString),
	is_completed: Schema.Boolean,
	created_at: Schema.DateTimeUtcFromString,
	created_by_actor: Actor,
	assignees: Schema.Array(Assignee),
	linked_records: Schema.Array(LinkedRecordOutput),
})

export const TaskInput = Schema.Struct({
	content: Schema.String,
	format: Schema.Literal("plaintext"),
	deadline_at: Schema.optional(Schema.DateTimeUtcFromString),
	is_completed: Schema.Boolean,
	linked_records: Schema.Array(LinkedRecordInput),
	assignees: Schema.Array(Assignee),
})

export const TaskUpdate = Schema.Struct({
	deadline_at: Schema.optional(Schema.DateTimeUtcFromString),
	is_completed: Schema.optional(Schema.Boolean),
	linked_records: Schema.optional(Schema.Array(LinkedRecordInput)),
	assignees: Schema.optional(Schema.Array(Assignee)),
})

export const TaskListParams = Schema.Struct({
	limit: Schema.optional(Schema.Number),
	offset: Schema.optional(Schema.Number),
	sort: Schema.optional(
		Schema.Literals([
			"created_at:asc",
			"created_at:desc",
			"completed_at:asc",
			"completed_at:desc",
		]),
	),
	linked_object: Schema.optional(Schema.String),
	linked_record_id: Schema.optional(Uuid),
	assignee: Schema.optional(Schema.Union([Schema.String, Schema.Null])),
	is_completed: Schema.optional(Schema.Boolean),
})

const makeAttioTasks = Effect.gen(function* () {
	const http = yield* AttioHttpClient

	return {
		/**
		 * List tasks, with optional sorting and filtering.
		 *
		 * Required scopes: `task:read`, `object_configuration:read`, `record_permission:read`, `user_management:read`
		 */
		list: Effect.fn("AttioTasks.list")(function* (
			params?: (typeof TaskListParams)["Type"],
		) {
			return yield* HttpClientRequest.get("/v2/tasks").pipe(
				HttpClientRequest.appendUrlParams(params ?? {}),
				http.execute,
				Effect.flatMap(
					HttpClientResponse.schemaBodyJson(DataStruct(Schema.Array(Task))),
				),
				Effect.map((result) => result.data),
			)
		}),

		/**
		 * Create a task
		 *
		 * At present, tasks can only be created from plaintext without record reference formatting.
		 *
		 * Required scopes: `task:read-write`, `object_configuration:read`, `record_permission:read`, `user_management:read`
		 */
		create: Effect.fn("AttioTasks.create")(function* (
			task: (typeof TaskInput)["Encoded"],
		) {
			const data = yield* Schema.encodeUnknownEffect(TaskInput)(task)

			return yield* HttpClientRequest.post("/v2/tasks").pipe(
				HttpClientRequest.bodyJson({ data }),
				Effect.flatMap(http.execute),
				Effect.flatMap(HttpClientResponse.schemaBodyJson(DataStruct(Task))),
				Effect.map((result) => result.data),
				mapAttioErrors(AttioValidationErrorTransform),
			)
		}),

		/**
		 * Get a single task by ID
		 *
		 * Required scopes: `task:read`, `object_configuration:read`, `record_permission:read`, `user_management:read`
		 */
		get: Effect.fn("AttioTasks.get")(function* (taskId: string) {
			return yield* http.get(`/v2/tasks/${taskId}`).pipe(
				Effect.flatMap(HttpClientResponse.schemaBodyJson(DataStruct(Task))),
				Effect.map((result) => result.data),
				mapAttioErrors(AttioNotFoundErrorTransform),
			)
		}),

		/**
		 * Delete a task by ID
		 *
		 * Required scopes: `task:read-write`
		 */
		delete: Effect.fn("AttioTasks.delete")(function* (taskId: string) {
			yield* http
				.del(`/v2/tasks/${taskId}`)
				.pipe(mapAttioErrors(AttioNotFoundErrorTransform))
		}),

		/**
		 * Update a task
		 *
		 * Updates an existing task by `task_id`. At present, only the `deadline_at`, `is_completed`,
		 * `linked_records`, and `assignees` fields can be updated.
		 *
		 * Required scopes: `task:read-write`, `object_configuration:read`, `record_permission:read`, `user_management:read`
		 */
		update: Effect.fn("AttioTasks.update")(function* (
			taskId: string,
			task: (typeof TaskUpdate)["Encoded"],
		) {
			const body = yield* Schema.encodeUnknownEffect(DataStruct(TaskUpdate))({
				data: task,
			})

			return yield* HttpClientRequest.patch(`/v2/tasks/${taskId}`).pipe(
				HttpClientRequest.bodyJson(body),
				Effect.flatMap(http.execute),
				Effect.flatMap(HttpClientResponse.schemaBodyJson(DataStruct(Task))),
				Effect.map((result) => result.data),
				mapAttioErrors(
					AttioNotFoundErrorTransform,
					AttioValidationErrorTransform,
				),
			)
		}),
	}
})

export class AttioTasks extends Context.Service<
	AttioTasks,
	Effect.Success<typeof makeAttioTasks>
>()("effect-attio/services/AttioTasks") {
	static readonly layer = Layer.effect(
		AttioTasks,
		Effect.map(makeAttioTasks, AttioTasks.of),
	)
}
