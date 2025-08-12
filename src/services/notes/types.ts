import type * as Schema from "effect/Schema"
import type * as Schemas from "./schemas.js"

// exported types for public consumption
export type Note = Schema.Schema.Type<typeof Schemas.Note>
export type NoteInput = Schema.Schema.Encoded<typeof Schemas.NoteInput>
export type NoteListParams = Schema.Schema.Type<typeof Schemas.NoteListParams>
export type NoteId = Schema.Schema.Type<typeof Schemas.NoteId>