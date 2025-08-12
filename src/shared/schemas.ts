import * as Schema from "effect/Schema"

// actor types used across the system
export const ActorType = Schema.Literal("api-token", "workspace-member", "system", "app")

export const Actor = Schema.Struct({
  type: ActorType,
  id: Schema.UUID,
})

// assignee references for tasks and other objects
export const Assignee = Schema.Struct({
  referencedActorType: Schema.propertySignature(ActorType).pipe(
    Schema.fromKey("referenced_actor_type")
  ),
  referencedActorId: Schema.propertySignature(Schema.UUID).pipe(
    Schema.fromKey("referenced_actor_id")
  ),
})

// linked records for relationships between objects
export const LinkedRecordInput = Schema.Struct({
  targetObject: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey("target_object")
  ),
  targetRecordId: Schema.propertySignature(Schema.UUID).pipe(
    Schema.fromKey("target_record_id")
  ),
})

export const LinkedRecordOutput = Schema.Struct({
  targetObjectId: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey("target_object_id")
  ),
  targetRecordId: Schema.propertySignature(Schema.UUID).pipe(
    Schema.fromKey("target_record_id")
  ),
})