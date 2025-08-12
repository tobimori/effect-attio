import * as Schema from "effect/Schema"
import { ActorType } from "../../shared/schemas.js"

// internal schemas matching attio's api format exactly

export const TaskApiInput = Schema.Struct({
	data: Schema.Struct({
		content: Schema.String,
		format: Schema.Literal("plaintext"),
		deadline_at: Schema.optional(Schema.String),
		is_completed: Schema.Boolean,
		linked_records: Schema.Array(
			Schema.Struct({
				target_object: Schema.String,
				target_record_id: Schema.String,
			}),
		),
		assignees: Schema.Array(
			Schema.Struct({
				referenced_actor_type: ActorType,
				referenced_actor_id: Schema.String,
			}),
		),
	}),
})

export const TaskApiUpdate = Schema.Struct({
	data: Schema.Struct({
		deadline_at: Schema.optional(Schema.String),
		is_completed: Schema.optional(Schema.Boolean),
		linked_records: Schema.optional(
			Schema.Array(
				Schema.Struct({
					target_object: Schema.String,
					target_record_id: Schema.String,
				}),
			),
		),
		assignees: Schema.optional(
			Schema.Array(
				Schema.Struct({
					referenced_actor_type: ActorType,
					referenced_actor_id: Schema.String,
				}),
			),
		),
	}),
})

export const TaskApiResponse = Schema.Struct({
	data: Schema.Struct({
		id: Schema.Struct({
			workspace_id: Schema.String,
			task_id: Schema.String,
		}),
		content_plaintext: Schema.String,
		deadline_at: Schema.NullOr(Schema.String),
		is_completed: Schema.Boolean,
		created_at: Schema.String,
		created_by_actor: Schema.Struct({
			type: Schema.String,
			id: Schema.String,
		}),
		assignees: Schema.Array(
			Schema.Struct({
				referenced_actor_type: ActorType,
				referenced_actor_id: Schema.String,
			}),
		),
		linked_records: Schema.Array(
			Schema.Struct({
				target_object_id: Schema.String,
				target_record_id: Schema.String,
			}),
		),
	}),
})

export const TaskApiListResponse = Schema.Struct({
	data: Schema.Array(
		Schema.Struct({
			id: Schema.Struct({
				workspace_id: Schema.String,
				task_id: Schema.String,
			}),
			content_plaintext: Schema.String,
			deadline_at: Schema.NullOr(Schema.String),
			is_completed: Schema.Boolean,
			created_at: Schema.String,
			linked_records: Schema.Array(
				Schema.Struct({
					target_object_id: Schema.String,
					target_record_id: Schema.String,
				}),
			),
			assignees: Schema.Array(
				Schema.Struct({
					referenced_actor_type: ActorType,
					referenced_actor_id: Schema.String,
				}),
			),
			created_by_actor: Schema.Struct({
				type: Schema.String,
				id: Schema.String,
			}),
		}),
	),
})

export const TaskApiListParams = Schema.Struct({
	limit: Schema.optional(Schema.Number),
	offset: Schema.optional(Schema.Number),
	sort: Schema.optional(Schema.Literal("created_at:asc", "created_at:desc")),
	linked_object: Schema.optional(Schema.String),
	linked_record_id: Schema.optional(Schema.String),
	assignee: Schema.optional(Schema.Union(Schema.String, Schema.Null)),
	is_completed: Schema.optional(Schema.Boolean),
})
