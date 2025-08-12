import type * as Schema from "effect/Schema"
import type * as Schemas from "./schemas.js"

// exported types for public consumption
export type Task = Schema.Schema.Type<typeof Schemas.Task>
export type TaskInput = Schema.Schema.Encoded<typeof Schemas.TaskInput>
export type TaskUpdate = Schema.Schema.Encoded<typeof Schemas.TaskUpdate>
export type TaskListParams = Schema.Schema.Type<typeof Schemas.TaskListParams>
export type TaskId = Schema.Schema.Type<typeof Schemas.TaskId>
