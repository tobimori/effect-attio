import * as Schema from "effect/Schema"
import {
	Actor,
	Assignee,
	LinkedRecordInput,
	LinkedRecordOutput,
} from "../../shared/schemas.js"

// public task id schema
export const TaskId = Schema.Struct({
	workspace_id: Schema.String,
	task_id: Schema.String,
})

// public task schema with snake_case and DateTime
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

// response schemas
export const TaskResponse = Schema.Struct({
	data: Task,
})

export const TaskListResponse = Schema.Struct({
	data: Schema.Array(Task),
})

// input schemas for creating/updating tasks
export const TaskInput = Schema.Struct({
	content: Schema.String,
	format: Schema.Literal("plaintext"),
	deadline_at: Schema.optional(Schema.DateTimeUtc),
	is_completed: Schema.Boolean,
	linked_records: Schema.Array(LinkedRecordInput),
	assignees: Schema.Array(Assignee),
})

export const TaskInputRequest = Schema.Struct({
	data: TaskInput,
})

export const TaskUpdate = Schema.Struct({
	deadline_at: Schema.optional(Schema.DateTimeUtc),
	is_completed: Schema.optional(Schema.Boolean),
	linked_records: Schema.optional(Schema.Array(LinkedRecordInput)),
	assignees: Schema.optional(Schema.Array(Assignee)),
})

export const TaskUpdateRequest = Schema.Struct({
	data: TaskUpdate,
})

// list params
export const TaskListParams = Schema.Struct({
	limit: Schema.optional(Schema.Number),
	offset: Schema.optional(Schema.Number),
	sort: Schema.optional(Schema.Literal("created_at:asc", "created_at:desc")),
	linked_object: Schema.optional(Schema.String),
	linked_record_id: Schema.optional(Schema.UUID),
	assignee: Schema.optional(Schema.Union(Schema.UUID, Schema.Null)),
	is_completed: Schema.optional(Schema.Boolean),
})
