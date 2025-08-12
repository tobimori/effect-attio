import * as DateTime from "effect/DateTime"
import * as Schema from "effect/Schema"
import {
	Actor,
	Assignee,
	LinkedRecordInput,
	LinkedRecordOutput,
} from "../../shared/schemas.js"
import * as Internal from "./internal.js"

// public task id schema
export const TaskId = Schema.Struct({
	workspaceId: Schema.String,
	taskId: Schema.String,
})

// public task schema with camelCase and DateTime
export const Task = Schema.TaggedStruct("Task", {
	id: TaskId,
	contentPlaintext: Schema.String,
	deadlineAt: Schema.NullOr(Schema.DateTimeUtc),
	isCompleted: Schema.Boolean,
	createdAt: Schema.DateTimeUtc,
	createdByActor: Actor,
	assignees: Schema.Array(Assignee),
	linkedRecords: Schema.Array(LinkedRecordOutput),
})

// input schemas for creating/updating tasks
export const TaskInput = Schema.Struct({
	content: Schema.String,
	format: Schema.Literal("plaintext"),
	deadlineAt: Schema.optional(Schema.DateTimeUtc),
	isCompleted: Schema.Boolean,
	linkedRecords: Schema.Array(LinkedRecordInput),
	assignees: Schema.Array(Assignee),
})

export const TaskUpdate = Schema.Struct({
	deadlineAt: Schema.optional(Schema.DateTimeUtc),
	isCompleted: Schema.optional(Schema.Boolean),
	linkedRecords: Schema.optional(Schema.Array(LinkedRecordInput)),
	assignees: Schema.optional(Schema.Array(Assignee)),
})

// list params
export const TaskListParams = Schema.Struct({
	limit: Schema.optional(Schema.Number),
	offset: Schema.optional(Schema.Number),
	sort: Schema.optional(Schema.Literal("created_at:asc", "created_at:desc")),
	linkedObject: Schema.optional(Schema.String),
	linkedRecordId: Schema.optional(Schema.UUID),
	assignee: Schema.optional(Schema.Union(Schema.UUID, Schema.Null)),
	isCompleted: Schema.optional(Schema.Boolean),
})

// transforms between public and internal formats

export const TaskInputTransform = Schema.transform(
	Internal.TaskApiInput,
	TaskInput,
	{
		strict: true,
		decode: (api) => ({
			content: api.data.content,
			format: api.data.format,
			deadlineAt: api.data.deadline_at,
			isCompleted: api.data.is_completed,
			linkedRecords: api.data.linked_records.map((r) => ({
				targetObject: r.target_object,
				targetRecordId: r.target_record_id,
			})),
			assignees: api.data.assignees.map((a) => ({
				referencedActorType: a.referenced_actor_type,
				referencedActorId: a.referenced_actor_id,
			})),
		}),
		encode: (input) => ({
			data: {
				content: input.content,
				format: input.format,
				deadline_at: input.deadlineAt,
				is_completed: input.isCompleted,
				linked_records: input.linkedRecords.map((r) => ({
					target_object: r.targetObject,
					target_record_id: r.targetRecordId,
				})),
				assignees: input.assignees.map((a) => ({
					referenced_actor_type: a.referencedActorType,
					referenced_actor_id: a.referencedActorId,
				})),
			},
		}),
	},
)

export const TaskUpdateTransform = Schema.transform(
	Internal.TaskApiUpdate,
	TaskUpdate,
	{
		strict: true,
		decode: (api) => ({
			deadlineAt: api.data.deadline_at,
			isCompleted: api.data.is_completed,
			linkedRecords: api.data.linked_records?.map((r) => ({
				targetObject: r.target_object,
				targetRecordId: r.target_record_id,
			})),
			assignees: api.data.assignees?.map((a) => ({
				referencedActorType: a.referenced_actor_type,
				referencedActorId: a.referenced_actor_id,
			})),
		}),
		encode: (input) => ({
			data: {
				deadline_at: input.deadlineAt,
				is_completed: input.isCompleted,
				linked_records: input.linkedRecords?.map((r) => ({
					target_object: r.targetObject,
					target_record_id: r.targetRecordId,
				})),
				assignees: input.assignees?.map((a) => ({
					referenced_actor_type: a.referencedActorType,
					referenced_actor_id: a.referencedActorId,
				})),
			},
		}),
	},
)

