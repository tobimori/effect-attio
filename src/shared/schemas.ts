import * as Schema from "effect/Schema"

/** A string that contains a valid UUID. */
export const Uuid = Schema.String.check(Schema.isUUID())

export const WorkspaceId = Schema.Struct({
	workspace_id: Uuid,
})

export const RecordId = Schema.Struct({
	record_id: Uuid,
})

export const WorkspaceMemberId = Schema.Struct({
	workspace_member_id: Uuid,
})

export const ObjectId = Schema.Struct({
	object_id: Uuid,
})

export const ActorType = Schema.Literals([
	"api-token",
	"workspace-member",
	"system",
	"app",
])

export const Actor = Schema.Union([
	Schema.Struct({
		type: Schema.Literal("system"),
		id: Schema.Null,
	}),
	Schema.Struct({
		type: Schema.Literals(["api-token", "workspace-member", "app"]),
		id: Uuid,
	}),
])

// assignee references for tasks and other objects
export const Assignee = Schema.Struct({
	referenced_actor_type: ActorType,
	referenced_actor_id: Uuid,
})

// linked records for relationships between objects
export const LinkedRecordInput = Schema.Struct({
	target_object: Schema.String,
	target_record_id: Uuid,
})

export const LinkedRecordOutput = Schema.Struct({
	target_object_id: Schema.String,
	target_record_id: Uuid,
})

// tags for notes and comments
export const WorkspaceMemberTag = Schema.Struct({
	type: Schema.Literal("workspace-member"),
	workspace_member_id: Uuid,
})

export const RecordTag = Schema.Struct({
	type: Schema.Literal("record"),
	object: Schema.String,
	record_id: Uuid,
})

export const Tag = Schema.Union([WorkspaceMemberTag, RecordTag])

export const DataStruct = <A, I, RD, RE>(schema: Schema.Codec<A, I, RD, RE>) =>
	Schema.Struct({
		data: schema,
	})
