import * as Schema from "effect/Schema"
import { Actor, Tag } from "../../shared/schemas.js"

// note id schema
export const NoteId = Schema.Struct({
	workspace_id: Schema.String,
	note_id: Schema.String,
})

// note schema with snake_case and DateTime
export const Note = Schema.Struct({
	id: NoteId,
	parent_object: Schema.String,
	parent_record_id: Schema.UUID,
	title: Schema.String,
	content_plaintext: Schema.String,
	content_markdown: Schema.String,
	tags: Schema.Array(Tag),
	created_by_actor: Actor,
	created_at: Schema.DateTimeUtc,
})

// response schemas
export const NoteResponse = Schema.Struct({
	data: Note,
})

export const NoteListResponse = Schema.Struct({
	data: Schema.Array(Note),
})

// input schemas for creating notes
export const NoteInput = Schema.Struct({
	parent_object: Schema.String,
	parent_record_id: Schema.UUID,
	title: Schema.String,
	content: Schema.String,
	format: Schema.Literal("plaintext", "markdown"),
})

export const NoteInputRequest = Schema.Struct({
	data: NoteInput,
})

// list params
export const NoteListParams = Schema.Struct({
	limit: Schema.optional(Schema.Number),
	offset: Schema.optional(Schema.Number),
	parent_object: Schema.optional(Schema.String),
	parent_record_id: Schema.optional(Schema.UUID),
})
