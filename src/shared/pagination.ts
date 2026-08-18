import * as Schema from "effect/Schema"

const CursorPagination = Schema.Struct({
	next_cursor: Schema.NullOr(Schema.String),
})

export const CursorParams = (maximum: number) =>
	Schema.Struct({
		limit: Schema.optional(
			Schema.Int.check(Schema.isBetween({ minimum: 1, maximum })),
		),
		cursor: Schema.optional(Schema.String),
	})

export const CursorPage = <A, I, RD, RE>(item: Schema.Codec<A, I, RD, RE>) =>
	Schema.Struct({
		data: Schema.Array(item),
		pagination: CursorPagination,
	})