export const TaskResponseTransform = Schema.transform(
	Internal.TaskApiResponse,
	Task,
	{
		strict: true,
		decode: (api) => ({
			_tag: "Task" as const,
			id: {
				workspaceId: api.data.id.workspace_id,
				taskId: api.data.id.task_id,
			},
			contentPlaintext: api.data.content_plaintext,
			deadlineAt: api.data.deadline_at,
			isCompleted: api.data.is_completed,
			createdAt: api.data.created_at,
			createdByActor: {
				type: api.data.created_by_actor.type as typeof Actor.Type,
				id: api.data.created_by_actor.id as typeof Actor.Type,
			},
			assignees: api.data.assignees.map((a) => ({
				referenced_actor_type: a.referenced_actor_type,
				referenced_actor_id:
					a.referenced_actor_id as (typeof Assignee.Type)["referenced_actor_id"],
			})),
			linkedRecords: api.data.linked_records.map((r) => ({
				target_object_id: r.target_object_id,
				target_record_id:
					r.target_record_id as (typeof LinkedRecordOutput.Type)["target_record_id"],
			})),
		}),
		encode: (task) => ({
			data: {
				id: {
					workspace_id: task.id.workspaceId,
					task_id: task.id.taskId,
				},
				content_plaintext: task.contentPlaintext,
				deadline_at: task.deadlineAt,
				is_completed: task.isCompleted,
				created_at: task.createdAt,
				created_by_actor: {
					type: task.createdByActor.type,
					id: task.createdByActor.id,
				},
				assignees: task.assignees.map((a) => ({
					referenced_actor_type: a.referenced_actor_type,
					referenced_actor_id: a.referenced_actor_id,
				})),
				linked_records: task.linkedRecords.map((r) => ({
					target_object_id: r.target_object_id,
					target_record_id: r.target_record_id,
				})),
			},
		}),
	},
)

export const TaskListResponseTransform = Schema.transform(
	Internal.TaskApiListResponse,
	Schema.Array(Task),
	{
		strict: true,
		decode: (api) =>
			api.data.map((item) => ({
				_tag: "Task" as const,
				id: {
					workspaceId: item.id.workspace_id,
					taskId: item.id.task_id,
				},
				contentPlaintext: item.content_plaintext,
				deadlineAt: item.deadline_at,
				isCompleted: item.is_completed,
				createdAt: item.created_at,
				createdByActor: {
					type: item.created_by_actor.type as typeof Actor.Type,
					id: item.created_by_actor.id as typeof Actor.Type,
				},
				assignees: item.assignees.map((a) => ({
					referenced_actor_type: a.referenced_actor_type,
					referenced_actor_id:
						a.referenced_actor_id as (typeof Assignee.Type)["referenced_actor_id"],
				})),
				linkedRecords: item.linked_records.map((r) => ({
					target_object_id: r.target_object_id,
					target_record_id:
						r.target_record_id as (typeof LinkedRecordOutput.Type)["target_record_id"],
				})),
			})),
		encode: (tasks) => ({
			data: tasks.map((task) => ({
				id: {
					workspace_id: task.id.workspaceId,
					task_id: task.id.taskId,
				},
				content_plaintext: task.contentPlaintext,
				deadline_at: task.deadlineAt,
				is_completed: task.isCompleted,
				created_at: task.createdAt,
				created_by_actor: {
					type: task.createdByActor.type,
					id: task.createdByActor.id,
				},
				assignees: task.assignees.map((a) => ({
					referenced_actor_type: a.referenced_actor_type,
					referenced_actor_id: a.referenced_actor_id,
				})),
				linked_records: task.linkedRecords.map((r) => ({
					target_object_id: r.target_object_id,
					target_record_id: r.target_record_id,
				})),
			})),
		}),
	},
)

export const TaskListParamsTransform = Schema.transform(
	Internal.TaskApiListParams,
	TaskListParams,
	{
		strict: true,
		decode: (api) => ({
			limit: api.limit,
			offset: api.offset,
			sort: api.sort,
			linkedObject: api.linked_object,
			linkedRecordId:
				api.linked_record_id as (typeof TaskListParams.Type)["linkedRecordId"],
			assignee: api.assignee as (typeof TaskListParams.Type)["assignee"],
			isCompleted: api.is_completed,
		}),
		encode: (params) => ({
			limit: params.limit,
			offset: params.offset,
			sort: params.sort,
			linked_object: params.linkedObject,
			linked_record_id: params.linkedRecordId,
			assignee: params.assignee,
			is_completed: params.isCompleted,
		}),
	},
)
