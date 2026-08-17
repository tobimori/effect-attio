import * as Schema from "effect/Schema"
import { Uuid } from "./schemas.js"

const Direction = Schema.Literals(["asc", "desc"])

const AttributeSort = Schema.Struct({
	direction: Direction,
	attribute: Schema.String,
	field: Schema.optional(Schema.String),
})

const PathSort = Schema.Struct({
	direction: Direction,
	path: Schema.Array(Schema.Tuple([Schema.String, Schema.String])),
	field: Schema.optional(Schema.String),
})

export const QuerySort = Schema.Union([AttributeSort, PathSort])

const QueryFields = {
	sorts: Schema.optional(Schema.Array(QuerySort)),
	limit: Schema.optional(Schema.Number),
	offset: Schema.optional(Schema.Number),
}

const Filter = Schema.Record(Schema.String, Schema.Json)

export const QueryParams = Schema.Union([
	Schema.Struct({
		...QueryFields,
		filter: Schema.optional(Filter),
		filter_view_id: Schema.optional(Schema.Never),
	}),
	Schema.Struct({
		...QueryFields,
		filter: Schema.optional(Schema.Never),
		filter_view_id: Schema.optional(Uuid),
	}),
])
