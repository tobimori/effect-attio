import * as Schema from "effect/Schema"

export class AttioNotFoundError extends Schema.TaggedError<AttioNotFoundError>()(
	"AttioNotFoundError",
	{
		message: Schema.String,
	},
) {}

export class AttioValidationError extends Schema.TaggedError<AttioValidationError>()(
	"AttioValidationError",
	{
		message: Schema.String,
		errors: Schema.Array(
			Schema.Struct({
				code: Schema.String,
				path: Schema.Array(Schema.Union(Schema.String, Schema.Number)),
				message: Schema.String,
			}),
		),
	},
) {}

export class AttioConflictError extends Schema.TaggedError<AttioConflictError>()(
	"AttioConflictError",
	{
		message: Schema.String,
		code: Schema.String,
	},
) {}

export class AttioUnauthorizedError extends Schema.TaggedError<AttioUnauthorizedError>()(
	"AttioUnauthorizedError",
	{
		message: Schema.String,
	},
) {}

export class AttioRateLimitError extends Schema.TaggedError<AttioRateLimitError>()(
	"AttioRateLimitError",
	{
		message: Schema.String,
		retryAfter: Schema.optional(Schema.Number),
	},
) {}

export type AttioErrors =
	| AttioNotFoundError
	| AttioValidationError
	| AttioConflictError
	| AttioUnauthorizedError
	| AttioRateLimitError
