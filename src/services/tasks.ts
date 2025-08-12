import * as HttpClientRequest from "@effect/platform/HttpClientRequest"
import * as HttpClientResponse from "@effect/platform/HttpClientResponse"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import { AttioHttpClient } from "../http-client.js"
import { DateTimeISOString } from "../shared/datetime-input.js"
import {
	Actor,
	Assignee,
	DataStruct,
	LinkedRecordInput,
	LinkedRecordOutput,
} from "../shared/schemas.js"
export const TaskId = Schema.Struct({
	workspace_id: Schema.String,
	task_id: Schema.String,
})
export const Task = Schema.Struct({
	id: TaskId,
	content_plaintext: Schema.String,
	deadline_at: Schema.NullOr(Schema.DateTimeUtc),
	is_completed: Schema.Boolean,
	created_at: Schema.DateTimeUtc,
	created_by_actor: Actor,
	assignees: Schema.Array(Assignee),
	linked_records: Schema.Array(LinkedRecordOutput),
})

export const TaskInput = Schema.Struct({
	content: Schema.String,
	format: Schema.Literal("plaintext"),
	deadline_at: Schema.optional(DateTimeISOString),
	is_completed: Schema.Boolean,
	linked_records: Schema.Array(LinkedRecordInput),
	assignees: Schema.Array(Assignee),
})

export const TaskUpdate = Schema.Struct({
	deadline_at: Schema.optional(DateTimeISOString),
	is_completed: Schema.optional(Schema.Boolean),
	linked_records: Schema.optional(Schema.Array(LinkedRecordInput)),
	assignees: Schema.optional(Schema.Array(Assignee)),
})

export const TaskListParams = Schema.Struct({
	limit: Schema.optional(Schema.Number),
	offset: Schema.optional(Schema.Number),
	sort: Schema.optional(Schema.Literal("created_at:asc", "created_at:desc")),
	linked_object: Schema.optional(Schema.String),
	linked_record_id: Schema.optional(Schema.UUID),
	assignee: Schema.optional(Schema.Union(Schema.UUID, Schema.Null)),
	is_completed: Schema.optional(Schema.Boolean),
})

export class AttioTasks extends Effect.Service<AttioTasks>()("AttioTasks", {
	effect: Effect.gen(function* () {
		const http = yield* AttioHttpClient

		return {
			/**
			 * List all tasks. Results are sorted by creation date, from oldest to newest.
			 *
			 * Required scopes: `task:read`, `object_configuration:read`, `record_permission:read`, `user_management:read`
			 */
			list: Effect.fn("tasks.list")(function* (
				params?: Schema.Schema.Type<typeof TaskListParams>,
			) {
				return yield* HttpClientRequest.get("/v2/tasks").pipe(
					HttpClientRequest.appendUrlParams(params),
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
			create: Effect.fn("tasks.create")(function* (
				task: Schema.Schema.Encoded<typeof TaskInput>,
			) {
				const body = yield* Schema.encodeUnknown(DataStruct(TaskInput))({
					data: task,
				})

				return yield* HttpClientRequest.post("/v2/tasks").pipe(
					HttpClientRequest.bodyJson(body),
					Effect.flatMap(http.execute),
					Effect.flatMap(HttpClientResponse.schemaBodyJson(DataStruct(Task))),
					Effect.map((result) => result.data),
				)
			}),

			/**
			 * Get a single task by ID
			 *
			 * Required scopes: `task:read`, `object_configuration:read`, `record_permission:read`, `user_management:read`
			 */
			get: Effect.fn("tasks.get")(function* (taskId: string) {
				return yield* http.get(`/v2/tasks/${taskId}`).pipe(
					Effect.flatMap(HttpClientResponse.schemaBodyJson(DataStruct(Task))),
					Effect.map((result) => result.data),
				)
			}),

			/**
			 * Delete a task by ID
			 *
			 * Required scopes: `task:read-write`
			 */
			delete: Effect.fn("tasks.delete")(function* (taskId: string) {
				yield* http.del(`/v2/tasks/${taskId}`)
			}),

			/**
			 * Update a task
			 *
			 * Updates an existing task by `task_id`. At present, only the `deadline_at`, `is_completed`,
			 * `linked_records`, and `assignees` fields can be updated.
			 *
			 * Required scopes: `task:read-write`, `object_configuration:read`, `record_permission:read`, `user_management:read`
			 */
			update: Effect.fn("tasks.update")(function* (
				taskId: string,
				task: Schema.Schema.Encoded<typeof TaskUpdate>,
			) {
				const body = yield* Schema.encodeUnknown(DataStruct(TaskUpdate))({
					data: task,
				})

				return yield* HttpClientRequest.patch(`/v2/tasks/${taskId}`).pipe(
					HttpClientRequest.bodyJson(body),
					Effect.flatMap(http.execute),
					Effect.flatMap(HttpClientResponse.schemaBodyJson(DataStruct(Task))),
					Effect.map((result) => result.data),
				)
			}),
		}
	}),
}) {}
