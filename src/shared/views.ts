import * as Schema from "effect/Schema"
import { Uuid } from "./schemas.js"

export const ViewListParams = Schema.Struct({
	show_archived: Schema.optional(Schema.Boolean),
	limit: Schema.optional(
		Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 1000 })),
	),
	cursor: Schema.optional(Schema.String),
})

export const ViewId = Schema.Struct({
	view_id: Uuid,
})

export const ViewPagination = Schema.Struct({
	next_cursor: Schema.NullOr(Schema.String),
})

export const ViewListResponse = <A, I, RD, RE>(
	view: Schema.Codec<A, I, RD, RE>,
) =>
	Schema.Struct({
		data: Schema.Array(view),
		pagination: ViewPagination,
	})
