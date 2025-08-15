import * as Schema from "effect/Schema"

// 404 Errors
export class AttioNotFoundError extends Schema.TaggedError<AttioNotFoundError>()(
	"AttioNotFoundError",
	{
		message: Schema.String,
	},
) {}

// 400 Errors - Validation
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

// 400 Errors - Missing Value (covers both missing_value and value_not_found codes)
export class AttioMissingValueError extends Schema.TaggedError<AttioMissingValueError>()(
	"AttioMissingValueError",
	{
		message: Schema.String,
		code: Schema.Union(
			Schema.Literal("missing_value"),
			Schema.Literal("value_not_found"),
		),
	},
) {}

// 400 Errors - Immutable Value
export class AttioImmutableValueError extends Schema.TaggedError<AttioImmutableValueError>()(
	"AttioImmutableValueError",
	{
		message: Schema.String,
	},
) {}

// 400 Errors - Filter Error
export class AttioFilterError extends Schema.TaggedError<AttioFilterError>()(
	"AttioFilterError",
	{
		message: Schema.String,
	},
) {}

// 400 Errors - Multiple Match Results
export class AttioMultipleMatchError extends Schema.TaggedError<AttioMultipleMatchError>()(
	"AttioMultipleMatchError",
	{
		message: Schema.String,
	},
) {}

// 400 Errors - System Edit Unauthorized
export class AttioSystemEditError extends Schema.TaggedError<AttioSystemEditError>()(
	"AttioSystemEditError",
	{
		message: Schema.String,
	},
) {}

// 409 Errors
export class AttioConflictError extends Schema.TaggedError<AttioConflictError>()(
	"AttioConflictError",
	{
		message: Schema.String,
		code: Schema.String,
	},
) {}

// 401 Errors
export class AttioUnauthorizedError extends Schema.TaggedError<AttioUnauthorizedError>()(
	"AttioUnauthorizedError",
	{
		message: Schema.String,
	},
) {}

// 429 Errors
export class AttioRateLimitError extends Schema.TaggedError<AttioRateLimitError>()(
	"AttioRateLimitError",
	{
		message: Schema.String,
		retryAfter: Schema.DateTimeUtcFromSelf,
	},
) {}

// 403 Errors
export class AttioForbiddenError extends Schema.TaggedError<AttioForbiddenError>()(
	"AttioForbiddenError",
	{
		message: Schema.String,
		code: Schema.String,
	},
) {}

export type AttioErrors =
	| AttioNotFoundError
	| AttioValidationError
	| AttioMissingValueError
	| AttioImmutableValueError
	| AttioFilterError
	| AttioMultipleMatchError
	| AttioSystemEditError
	| AttioConflictError
	| AttioUnauthorizedError
	| AttioRateLimitError
	| AttioForbiddenError
