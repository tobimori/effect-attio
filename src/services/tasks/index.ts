import * as HttpClientRequest from "@effect/platform/HttpClientRequest"
import * as HttpClientResponse from "@effect/platform/HttpClientResponse"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import { AttioHttpClient } from "../../http-client.js"
import * as Schemas from "./schemas.js"
import type * as Types from "./types.js"

export type { Task, TaskInput, TaskListParams, TaskUpdate } from "./types.js"

export class AttioTasks extends Effect.Service<AttioTasks>()("AttioTasks", {
	effect: Effect.gen(function* () {
		const http = yield* AttioHttpClient

		return {
			/**
			 * List all tasks. Results are sorted by creation date, from oldest to newest.
			 *
			 * Required scopes: `task:read`, `object_configuration:read`, `record_permission:read`, `user_management:read`
			 */
			list: Effect.fn("tasks.list")(function* (params?: Types.TaskListParams) {
				const apiParams = params
					? yield* Schema.encodeUnknown(Schemas.TaskListParamsTransform)(params)
					: undefined
				return yield* HttpClientRequest.get("/v2/tasks").pipe(
					HttpClientRequest.appendUrlParams(apiParams),
					http.execute,
					Effect.flatMap(
						HttpClientResponse.schemaBodyJson(
							Schemas.TaskListResponseTransform,
						),
					),
				)
			}),

			/**
			 * Create a task
			 *
			 * At present, tasks can only be created from plaintext without record reference formatting.
			 *
			 * Required scopes: `task:read-write`, `object_configuration:read`, `record_permission:read`, `user_management:read`
			 */
			create: Effect.fn("tasks.create")(function* (task: Types.TaskInput) {
				const body = yield* Schema.encodeUnknown(Schemas.TaskInputTransform)(task)
				return yield* HttpClientRequest.post("/v2/tasks").pipe(
					HttpClientRequest.bodyJson(body),
					Effect.flatMap(http.execute),
					Effect.flatMap(
						HttpClientResponse.schemaBodyJson(Schemas.TaskResponseTransform),
					),
				)
			}),

			/**
			 * Get a single task by ID
			 *
			 * Required scopes: `task:read`, `object_configuration:read`, `record_permission:read`, `user_management:read`
			 */
			get: Effect.fn("tasks.get")(function* (taskId: string) {
				return yield* http
					.get(`/v2/tasks/${taskId}`)
					.pipe(
						Effect.flatMap(
							HttpClientResponse.schemaBodyJson(Schemas.TaskResponseTransform),
						),
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
				task: Types.TaskUpdate,
			) {
				const body = yield* Schema.encodeUnknown(Schemas.TaskUpdateTransform)(task)
				return yield* HttpClientRequest.patch(`/v2/tasks/${taskId}`).pipe(
					HttpClientRequest.bodyJson(body),
					Effect.flatMap(http.execute),
					Effect.flatMap(
						HttpClientResponse.schemaBodyJson(Schemas.TaskResponseTransform),
					),
				)
			}),
		}
	}),
}) {}
