import * as Schema from "effect/Schema"

// Not found (code: "not_found" or "value_not_found", with a 404 or a 400)
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
				path: Schema.Array(Schema.Union([Schema.String, Schema.Number])),
				message: Schema.String,
			}),
		),
	},
) {}

// 400 Errors - Missing Value (code: "missing_value")
export class AttioMissingValueError extends Schema.TaggedError<AttioMissingValueError>()(
	"AttioMissingValueError",
	{
		message: Schema.String,
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

// 400 Errors - Uniqueness Conflict
export class AttioUniquenessConflictError extends Schema.TaggedError<AttioUniquenessConflictError>()(
	"AttioUniquenessConflictError",
	{
		message: Schema.String,
	},
) {}

// 409 Errors
export class AttioConflictError extends Schema.TaggedError<AttioConflictError>()(
	"AttioConflictError",
	{
		message: Schema.String,
		code: Schema.Literals(["slug_conflict", "concurrent_write_conflict"]),
	},
) {}

// 400 Errors - other invalid requests, for example a limit or a merge in
// progress (merge_in_progress can also come with a 404)
export class AttioInvalidRequestError extends Schema.TaggedError<AttioInvalidRequestError>()(
	"AttioInvalidRequestError",
	{
		message: Schema.String,
		code: Schema.Literals([
			"duplicate_values",
			"limit_reached",
			"merge_in_progress",
			"particle_gate_violation",
			"formula_edit_unauthorized",
			"multiple_values_for_single_value_attribute",
			"self_merge",
			"standard_object_disabled",
			"quota_exceeded",
		]),
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
		retryAfter: Schema.DateTimeUtc,
	},
) {}

// 402 Errors - the workspace plan does not include the feature
export class AttioPaymentRequiredError extends Schema.TaggedError<AttioPaymentRequiredError>()(
	"AttioPaymentRequiredError",
	{
		message: Schema.String,
	},
) {}

// 403 Errors - for example a missing scope ("unauthorized") or "billing_error"
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
	| AttioUniquenessConflictError
	| AttioConflictError
	| AttioInvalidRequestError
	| AttioUnauthorizedError
	| AttioRateLimitError
	| AttioPaymentRequiredError
	| AttioForbiddenError
