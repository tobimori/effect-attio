import * as Schema from "effect/Schema"

export const WorkspaceId = Schema.Struct({
	workspace_id: Schema.UUID,
})

export const RecordId = Schema.Struct({
	record_id: Schema.UUID,
})

export const WorkspaceMemberId = Schema.Struct({
	workspace_member_id: Schema.UUID,
})

export const ObjectId = Schema.Struct({
	object_id: Schema.UUID,
})

export const ActorType = Schema.Literal(
	"api-token",
	"workspace-member",
	"system",
	"app",
)

export const Actor = Schema.Struct({
	type: ActorType,
	id: Schema.UUID,
})

// assignee references for tasks and other objects
export const Assignee = Schema.Struct({
	referenced_actor_type: ActorType,
	referenced_actor_id: Schema.UUID,
})

// linked records for relationships between objects
export const LinkedRecordInput = Schema.Struct({
	target_object: Schema.String,
	target_record_id: Schema.UUID,
})

export const LinkedRecordOutput = Schema.Struct({
	target_object_id: Schema.String,
	target_record_id: Schema.UUID,
})

// tags for notes and comments
export const WorkspaceMemberTag = Schema.Struct({
	type: Schema.Literal("workspace-member"),
	workspace_member_id: Schema.UUID,
})

export const RecordTag = Schema.Struct({
	type: Schema.Literal("record"),
	object: Schema.String,
	record_id: Schema.UUID,
})

export const Tag = Schema.Union(WorkspaceMemberTag, RecordTag)

export const DataStruct = <A, I, R>(schema: Schema.Schema<A, I, R>) =>
	Schema.Struct({
		data: schema,
	})
